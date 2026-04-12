import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { DbCourse, DbWeek } from "@/types";
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
      blocks: { id: string }[];
    }[];
  }[];
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
         tasks(blocks(id))
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
  let blocksCompleted = 0;
  let blocksTotal = 0;
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
      // Collect all block IDs in this course
      const allBlockIds = rawWeeks.flatMap((w) =>
        (w.days ?? []).flatMap((d) =>
          (d.tasks ?? []).flatMap((t) => (t.blocks ?? []).map((b) => b.id))
        )
      );
      blocksTotal = allBlockIds.length;

      if (allBlockIds.length > 0) {
        const { data: progress } = await supabase
          .from("progress")
          .select("block_id")
          .eq("user_id", user.id)
          .in("block_id", allBlockIds);

        const completedSet = new Set(
          (progress ?? []).map((p) => p.block_id as string)
        );
        blocksCompleted = completedSet.size;

        // A day is "complete" when all its blocks are done
        completedDayIds = rawWeeks
          .flatMap((w) => w.days ?? [])
          .filter((d) => {
            const dayBlockIds = (d.tasks ?? []).flatMap((t) =>
              (t.blocks ?? []).map((b) => b.id)
            );
            return (
              dayBlockIds.length > 0 &&
              dayBlockIds.every((id) => completedSet.has(id))
            );
          })
          .map((d) => d.id);
      }
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
    />
  );
}
