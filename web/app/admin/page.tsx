import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AdminClient from "./AdminClient";

export const dynamic = "force-dynamic";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DbCourse {
  id: string;
  title: string;
  slug: string;
  category: string;
  cover_image: string | null;
  created_at: string;
}

interface WeekRow {
  course_id: string;
  days: { id: string }[];
}

interface PurchaseRow {
  user_id: string;
  course_id: string;
}

interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

interface ExerciseRow {
  id: string;
  name: string;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHour = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);
  if (diffMin < 1) return "rétt í þessu";
  if (diffMin < 60) return `fyrir ${diffMin} mín.`;
  if (diffHour < 24) return `fyrir ${diffHour} klst.`;
  if (diffDay < 7) return `fyrir ${diffDay} daga`;
  return new Date(dateStr).toLocaleDateString("is-IS", { day: "numeric", month: "short" });
}

const TAB_TITLES: Record<string, string> = {
  exercises: "Æfingabanki",
  courses: "Námskeið",
  builder: "Course Builder",
  users: "Notendur",
  videos: "Myndbönd",
  settings: "Stillingar",
  analytics: "Greining",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "admin") redirect("/");

  const currentTab = searchParams?.tab ?? null;

  // ── Tab view: skip dashboard data, just render tab content ────────────────
  if (currentTab && currentTab !== "dashboard") {
    return (
      <div style={{ background: "var(--bg)", minHeight: "100vh", padding: "32px 40px" }}>
        <div style={{ marginBottom: 32 }}>
          <h1
            style={{
              fontFamily: "var(--font-bebas)",
              fontSize: 32,
              color: "var(--text)",
              letterSpacing: "0.04em",
              lineHeight: 1,
              marginBottom: 6,
            }}
          >
            {TAB_TITLES[currentTab] ?? currentTab}
          </h1>
        </div>
        <AdminClient initialTab={currentTab} />
      </div>
    );
  }

  // ── Dashboard: fetch all data ──────────────────────────────────────────────

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    { count: totalUsers },
    { count: totalCourses },
    { count: totalExercises },
    { count: totalVideos },
    { count: newUsers30d },
    { data: coursesRaw },
    { data: weeksRaw },
    { data: purchasesRaw },
    { data: recentProfilesRaw },
    { data: recentExercisesRaw },
    { data: activeTodayRaw },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("courses").select("*", { count: "exact", head: true }),
    supabase.from("exercises").select("*", { count: "exact", head: true }),
    supabase.from("exercises").select("*", { count: "exact", head: true }).not("mux_playback_id", "is", null),
    supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
    supabase.from("courses").select("id, title, slug, category, cover_image, created_at").order("created_at", { ascending: false }),
    supabase.from("weeks").select("course_id, days(id)"),
    supabase.from("purchases").select("user_id, course_id"),
    supabase.from("profiles").select("id, email, full_name, created_at").order("created_at", { ascending: false }).limit(5),
    supabase.from("exercises").select("id, name, created_at").order("created_at", { ascending: false }).limit(5),
    supabase.from("progress").select("user_id").gte("completed_at", todayStart.toISOString()),
  ]);

  const activeToday = new Set(
    ((activeTodayRaw ?? []) as { user_id: string }[]).map((r) => r.user_id)
  ).size;

  // ── Course stats ───────────────────────────────────────────────────────────

  const courses = (coursesRaw as DbCourse[]) ?? [];
  const weeks = (weeksRaw as unknown as WeekRow[]) ?? [];
  const purchases = (purchasesRaw as PurchaseRow[]) ?? [];

  const courseDayMap = new Map<string, string[]>();
  for (const week of weeks) {
    const existing = courseDayMap.get(week.course_id) ?? [];
    courseDayMap.set(week.course_id, [...existing, ...(week.days ?? []).map((d) => d.id)]);
  }

  const courseUsersMap = new Map<string, string[]>();
  for (const p of purchases) {
    const existing = courseUsersMap.get(p.course_id) ?? [];
    courseUsersMap.set(p.course_id, [...existing, p.user_id]);
  }

  const courseStats = courses.map((course) => ({
    ...course,
    enrollment: (courseUsersMap.get(course.id) ?? []).length,
    totalDays: (courseDayMap.get(course.id) ?? []).length,
  }));

  const topCourses = [...courseStats].sort((a, b) => b.enrollment - a.enrollment).slice(0, 3);
  const maxEnrollment = Math.max(...courseStats.map((c) => c.enrollment), 1);

  // ── Recent activity feed ───────────────────────────────────────────────────

  const recentProfiles = (recentProfilesRaw as ProfileRow[]) ?? [];
  const recentExercises = (recentExercisesRaw as ExerciseRow[]) ?? [];

  type ActivityItem = { description: string; date: string; dotColor: string };

  const activityItems: ActivityItem[] = [
    ...recentExercises.map((e) => ({
      description: `Ný æfing bætt við: ${e.name}`,
      date: e.created_at,
      dotColor: "var(--accent)",
    })),
    ...recentProfiles.map((p) => ({
      description: `Nýr notandi skráði sig: ${p.email || p.full_name || "Óþekktur"}`,
      date: p.created_at,
      dotColor: "var(--success)",
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  // ── Stats config ───────────────────────────────────────────────────────────

  const statCards = [
    {
      emoji: "👥",
      label: "NOTENDUR",
      value: totalUsers ?? 0,
      change: `+${newUsers30d ?? 0} þessa mánuð`,
      changeColor: "var(--success)",
      iconBg: "rgba(59,107,255,0.18)",
    },
    {
      emoji: "💪",
      label: "ÆFINGAR",
      value: totalExercises ?? 0,
      change: null,
      changeColor: null,
      iconBg: "rgba(255,140,66,0.18)",
    },
    {
      emoji: "📚",
      label: "PRÓGRÖMM",
      value: totalCourses ?? 0,
      change: null,
      changeColor: null,
      iconBg: "rgba(124,58,237,0.18)",
    },
    {
      emoji: "🎬",
      label: "MYNDBÖND",
      value: totalVideos ?? 0,
      change: null,
      changeColor: null,
      iconBg: "rgba(45,212,160,0.18)",
    },
    {
      emoji: "⚡",
      label: "VIRKIR Í DAG",
      value: activeToday,
      change: null,
      changeColor: null,
      iconBg: "rgba(234,179,8,0.18)",
    },
  ];

  const quickActions = [
    { label: "Bæta við æfingu", href: "/admin?tab=exercises", iconBg: "rgba(255,140,66,0.2)" },
    { label: "Bæta við degi", href: "/admin?tab=builder", iconBg: "rgba(59,107,255,0.2)" },
    { label: "Bæta við prógrammi", href: "/admin?tab=courses", iconBg: "rgba(124,58,237,0.2)" },
    { label: "Hlaða upp myndbandi", href: "/admin?tab=videos", iconBg: "rgba(45,212,160,0.2)" },
    { label: "Senda tilkynningu", href: "/admin?tab=settings", iconBg: "rgba(234,179,8,0.2)" },
  ];

  // ── Render dashboard ───────────────────────────────────────────────────────

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", padding: "32px 40px" }}>

      {/* Page header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 32,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "var(--font-bebas)",
              fontSize: 32,
              color: "var(--text)",
              letterSpacing: "0.04em",
              lineHeight: 1,
              marginBottom: 6,
            }}
          >
            YFIRLIT
          </h1>
          <p style={{ fontSize: 14, color: "var(--muted2)" }}>
            Hér færðu yfirsýn yfir helstu tölur og nýjustu virkni.
          </p>
        </div>
        <Link
          href="/admin?tab=builder"
          style={{
            background: "var(--accent)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            padding: "10px 18px",
            borderRadius: 10,
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          + Bæta við efni
        </Link>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 12,
          marginBottom: 32,
        }}
      >
        {statCards.map((stat) => (
          <div
            key={stat.label}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: 20,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: stat.iconBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                marginBottom: 12,
              }}
            >
              {stat.emoji}
            </div>
            <p
              style={{
                fontFamily: "var(--font-bebas)",
                fontSize: 36,
                color: "var(--text)",
                letterSpacing: "0.04em",
                lineHeight: 1,
                marginBottom: 4,
              }}
            >
              {stat.value}
            </p>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--muted2)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: stat.change ? 4 : 0,
              }}
            >
              {stat.label}
            </p>
            {stat.change && (
              <p style={{ fontSize: 11, color: stat.changeColor ?? "var(--success)" }}>
                {stat.change}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Two column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "60fr 40fr", gap: 24 }}>

        {/* ── LEFT column ───────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Recent activity */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                Nýleg virkni
              </p>
            </div>
            {activityItems.length === 0 ? (
              <p
                style={{
                  padding: "32px 20px",
                  textAlign: "center",
                  color: "var(--muted2)",
                  fontSize: 13,
                }}
              >
                Engin virkni skráð
              </p>
            ) : (
              activityItems.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 20px",
                    borderBottom:
                      i < activityItems.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: item.dotColor,
                      flexShrink: 0,
                    }}
                  />
                  <p style={{ flex: 1, fontSize: 13, color: "var(--text)" }}>
                    {item.description}
                  </p>
                  <time
                    style={{
                      fontSize: 11,
                      color: "var(--muted2)",
                      flexShrink: 0,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {timeAgo(item.date)}
                  </time>
                </div>
              ))
            )}
          </div>

          {/* Programs table */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                Prógrömm
              </p>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--surface2)" }}>
                  {["HEITI", "DAGAR", "NOTENDUR", "STAÐA", ""].map((col) => (
                    <th
                      key={col}
                      style={{
                        padding: "10px 16px",
                        textAlign: "left",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "var(--muted2)",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {courseStats.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        padding: "32px 16px",
                        textAlign: "center",
                        color: "var(--muted2)",
                        fontSize: 13,
                      }}
                    >
                      Engin prógrömm enn
                    </td>
                  </tr>
                ) : (
                  courseStats.map((course, i) => (
                    <tr
                      key={course.id}
                      style={{
                        borderBottom:
                          i < courseStats.length - 1 ? "1px solid var(--border)" : "none",
                      }}
                    >
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--text)",
                        }}
                      >
                        {course.title}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: 13,
                          color: "var(--muted2)",
                        }}
                      >
                        {course.totalDays}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--text)",
                        }}
                      >
                        {course.enrollment}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            padding: "3px 8px",
                            borderRadius: 4,
                            background: "var(--success-dim)",
                            color: "var(--success)",
                          }}
                        >
                          Birt
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <Link
                          href="/admin?tab=builder"
                          style={{
                            fontSize: 12,
                            color: "var(--accent)",
                            textDecoration: "none",
                            fontWeight: 500,
                          }}
                        >
                          Breyta
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── RIGHT column ──────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Quick actions */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                Flýtileiðir
              </p>
            </div>
            <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              {quickActions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: "14px 16px",
                    textDecoration: "none",
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: action.iconBg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="var(--text)">
                      <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                    </svg>
                  </div>
                  <span
                    style={{
                      flex: 1,
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--text)",
                    }}
                  >
                    {action.label}
                  </span>
                  <svg
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    style={{ color: "var(--muted2)" }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              ))}
            </div>
          </div>

          {/* Top courses by enrollment */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                Vinsælustu prógrömm
              </p>
            </div>
            <div style={{ padding: "8px 0" }}>
              {topCourses.length === 0 ? (
                <p
                  style={{
                    padding: "32px 16px",
                    textAlign: "center",
                    color: "var(--muted2)",
                    fontSize: 13,
                  }}
                >
                  Engin prógrömm enn
                </p>
              ) : (
                topCourses.map((course, i) => (
                  <div
                    key={course.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 16px",
                      borderBottom: i < topCourses.length - 1 ? "1px solid var(--border)" : "none",
                    }}
                  >
                    {course.cover_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={course.cover_image}
                        alt={course.title}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          objectFit: "cover",
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          background: "var(--surface2)",
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--text)",
                          marginBottom: 6,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {course.title}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div
                          style={{
                            flex: 1,
                            height: 3,
                            background: "var(--surface2)",
                            borderRadius: 999,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${(course.enrollment / maxEnrollment) * 100}%`,
                              background: "var(--accent)",
                              borderRadius: 999,
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--muted2)",
                            flexShrink: 0,
                          }}
                        >
                          {course.enrollment}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
