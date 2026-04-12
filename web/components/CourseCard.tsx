import Link from "next/link";
import type { DbCourse } from "@/types";

interface Props {
  course: DbCourse;
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
    categoryColors[course.category] ?? "bg-zinc-100 text-zinc-800";

  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-zinc-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      {/* Cover image — using <img> because covers can come from any domain */}
      <div className="relative w-full h-48 bg-zinc-200 overflow-hidden">
        {course.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.cover_image}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-zinc-800" />
        )}
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
        {course.instructor && (
          <p className="text-sm text-zinc-500 mb-3">{course.instructor}</p>
        )}
        <p className="text-zinc-900 font-bold text-base">
          {course.price.toLocaleString("is-IS")} kr.
        </p>
      </div>
    </Link>
  );
}
