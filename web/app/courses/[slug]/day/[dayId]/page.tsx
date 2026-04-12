import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { DbExercise } from "@/types";
import DayClient from "./DayClient";

// Raw shape returned by the nested Supabase select
interface DayRow {
  id: string;
  title: string;
  video_url: string | null;
  workout_text: string | null;
  is_free_preview: boolean;
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

interface DayExerciseRow {
  exercises: DbExercise | null;
}

export default async function DayPage({
  params,
}: {
  params: { slug: string; dayId: string };
}) {
  const supabase = createClient();

  // ── Fetch day with its week → course chain ────────────────────────────────
  const { data: dayRaw } = await supabase
    .from("days")
    .select(`
      id, title, video_url, workout_text, is_free_preview, order_index,
      weeks (
        id, title,
        courses ( id, title, slug )
      )
    `)
    .eq("id", params.dayId)
    .single();

  if (!dayRaw) notFound();
  const dayData = dayRaw as unknown as DayRow;

  // Guard: the slug in the URL must match the course this day belongs to
  if (dayData.weeks.courses.slug !== params.slug) notFound();

  // ── Exercises for this day ────────────────────────────────────────────────
  const { data: deRaw } = await supabase
    .from("day_exercises")
    .select("exercises(id, name, category, description, video_url)")
    .eq("day_id", params.dayId);

  const exercises: DbExercise[] = (
    (deRaw as unknown as DayExerciseRow[]) ?? []
  )
    .map((r) => r.exercises)
    .filter((e): e is DbExercise => e !== null);

  // ── Access control ────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isFree = dayData.is_free_preview;

  // Unauthenticated visitors may only see free-preview days
  if (!isFree && !user) {
    redirect(
      `/auth/login?next=/courses/${params.slug}/day/${params.dayId}`
    );
  }

  let purchased = false;
  let initialCompleted = false;

  if (user) {
    const { data: purchase } = await supabase
      .from("purchases")
      .select("id")
      .eq("user_id", user.id)
      .eq("course_id", dayData.weeks.courses.id)
      .maybeSingle();

    purchased = !!purchase;

    // Paid day with no purchase → bounce to course page
    if (!isFree && !purchased) {
      redirect(`/courses/${params.slug}`);
    }

    // Fetch completion state for the mark-complete button
    if (isFree || purchased) {
      const { data: progress } = await supabase
        .from("progress")
        .select("completed")
        .eq("user_id", user.id)
        .eq("day_id", params.dayId)
        .maybeSingle();

      initialCompleted = progress?.completed ?? false;
    }
  }

  return (
    <DayClient
      courseSlug={dayData.weeks.courses.slug}
      courseTitle={dayData.weeks.courses.title}
      weekTitle={dayData.weeks.title}
      day={{
        id: dayData.id,
        title: dayData.title,
        video_url: dayData.video_url,
        workout_text: dayData.workout_text,
        is_free_preview: dayData.is_free_preview,
      }}
      exercises={exercises}
      userId={user?.id ?? null}
      initialCompleted={initialCompleted}
    />
  );
}
