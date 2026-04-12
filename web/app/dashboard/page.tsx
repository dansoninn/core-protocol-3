import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DbCourse {
  id: string;
  title: string;
  slug: string;
  category: string;
  price: number;
  cover_image: string | null;
  instructor: string | null;
}

interface PurchaseRow {
  course_id: string;
  courses: DbCourse & {
    weeks: { days: { tasks: { blocks: { id: string }[] }[] }[] }[];
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?next=/dashboard");

  // Fetch full_name from profiles
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const displayName = profileRow?.full_name?.trim() || user.email || "";

  // Fetch purchases with nested course → weeks → days → tasks → blocks for completion tracking
  const { data: purchaseRows } = await supabase
    .from("purchases")
    .select(
      `course_id,
       courses (
         id, title, slug, category, price, cover_image, instructor,
         weeks ( days ( tasks ( blocks ( id ) ) ) )
       )`
    )
    .eq("user_id", user.id);

  const purchases = (purchaseRows as unknown as PurchaseRow[]) ?? [];

  // Collect all block IDs across purchased courses
  const allBlockIds = purchases.flatMap((p) =>
    (p.courses.weeks ?? []).flatMap((w) =>
      w.days.flatMap((d) =>
        d.tasks.flatMap((t) => t.blocks.map((b) => b.id))
      )
    )
  );

  // Fetch completed blocks for this user
  const completedIds = new Set<string>();
  if (allBlockIds.length > 0) {
    const { data: progressRows } = await supabase
      .from("progress")
      .select("block_id")
      .eq("user_id", user.id)
      .in("block_id", allBlockIds);
    (progressRows ?? []).forEach((p) => completedIds.add(p.block_id as string));
  }

  // Attach completion numbers to each purchased course
  const purchasedCourses = purchases.map((p) => {
    const course = p.courses;
    const courseBlockIds = (course.weeks ?? []).flatMap((w) =>
      w.days.flatMap((d) =>
        d.tasks.flatMap((t) => t.blocks.map((b) => b.id))
      )
    );
    const completedCount = courseBlockIds.filter((id) => completedIds.has(id)).length;
    const pct =
      courseBlockIds.length > 0
        ? Math.round((completedCount / courseBlockIds.length) * 100)
        : 0;
    return { ...course, totalDays: courseBlockIds.length, completedCount, pct };
  });

  // If no purchases, show the full course catalogue
  let browseCourses: DbCourse[] = [];
  if (purchases.length === 0) {
    const { data } = await supabase
      .from("courses")
      .select("id, title, slug, category, price, cover_image, instructor")
      .order("created_at", { ascending: false });
    browseCourses = (data as DbCourse[]) ?? [];
  }

  const totalCompleted = purchasedCourses.reduce(
    (sum, c) => sum + c.completedCount,
    0
  );
  const avgPct =
    purchasedCourses.length > 0
      ? Math.round(
          purchasedCourses.reduce((sum, c) => sum + c.pct, 0) /
            purchasedCourses.length
        )
      : null;

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="mb-10">
        <p className="text-sm text-zinc-500 mb-1">Stjórnborð</p>
        <h1 className="text-3xl font-extrabold text-zinc-900">
          Velkominn,{" "}
          <span className="text-zinc-600">{displayName}</span>
        </h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {[
          { label: "Keypt námskeið", value: purchases.length },
          { label: "Loknar æfingar", value: totalCompleted },
          {
            label: "Meðalframvinda",
            value: avgPct !== null ? `${avgPct}%` : "—",
          },
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

      {purchasedCourses.length > 0 ? (
        /* ── Purchased courses with progress bars ── */
        <section>
          <h2 className="text-lg font-bold text-zinc-900 mb-4">Mín námskeið</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {purchasedCourses.map((course) => (
              <Link
                key={course.id}
                href={`/courses/${course.slug}`}
                className="group bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                  {course.category}
                </span>
                <h3 className="font-bold text-zinc-900 mt-1 mb-0.5 group-hover:text-zinc-600 transition-colors">
                  {course.title}
                </h3>
                {course.instructor && (
                  <p className="text-sm text-zinc-500">{course.instructor}</p>
                )}

                {course.totalDays > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
                      <span>Framvinda</span>
                      <span>
                        {course.completedCount}/{course.totalDays} ·{" "}
                        {course.pct}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-zinc-900 rounded-full transition-all"
                        style={{ width: `${course.pct}%` }}
                      />
                    </div>
                  </div>
                )}
              </Link>
            ))}
          </div>
        </section>
      ) : (
        /* ── No purchases — show catalogue ── */
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-zinc-900">
              Skoðaðu námskeið
            </h2>
            <Link
              href="/courses"
              className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              Sjá öll →
            </Link>
          </div>

          {browseCourses.length === 0 ? (
            <p className="text-zinc-500 text-sm">Engin námskeið í boði eins og er.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {browseCourses.map((course) => (
                <Link
                  key={course.id}
                  href={`/courses/${course.slug}`}
                  className="group bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                    {course.category}
                  </span>
                  <h3 className="font-bold text-zinc-900 mt-1 mb-0.5 group-hover:text-zinc-600 transition-colors">
                    {course.title}
                  </h3>
                  {course.instructor && (
                    <p className="text-sm text-zinc-500">{course.instructor}</p>
                  )}
                  <p className="text-base font-bold text-zinc-900 mt-3">
                    {course.price.toLocaleString("is-IS")} kr.
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
