import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

interface DbCourse {
  id: string;
  title: string;
  slug: string;
  category: string;
  price: number;
  cover_image: string | null;
  instructor: string | null;
}

const categoryColors: Record<string, string> = {
  Styrkur: "bg-blue-100 text-blue-800",
  Þyngdartap: "bg-orange-100 text-orange-800",
  "Liðleiki & hreyfigeta": "bg-green-100 text-green-800",
  "Heilsa & endurnæring": "bg-teal-100 text-teal-800",
  Endurhæfing: "bg-purple-100 text-purple-800",
};

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("courses")
    .select("id, title, slug, category, price, cover_image, instructor")
    .order("created_at", { ascending: false });

  if (error) console.error("[CoursesPage] Supabase error:", error.message);

  const courses = (data as DbCourse[]) ?? [];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-zinc-900">Námskeið</h1>
        <p className="text-zinc-500 mt-1">
          {courses.length > 0
            ? `${courses.length} námskeið í boði`
            : "Engin námskeið í boði eins og er."}
        </p>
      </div>

      {courses.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => {
            const colorClass =
              categoryColors[course.category] ?? "bg-zinc-100 text-zinc-800";

            return (
              <Link
                key={course.id}
                href={`/courses/${course.slug}`}
                className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-zinc-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                {/* Cover image */}
                <div className="relative w-full h-48 bg-zinc-200 overflow-hidden">
                  {course.cover_image ? (
                    // Using <img> because cover images may come from any domain
                    // (Supabase Storage, Unsplash, etc.) — Next.js Image requires
                    // explicit remotePatterns for every host.
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

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-zinc-900 text-lg leading-snug mb-1 group-hover:text-zinc-700 transition-colors">
                    {course.title}
                  </h3>
                  {course.instructor && (
                    <p className="text-sm text-zinc-500 mb-3">
                      {course.instructor}
                    </p>
                  )}
                  <p className="text-zinc-900 font-bold text-base">
                    {course.price.toLocaleString("is-IS")} kr.
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
