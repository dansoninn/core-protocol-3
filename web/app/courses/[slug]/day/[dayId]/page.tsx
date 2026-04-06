import { notFound } from "next/navigation";
import { getCourseBySlug, getDayById, getExerciseById, COURSES } from "@/lib/data";
import DayClient from "./DayClient";

export function generateStaticParams() {
  const params: { slug: string; dayId: string }[] = [];
  for (const course of COURSES) {
    for (const week of course.weeks) {
      for (const day of week.days) {
        params.push({ slug: course.slug, dayId: day.id });
      }
    }
  }
  return params;
}

export default function DayPage({
  params,
}: {
  params: { slug: string; dayId: string };
}) {
  const course = getCourseBySlug(params.slug);
  if (!course) notFound();

  const result = getDayById(course, params.dayId);
  if (!result) notFound();

  const { day, weekTitle } = result;
  const exercises = (day.exerciseIds ?? [])
    .map(getExerciseById)
    .filter(Boolean) as import("@/types").Exercise[];

  return (
    <DayClient
      course={course}
      day={day}
      weekTitle={weekTitle}
      exercises={exercises}
    />
  );
}
