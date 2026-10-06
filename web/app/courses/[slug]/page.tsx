import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { DbCourse, DbWeek } from "@/types";
import { loadCourseCompletion } from "@/lib/dayAccess";
import { partProgress } from "@/lib/dayLogic";
import CourseClient from "./CourseClient";

// Raw shape returned by the nested select
interface WeekRow {
  id: string;
  title: string;
  order_index: number;
  days: {
    id: string;
    title: string;
    description: string | null;
    order_index: number;
    tasks: {
      id: string;
      blocks: { id: string; type: "exercise" | "text" }[];
    }[];
  }[];
}

interface DayProgressData {
  blocksComplete: number;
  blocksTotal: number;
  tasksComplete: number;
  tasksTotal: number;
}

export default async function CoursePage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = createClient();

  // ── Course ──────────────────────────────────────────────────────────────────
  const { data: courseRaw } = await supabase
    .from("courses")
    .select(
      "id, title, slug, description, category, price, cover_image, instructor"
    )
    .eq("slug", params.slug)
    .single();

  if (!courseRaw) notFound();
  const course = courseRaw as DbCourse;

  // ── Weeks + days (with block count for progress) ─────────────────────────────
  const { data: weeksRaw } = await supabase
    .from("weeks")
    .select(
      `id, title, order_index,
       days(
         id, title, description, order_index,
         tasks(id, blocks(id, type))
       )`
    )
    .eq("course_id", course.id)
    .order("order_index");

  const rawWeeks = (weeksRaw as unknown as WeekRow[]) ?? [];

  // Sort days within each week
  const weeks: DbWeek[] = rawWeeks.map((w) => ({
    ...w,
    days: [...(w.days ?? [])].sort((a, b) => a.order_index - b.order_index),
  }));

  // ── Auth + purchase + progress ─────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let purchased = false;
  let isAdmin = false;
  let blocksCompleted = 0;
  let blocksTotal = 0;
  let completedDayIds: string[] = [];
  const dayProgress: Record<string, DayProgressData> = {};

  if (user) {
    // Role read in parallel with the purchase — no foreign key links the two
    // tables, so it cannot share the query, but it adds no round trip.
    const [{ data: purchase }, { data: profile }] = await Promise.all([
      supabase
        .from("purchases")
        .select("id")
        .eq("user_id", user.id)
        .eq("course_id", course.id)
        .maybeSingle(),
      supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    ]);

    purchased = !!purchase;
    isAdmin = profile?.role === "admin";

    if (purchased) {
      const allDays = rawWeeks.flatMap((w) => w.days ?? []);
      const allBlockIds = allDays.flatMap((d) =>
        (d.tasks ?? []).flatMap((t) => (t.blocks ?? []).map((b) => b.id))
      );
      blocksTotal = allBlockIds.length;

      // Same loader and rule as the server-side day check (lib/dayAccess.ts),
      // so the lock display below can never disagree with it.
      const completion = await loadCourseCompletion(user.id, allDays);
      const { completedBlockIds, completedTaskIds } = completion;
      blocksCompleted = allBlockIds.filter((id) => completedBlockIds.has(id)).length;
      completedDayIds = Array.from(completion.completedDayIds);

      // Per-day progress: the ring and % count exercise blocks; "verkefni"
      // counts every part, done by the shared rule (lib/dayLogic.ts).
      allDays.forEach((d) => {
        const tasks = d.tasks ?? [];
        const exBlocks = tasks.flatMap((t) =>
          (t.blocks ?? []).filter((b) => b.type === "exercise")
        );
        const parts = partProgress(tasks, completedBlockIds, completedTaskIds);
        dayProgress[d.id] = {
          blocksTotal: exBlocks.length,
          blocksComplete: exBlocks.filter((b) => completedBlockIds.has(b.id)).length,
          tasksTotal: parts.total,
          tasksComplete: parts.done,
        };
      });
    }
  }

  return (
    <CourseClient
      course={course}
      weeks={weeks}
      purchased={purchased}
      completedDayIds={completedDayIds}
      blocksCompleted={blocksCompleted}
      blocksTotal={blocksTotal}
      userId={user?.id ?? null}
      dayProgress={dayProgress}
      isAdmin={isAdmin}
    />
  );
}
