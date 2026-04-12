import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { DbTask } from "@/types";
import DayClient from "./DayClient";

interface DayRow {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  weeks: {
    id: string;
    title: string;
    courses: {
      id: string;
      title: string;
      slug: string;
    };
  };
}

interface TaskRow {
  id: string;
  day_id: string;
  name: string;
  color: string;
  order_index: number;
  blocks: {
    id: string;
    task_id: string;
    type: "exercise" | "text";
    order_index: number;
    exercise_id: string | null;
    content: string | null;
    exercises: {
      id: string;
      name: string;
      category: string;
      description: string | null;
      video_url: string | null;
    } | null;
  }[];
}

export default async function DayPage({
  params,
}: {
  params: { slug: string; dayId: string };
}) {
  const supabase = createClient();

  // ── Fetch day with week → course chain ────────────────────────────────────
  const { data: dayRaw } = await supabase
    .from("days")
    .select(`
      id, title, description, order_index,
      weeks (
        id, title,
        courses ( id, title, slug )
      )
    `)
    .eq("id", params.dayId)
    .single();

  if (!dayRaw) notFound();
  const dayData = dayRaw as unknown as DayRow;

  // Guard: slug in URL must match the course this day belongs to
  if (dayData.weeks.courses.slug !== params.slug) notFound();

  // ── Auth ──────────────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?next=/courses/${params.slug}/day/${params.dayId}`);
  }

  // ── Purchase check ────────────────────────────────────────────────────────
  const { data: purchase } = await supabase
    .from("purchases")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", dayData.weeks.courses.id)
    .maybeSingle();

  if (!purchase) {
    redirect(`/courses/${params.slug}`);
  }

  // ── Tasks with blocks and exercises ───────────────────────────────────────
  const { data: tasksRaw } = await supabase
    .from("tasks")
    .select(`
      id, day_id, name, color, order_index,
      blocks(
        id, task_id, type, order_index, exercise_id, content,
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

  // ── Completed block IDs for this day ───────────────────────────────────────
  const allBlockIds = tasks.flatMap((t) => t.blocks.map((b) => b.id));

  let completedBlockIds: string[] = [];
  if (allBlockIds.length > 0) {
    const { data: progress } = await supabase
      .from("progress")
      .select("block_id")
      .eq("user_id", user.id)
      .in("block_id", allBlockIds);

    completedBlockIds = (progress ?? []).map((p) => p.block_id as string);
  }

  return (
    <DayClient
      courseSlug={dayData.weeks.courses.slug}
      courseTitle={dayData.weeks.courses.title}
      weekTitle={dayData.weeks.title}
      day={{
        id: dayData.id,
        title: dayData.title,
        description: dayData.description,
      }}
      tasks={tasks}
      userId={user.id}
      initialCompletedBlockIds={completedBlockIds}
    />
  );
}
