import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { DbTask } from "@/types";
import {
  computeUnlockedDayIds,
  type DayView,
  type StripDay,
} from "@/lib/dayLogic";

// Access checks and data for the day overview and the part pages. Both pages
// call requireDayAccess(), so a direct part URL gets exactly the same checks
// as the day itself.

export interface DayRouteParams {
  slug: string;
  weekId: string;
  dayId: string;
}

interface DayRow {
  id: string;
  title: string;
  description: string | null;
  week_id: string;
  order_index: number;
  weeks: {
    id: string;
    title: string;
    courses: { id: string; title: string; slug: string };
  };
}

interface CourseWeekRow {
  id: string;
  order_index: number;
  days: {
    id: string;
    title: string;
    order_index: number;
    tasks: { id: string; blocks: { id: string; type: "exercise" | "text" }[] }[];
  }[];
}

/**
 * Throws notFound()/redirect() unless the signed-in user may open this day:
 *  1. the day exists and its week and course match the URL   → else 404
 *  2. signed in                                              → else login, back to `returnPath`
 *  3. has purchased the course                               → else course page
 *  4. the day is unlocked (every earlier day complete)       → else course page
 *
 * 1–3 are the checks the old day page made, in the same order. 4 is new: the
 * lock was previously display-only on the course overview, so a direct URL
 * opened any day. It uses the same rule as the overview (computeUnlockedDayIds).
 *
 * Returns the completed exercise block IDs for the whole course, so callers
 * need no second progress query.
 */
export async function requireDayAccess(
  params: DayRouteParams,
  returnPath: string
): Promise<{ view: DayView; completedBlockIds: Set<string> }> {
  const supabase = createClient();

  // 1. Day → week → course chain must match the URL
  const { data: dayRaw } = await supabase
    .from("days")
    .select(`
      id, title, description, week_id, order_index,
      weeks ( id, title, courses ( id, title, slug ) )
    `)
    .eq("id", params.dayId)
    .single();

  if (!dayRaw) notFound();
  const day = dayRaw as unknown as DayRow;
  if (day.week_id !== params.weekId) notFound();
  if (day.weeks.courses.slug !== params.slug) notFound();
  const course = day.weeks.courses;

  // 2. Signed in
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=${returnPath}`);

  // 3. Purchased
  const { data: purchase } = await supabase
    .from("purchases")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", course.id)
    .maybeSingle();
  if (!purchase) redirect(`/courses/${params.slug}`);

  // 4. Unlocked — same completion rule as the course overview page
  const { data: weeksRaw } = await supabase
    .from("weeks")
    .select("id, order_index, days(id, title, order_index, tasks(id, blocks(id, type)))")
    .eq("course_id", course.id)
    .order("order_index");

  const weeks = ((weeksRaw as unknown as CourseWeekRow[]) ?? []).map((w) => ({
    ...w,
    days: [...(w.days ?? [])].sort((a, b) => a.order_index - b.order_index),
  }));
  const orderedDays = weeks.flatMap((w) => w.days.map((d) => ({ ...d, weekId: w.id })));

  const exerciseIdsByDay = new Map(
    orderedDays.map((d) => [
      d.id,
      (d.tasks ?? []).flatMap((t) =>
        (t.blocks ?? []).filter((b) => b.type === "exercise").map((b) => b.id)
      ),
    ])
  );
  const allExerciseIds = Array.from(exerciseIdsByDay.values()).flat();

  let completedBlockIds = new Set<string>();
  if (allExerciseIds.length > 0) {
    const { data: progress } = await supabase
      .from("progress")
      .select("block_id")
      .eq("user_id", user.id)
      .in("block_id", allExerciseIds);
    completedBlockIds = new Set((progress ?? []).map((p) => p.block_id as string));
  }

  // A day is complete when it has exercise blocks and all of them are done
  const completedDayIds = new Set(
    orderedDays
      .filter((d) => {
        const ids = exerciseIdsByDay.get(d.id) ?? [];
        return ids.length > 0 && ids.every((id) => completedBlockIds.has(id));
      })
      .map((d) => d.id)
  );
  const unlocked = computeUnlockedDayIds(
    orderedDays.map((d) => d.id),
    completedDayIds
  );
  if (!unlocked.has(params.dayId)) redirect(`/courses/${params.slug}`);

  // ── Navigation ──────────────────────────────────────────────────────────────
  const hrefFor = (weekId: string, dayId: string) =>
    `/courses/${params.slug}/weeks/${weekId}/days/${dayId}`;

  const idx = orderedDays.findIndex((d) => d.id === params.dayId);
  const prev = idx > 0 ? orderedDays[idx - 1] : null;
  const next = idx >= 0 && idx < orderedDays.length - 1 ? orderedDays[idx + 1] : null;

  const weekIdx = weeks.findIndex((w) => w.id === params.weekId);
  const weekDays: StripDay[] = (weeks[weekIdx]?.days ?? []).map((d) => ({
    id: d.id,
    order_index: d.order_index,
    href: unlocked.has(d.id) ? hrefFor(params.weekId, d.id) : null,
    state:
      d.id === params.dayId
        ? "current"
        : !unlocked.has(d.id)
          ? "locked"
          : completedDayIds.has(d.id)
            ? "done"
            : "open",
  }));

  return {
    completedBlockIds,
    view: {
      userId: user.id,
      course: { id: course.id, title: course.title, slug: course.slug },
      week: {
        id: day.weeks.id,
        title: day.weeks.title,
        number: weekIdx + 1,
        total: weeks.length,
      },
      day: {
        id: day.id,
        title: day.title,
        description: day.description,
        order_index: day.order_index,
      },
      dayHref: hrefFor(params.weekId, params.dayId),
      weekDays,
      prevDay: prev ? { href: hrefFor(prev.weekId, prev.id), title: prev.title } : null,
      nextDay: next
        ? { href: hrefFor(next.weekId, next.id), title: next.title, locked: !unlocked.has(next.id) }
        : null,
    },
  };
}

/** The day's parts with their blocks (sorted) and each block's exercise. */
export async function loadDayParts(dayId: string): Promise<DbTask[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("tasks")
    .select(`
      *,
      blocks(
        *,
        exercises(id, name, category, description, video_url, mux_playback_id)
      )
    `)
    .eq("day_id", dayId)
    .order("order_index");

  return ((data as unknown as DbTask[]) ?? []).map((t) => ({
    ...t,
    blocks: [...(t.blocks ?? [])].sort((a, b) => a.order_index - b.order_index),
  }));
}
