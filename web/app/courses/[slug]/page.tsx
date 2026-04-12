import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { DbCourse, DbWeek } from "@/types";
import CourseClient from "./CourseClient";

// Raw shape returned by the Supabase nested select
interface WeekRow {
  id: string;
  title: string;
  order_index: number;
  days: {
    id: string;
    title: string;
    video_url: string | null;
    workout_text: string | null;
    is_free_preview: boolean;
    order_index: number;
  }[];
}

export default async function CoursePage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = createClient();

  // ── Course ────────────────────────────────────────────────────────────────
  const { data: courseRaw } = await supabase
    .from("courses")
    .select(
      "id, title, slug, description, category, price, cover_image, instructor"
    )
    .eq("slug", params.slug)
    .single();

  if (!courseRaw) notFound();
  const course = courseRaw as DbCourse;

  // ── Weeks + days ──────────────────────────────────────────────────────────
  const { data: weeksRaw } = await supabase
    .from("weeks")
    .select(
      "id, title, order_index, days(id, title, video_url, workout_text, is_free_preview, order_index)"
    )
    .eq("course_id", course.id)
    .order("order_index");

  const weeks: DbWeek[] = (
    (weeksRaw as unknown as WeekRow[]) ?? []
  ).map((w) => ({
    ...w,
    days: [...(w.days ?? [])].sort((a, b) => a.order_index - b.order_index),
  }));

  // ── Auth + purchase + progress ────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let purchased = false;
  let completedDayIds: string[] = [];

  if (user) {
    const { data: purchase } = await supabase
      .from("purchases")
      .select("id")
      .eq("user_id", user.id)
      .eq("course_id", course.id)
      .maybeSingle();

    purchased = !!purchase;

    if (purchased) {
      const { data: progress } = await supabase
        .from("progress")
        .select("day_id")
        .eq("user_id", user.id)
        .eq("completed", true);

      completedDayIds = (progress ?? []).map((p) => p.day_id as string);
    }
  }

  return (
    <CourseClient
      course={course}
      weeks={weeks}
      purchased={purchased}
      completedDayIds={completedDayIds}
      userId={user?.id ?? null}
    />
  );
}
