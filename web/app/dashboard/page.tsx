import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { COURSES } from "@/lib/data";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/dashboard");
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      {/* Welcome header */}
      <div className="mb-10">
        <p className="text-sm text-zinc-500 mb-1">Stjórnborð</p>
        <h1 className="text-3xl font-extrabold text-zinc-900">
          Velkominn,{" "}
          <span className="text-zinc-600">{user.email}</span>
        </h1>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {[
          { label: "Námskeið í boði", value: COURSES.length },
          { label: "Keypt námskeið", value: "—" },
          { label: "Loknar æfingar", value: "—" },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6"
          >
            <p className="text-sm text-zinc-500 mb-1">{label}</p>
            <p className="text-4xl font-extrabold text-zinc-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Course list */}
      <section>
        <h2 className="text-lg font-bold text-zinc-900 mb-4">
          Skoðaðu námskeið
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {COURSES.map((course) => (
            <Link
              key={course.id}
              href={`/courses/${course.slug}`}
              className="group bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                {course.category}
              </span>
              <h3 className="font-bold text-zinc-900 mt-1 group-hover:text-zinc-600 transition-colors">
                {course.title}
              </h3>
              <p className="text-sm text-zinc-500 mt-0.5">{course.instructor}</p>
              <p className="text-base font-bold text-zinc-900 mt-3">
                {course.price.toLocaleString("is-IS")} kr.
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
