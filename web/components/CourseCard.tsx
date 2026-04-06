import Link from "next/link";
import Image from "next/image";
import type { Course } from "@/types";

interface Props {
  course: Course;
}

const categoryColors: Record<string, string> = {
  Styrkur: "bg-blue-100 text-blue-800",
  Þyngdartap: "bg-orange-100 text-orange-800",
  "Liðleiki & hreyfigeta": "bg-green-100 text-green-800",
  "Heilsa & endurnæring": "bg-teal-100 text-teal-800",
  Endurhæfing: "bg-purple-100 text-purple-800",
};

export default function CourseCard({ course }: Props) {
  const colorClass =
    categoryColors[course.category] || "bg-zinc-100 text-zinc-800";

  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-zinc-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="relative w-full h-48 bg-zinc-200 overflow-hidden">
        <Image
          src={course.coverImage}
          alt={course.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <span
          className={`absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full ${colorClass}`}
        >
          {course.category}
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-zinc-900 text-lg leading-snug mb-1 group-hover:text-zinc-700 transition-colors">
          {course.title}
        </h3>
        <p className="text-sm text-zinc-500 mb-3">{course.instructor}</p>
        <p className="text-zinc-900 font-bold text-base">
          {course.price.toLocaleString("is-IS")} kr.
        </p>
      </div>
    </Link>
  );
}
