import { notFound } from "next/navigation";
import { getCourseBySlug, COURSES } from "@/lib/data";
import CourseClient from "./CourseClient";

export function generateStaticParams() {
  return COURSES.map((c) => ({ slug: c.slug }));
}

export default function CoursePage({ params }: { params: { slug: string } }) {
  const course = getCourseBySlug(params.slug);
  if (!course) notFound();
  return <CourseClient course={course} />;
}
