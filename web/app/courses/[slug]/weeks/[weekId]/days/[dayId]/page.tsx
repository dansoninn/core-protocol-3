import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { DbTask } from "@/types";
import DayClient from "./DayClient";

interface DayRow {
  id: string;
  title: string;
  description: string | null;
  week_id: string;
  order_index: number;
  weeks: {
    id: string;
    title: string;
    courses: {
      id: string;
      title: string;
      slug: string;
      cover_image: string | null;
      category: string;
      instructor: string | null;
    };
  };
}

interface TaskRow {
  id: string;
  day_id: string;
  name: string;
  color: string;
  video_url: string | null;
  order_index: number;
  blocks: {
    id: string;
    task_id: string;
    type: "exercise" | "text";
    order_index: number;
    exercise_id: string | null;
    content: string | null;
    sets: string | null;
    reps: string | null;
    load: string | null;
    exercises: {
      id: string;
      name: string;
      category: string;
      description: string | null;
      video_url: string | null;
    } | null;
  }[];
}

interface WeekForNav {
  id: string;
  order_index: number;
  days: { id: string; title: string; order_index: number }[];
}

type DayNavItem = { id: string; title: string; weekId: string } | null;

export default async function DayPage({
  params,
}: {
  params: { slug: string; weekId: string; dayId: string };
}) {
  const supabase = createClient();

  // ── Fetch day with week → course chain ──────────────────────────────────────
  const { data: dayRaw } = await supabase
    .from("days")
    .select(`
      id, title, description, week_id, order_index,
      weeks (
        id, title,
        courses ( id, title, slug, cover_image, category, instructor )
      )
    `)
    .eq("id", params.dayId)
    .single();

  if (!dayRaw) notFound();
  const dayData = dayRaw as unknown as DayRow;

  if (dayData.week_id !== params.weekId) notFound();
  if (dayData.weeks.courses.slug !== params.slug) notFound();

  // ── Auth ──────────────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/auth/login?next=/courses/${params.slug}/weeks/${params.weekId}/days/${params.dayId}`
    );
  }

  // ── Purchase check ────────────────────────────────────────────────────────
  const { data: purchase } = await supabase
    .from("purchases")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", dayData.weeks.courses.id)
    .maybeSingle();

  if (!purchase) redirect(`/courses/${params.slug}`);

  // ── Cross-week prev/next navigation ──────────────────────────────────────
  const { data: allWeeksRaw } = await supabase
    .from("weeks")
    .select("id, order_index, days(id, title, order_index)")
    .eq("course_id", dayData.weeks.courses.id)
    .order("order_index");

  const allDaysFlat: { id: string; title: string; weekId: string }[] = (
    (allWeeksRaw as unknown as WeekForNav[]) ?? []
  )
    .map((w) => ({
      ...w,
      days: [...(w.days ?? [])].sort((a, b) => a.order_index - b.order_index),
    }))
    .flatMap((w) =>
      w.days.map((d) => ({ id: d.id, title: d.title, weekId: w.id }))
    );

  const currentIdx = allDaysFlat.findIndex((d) => d.id === params.dayId);
  const prevDay: DayNavItem = currentIdx > 0 ? allDaysFlat[currentIdx - 1] : null;
  const nextDay: DayNavItem =
    currentIdx >= 0 && currentIdx < allDaysFlat.length - 1
      ? allDaysFlat[currentIdx + 1]
      : null;

  // ── Tasks with blocks and exercises ───────────────────────────────────────
  const { data: tasksRaw } = await supabase
    .from("tasks")
    .select(`
      *,
      blocks(
        *,
        exercises(id, name, category, description, video_url)
      )
    `)
    .eq("day_id", params.dayId)
    .order("order_index");

  const tasks: DbTask[] = ((tasksRaw as unknown as TaskRow[]) ?? []).map(
    (t) => ({
      ...t,
      blocks: [...(t.blocks ?? [])].sort(
        (a, b) => a.order_index - b.order_index
      ),
    })
  );

  // ── Completed exercise block IDs ───────────────────────────────────────────
  const exerciseBlockIds = tasks.flatMap((t) =>
    t.blocks.filter((b) => b.type === "exercise").map((b) => b.id)
  );

  let completedBlockIds: string[] = [];
  if (exerciseBlockIds.length > 0) {
    const { data: progress } = await supabase
      .from("progress")
      .select("block_id")
      .eq("user_id", user.id)
      .in("block_id", exerciseBlockIds);
    completedBlockIds = (progress ?? []).map((p) => p.block_id as string);
  }

  return (
    <DayClient
      courseSlug={dayData.weeks.courses.slug}
      courseTitle={dayData.weeks.courses.title}
      courseCategory={dayData.weeks.courses.category}
      courseInstructor={dayData.weeks.courses.instructor}
      coverImage={dayData.weeks.courses.cover_image}
      weekTitle={dayData.weeks.title}
      weekId={params.weekId}
      day={{
        id: dayData.id,
        title: dayData.title,
        description: dayData.description,
      }}
      tasks={tasks}
      userId={user.id}
      initialCompletedBlockIds={completedBlockIds}
      prevDay={prevDay}
      nextDay={nextDay}
    />
  );
}
