import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminClient from "./AdminClient";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DbCourse {
  id: string;
  title: string;
  slug: string;
  category: string;
}

interface WeekRow {
  course_id: string;
  days: { id: string }[];
}

interface PurchaseRow {
  user_id: string;
  course_id: string;
}

interface ProgressRow {
  user_id: string;
  day_id: string;
}

interface ProfileRow {
  id: string;
  email: string;
  created_at: string;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminPage() {
  const supabase = createClient();

  // Auth + role guard (middleware already blocks non-admins, but double-check
  // server-side so there's no flash on a cold load).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?next=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") redirect("/");

  // ── KPI counts (parallel) ─────────────────────────────────────────────────

  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  const [
    { count: totalUsers },
    { count: totalCourses },
    { count: totalPurchases },
    { count: newUsers30d },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("courses").select("*", { count: "exact", head: true }),
    supabase.from("purchases").select("*", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", thirtyDaysAgo),
  ]);

  // ── Per-course enrollment + avg completion ────────────────────────────────

  const [
    { data: coursesRaw },
    { data: weeksRaw },
    { data: purchasesRaw },
    { data: progressRaw },
  ] = await Promise.all([
    supabase.from("courses").select("id, title, slug, category").order("created_at"),
    supabase.from("weeks").select("course_id, days(id)"),
    supabase.from("purchases").select("user_id, course_id"),
    supabase.from("progress").select("user_id, day_id").eq("completed", true),
  ]);

  const courses = (coursesRaw as DbCourse[]) ?? [];
  const weeks = (weeksRaw as unknown as WeekRow[]) ?? [];
  const purchases = (purchasesRaw as PurchaseRow[]) ?? [];
  const progress = (progressRaw as ProgressRow[]) ?? [];

  // course_id → all day IDs in that course
  const courseDayMap = new Map<string, string[]>();
  for (const week of weeks) {
    const existing = courseDayMap.get(week.course_id) ?? [];
    courseDayMap.set(week.course_id, [
      ...existing,
      ...(week.days ?? []).map((d) => d.id),
    ]);
  }

  // user_id → Set of completed day IDs
  const userProgressMap = new Map<string, Set<string>>();
  for (const p of progress) {
    const s = userProgressMap.get(p.user_id) ?? new Set<string>();
    s.add(p.day_id);
    userProgressMap.set(p.user_id, s);
  }

  // course_id → list of enrolled user IDs
  const courseUsersMap = new Map<string, string[]>();
  for (const p of purchases) {
    const existing = courseUsersMap.get(p.course_id) ?? [];
    courseUsersMap.set(p.course_id, [...existing, p.user_id]);
  }

  const courseStats = courses.map((course) => {
    const dayIds = courseDayMap.get(course.id) ?? [];
    const enrolledUsers = courseUsersMap.get(course.id) ?? [];
    const enrollment = enrolledUsers.length;

    let avgCompletion = 0;
    if (enrollment > 0 && dayIds.length > 0) {
      const totalPct = enrolledUsers.reduce((sum, userId) => {
        const completed = userProgressMap.get(userId) ?? new Set<string>();
        const count = dayIds.filter((id) => completed.has(id)).length;
        return sum + count / dayIds.length;
      }, 0);
      avgCompletion = Math.round((totalPct / enrollment) * 100);
    }

    return { ...course, enrollment, avgCompletion, totalDays: dayIds.length };
  });

  // ── Recent users with purchased course titles ─────────────────────────────

  const { data: recentProfilesRaw } = await supabase
    .from("profiles")
    .select("id, email, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  const recentProfiles = (recentProfilesRaw as ProfileRow[]) ?? [];
  const recentIds = recentProfiles.map((p) => p.id);

  // Purchases for those users — purchases.user_id references auth.users,
  // so we query purchases directly instead of through a nested profile select.
  const { data: recentPurchasesRaw } = recentIds.length
    ? await supabase
        .from("purchases")
        .select("user_id, courses(title)")
        .in("user_id", recentIds)
    : { data: [] };

  // Group course titles by user_id
  const userCoursesMap = new Map<string, string[]>();
  for (const row of (recentPurchasesRaw as unknown as { user_id: string; courses: { title: string } | null }[]) ?? []) {
    const existing = userCoursesMap.get(row.user_id) ?? [];
    if (row.courses?.title) {
      userCoursesMap.set(row.user_id, [...existing, row.courses.title]);
    }
  }

  const recentUsers = recentProfiles.map((p) => ({
    ...p,
    courseTitles: userCoursesMap.get(p.id) ?? [],
  }));

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── KPI Dashboard (light theme, server-rendered) ─────────────────── */}
      <div className="bg-zinc-50 border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-10">

          {/* KPI cards */}
          <section>
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4">
              Yfirlit
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Users", value: totalUsers ?? 0 },
                { label: "Courses", value: totalCourses ?? 0 },
                { label: "Purchases", value: totalPurchases ?? 0 },
                { label: "New Users (30d)", value: newUsers30d ?? 0 },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6"
                >
                  <p className="text-xs font-medium text-zinc-500 mb-1">{label}</p>
                  <p className="text-4xl font-extrabold text-zinc-900 tabular-nums">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Courses table */}
          <section>
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4">
              Námskeið
            </h2>
            <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
              {courseStats.length === 0 ? (
                <p className="text-zinc-400 text-sm px-6 py-10 text-center">
                  No courses yet. Add them in the admin panel below.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                        Course
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide hidden sm:table-cell">
                        Category
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                        Enrolled
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide hidden md:table-cell">
                        Days
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                        Avg&nbsp;completion
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {courseStats.map((course) => (
                      <tr
                        key={course.id}
                        className="hover:bg-zinc-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <p className="font-semibold text-zinc-900">
                            {course.title}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-zinc-500 hidden sm:table-cell">
                          {course.category}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-zinc-800 tabular-nums">
                          {course.enrollment}
                        </td>
                        <td className="px-6 py-4 text-right text-zinc-500 tabular-nums hidden md:table-cell">
                          {course.totalDays}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {course.enrollment > 0 ? (
                            <div className="flex items-center justify-end gap-3">
                              <div className="w-20 h-1.5 bg-zinc-100 rounded-full overflow-hidden hidden sm:block">
                                <div
                                  className="h-full bg-zinc-900 rounded-full"
                                  style={{ width: `${course.avgCompletion}%` }}
                                />
                              </div>
                              <span className="text-sm font-semibold text-zinc-700 tabular-nums">
                                {course.avgCompletion}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-zinc-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* Recent users */}
          <section>
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4">
              Nýlegir notendur
            </h2>
            <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
              {recentUsers.length === 0 ? (
                <p className="text-zinc-400 text-sm px-6 py-10 text-center">
                  No users yet.
                </p>
              ) : (
                <ul className="divide-y divide-zinc-50">
                  {recentUsers.map((u) => (
                    <li
                      key={u.id}
                      className="px-6 py-4 flex items-start justify-between gap-4 hover:bg-zinc-50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 truncate">
                          {u.email}
                        </p>
                        {u.courseTitles.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {u.courseTitles.map((title) => (
                              <span
                                key={title}
                                className="text-xs font-medium bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full"
                              >
                                {title}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-400 mt-0.5">
                            No purchases
                          </p>
                        )}
                      </div>
                      <time className="text-xs text-zinc-400 shrink-0 pt-0.5">
                        {new Date(u.created_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* ── Management Panel (dark, client) ───────────────────────────────── */}
      <AdminClient />
    </>
  );
}
