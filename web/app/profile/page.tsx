import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ProfileSignOut from "./ProfileSignOut";

export const dynamic = "force-dynamic";

interface ProfileRow {
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface PurchaseRow {
  courses: {
    id: string;
    title: string;
    slug: string;
    cover_image: string | null;
    weeks: { days: { tasks: { blocks: { id: string }[] }[] }[] }[];
  };
}

interface ProgressRow {
  block_id: string;
  completed_at: string;
}

export default async function ProfilePage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/profile");

  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, created_at")
    .eq("id", user.id)
    .single();
  const profile = profileRaw as ProfileRow | null;

  const { data: purchaseRaw } = await supabase
    .from("purchases")
    .select(`courses ( id, title, slug, cover_image, weeks ( days ( tasks ( blocks ( id ) ) ) ) )`)
    .eq("user_id", user.id);
  const purchases = (purchaseRaw as unknown as PurchaseRow[]) ?? [];

  const { data: progressRaw } = await supabase
    .from("progress")
    .select("block_id, completed_at")
    .eq("user_id", user.id);
  const progressRows = (progressRaw as ProgressRow[]) ?? [];
  const completedIds = new Set(progressRows.map((p) => p.block_id));

  // Streak
  const uniqueDates = Array.from(
    new Set(
      progressRows
        .filter((p) => p.completed_at)
        .map((p) => new Date(p.completed_at).toISOString().slice(0, 10))
    )
  ).sort((a, b) => b.localeCompare(a));

  let streak = 0;
  if (uniqueDates.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const latest = new Date(uniqueDates[0]);
    latest.setHours(0, 0, 0, 0);
    const gap = Math.round((today.getTime() - latest.getTime()) / 86_400_000);
    if (gap <= 1) {
      let expected = latest;
      for (const ds of uniqueDates) {
        const d = new Date(ds);
        d.setHours(0, 0, 0, 0);
        if (d.getTime() === expected.getTime()) {
          streak++;
          expected = new Date(expected.getTime() - 86_400_000);
        } else break;
      }
    }
  }

  // Stats
  const workoutsCount = uniqueDates.length;

  let completedDaysCount = 0;
  for (const p of purchases) {
    for (const week of p.courses.weeks ?? []) {
      for (const day of week.days) {
        const dayBlockIds = day.tasks.flatMap((t) => t.blocks.map((b) => b.id));
        if (dayBlockIds.length > 0 && dayBlockIds.every((id) => completedIds.has(id))) {
          completedDaysCount++;
        }
      }
    }
  }

  const enrolledCourses = purchases.map((p) => {
    const course = p.courses;
    const allBlockIds = (course.weeks ?? []).flatMap((w) =>
      w.days.flatMap((d) => d.tasks.flatMap((t) => t.blocks.map((b) => b.id)))
    );
    const completedCount = allBlockIds.filter((id) => completedIds.has(id)).length;
    const pct =
      allBlockIds.length > 0
        ? Math.round((completedCount / allBlockIds.length) * 100)
        : 0;
    const totalWeeks = (course.weeks ?? []).length;
    let currentWeek = totalWeeks;
    for (let wi = 0; wi < (course.weeks ?? []).length; wi++) {
      const weekBlockIds = (course.weeks[wi].days ?? []).flatMap((d) =>
        d.tasks.flatMap((t) => t.blocks.map((b) => b.id))
      );
      const allDone = weekBlockIds.length > 0 && weekBlockIds.every((id) => completedIds.has(id));
      if (!allDone) { currentWeek = wi + 1; break; }
    }
    return { ...course, totalBlocks: allBlockIds.length, completedCount, pct, totalWeeks, currentWeek };
  });

  const fullName =
    profile?.full_name?.trim() ||
    ((user.user_metadata?.full_name as string | undefined) ?? "").trim() ||
    null;
  const email = user.email ?? "";
  const initials = fullName
    ? fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("")
    : email.slice(0, 1).toUpperCase() || "?";
  const memberSince = new Date(
    profile?.created_at ?? user.created_at
  ).toLocaleDateString("is-IS", { year: "numeric", month: "long" });

  const stats = [
    { emoji: "🔥", value: streak, label: "STREAK" },
    { emoji: "💪", value: workoutsCount, label: "ÆFINGAR" },
    { emoji: "📅", value: completedDaysCount, label: "DAGAR" },
    { emoji: "⭐", value: purchases.length, label: "NÁMSKEIÐ" },
  ];

  const menuItems = [
    {
      emoji: "⚙️",
      label: "Stillingar",
      href: "/settings",
    },
    {
      emoji: "🔔",
      label: "Tilkynningar",
      href: "/settings",
    },
    {
      emoji: "🔒",
      label: "Lykilorð",
      href: "/settings",
    },
    {
      emoji: "❓",
      label: "Hjálp & stuðningur",
      href: "/settings",
    },
  ];

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "24px 20px 100px" }}>

        {/* 1. Profile Header */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 20,
            padding: "24px 20px",
            marginBottom: 12,
            position: "relative",
          }}
        >
          {/* Settings gear */}
          <Link
            href="/settings"
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              color: "var(--muted2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              textDecoration: "none",
            }}
            title="Stillingar"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>

          {/* Avatar */}
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "linear-gradient(135deg, var(--accent), #7c3aed)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-bebas)",
                fontSize: 32,
                color: "#fff",
                letterSpacing: "0.02em",
                lineHeight: 1,
              }}
            >
              {initials}
            </span>
          </div>

          {/* Name */}
          <h1
            style={{
              fontFamily: "var(--font-bebas)",
              fontSize: 28,
              color: "var(--text)",
              letterSpacing: "0.04em",
              lineHeight: 1,
              marginBottom: 4,
            }}
          >
            {fullName ?? email}
          </h1>
          {fullName && (
            <p style={{ fontSize: 13, color: "var(--muted2)", marginBottom: 4 }}>{email}</p>
          )}
          <p style={{ fontSize: 12, color: "var(--muted)" }}>
            Meðlimur síðan {memberSince}
          </p>
        </div>

        {/* 2. Stats Row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 8,
            marginBottom: 24,
          }}
        >
          {stats.map((s) => (
            <div
              key={s.label}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: "12px 8px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 18, marginBottom: 4, lineHeight: 1 }}>{s.emoji}</div>
              <p
                style={{
                  fontFamily: "var(--font-bebas)",
                  fontSize: 24,
                  color: "var(--text)",
                  letterSpacing: "0.04em",
                  lineHeight: 1,
                  marginBottom: 3,
                }}
              >
                {s.value}
              </p>
              <p
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  color: "var(--muted2)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* 3. Active Courses */}
        <section style={{ marginBottom: 24 }}>
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "var(--muted2)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            MÍN NÁMSKEIÐ
          </p>

          {enrolledCourses.length === 0 ? (
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 16,
                padding: "32px 20px",
                textAlign: "center",
              }}
            >
              <p style={{ fontSize: 13, color: "var(--muted2)", marginBottom: 16 }}>
                Þú ert ekki skráður í nein námskeið
              </p>
              <Link
                href="/courses"
                style={{
                  display: "inline-block",
                  background: "var(--accent)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "10px 20px",
                  borderRadius: 10,
                  textDecoration: "none",
                }}
              >
                Skoða námskeið
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {enrolledCourses.map((course) => (
                <div
                  key={course.id}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 16,
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                  }}
                >
                  {/* Cover image */}
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 10,
                      overflow: "hidden",
                      background: "var(--surface2)",
                      flexShrink: 0,
                    }}
                  >
                    {course.cover_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={course.cover_image}
                        alt={course.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <div style={{ width: "100%", height: "100%", background: "var(--surface3)" }} />
                    )}
                  </div>

                  {/* Course info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--text)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        marginBottom: 3,
                      }}
                    >
                      {course.title}
                    </p>
                    <p style={{ fontSize: 12, color: "var(--muted2)", marginBottom: 8 }}>
                      Vika {course.currentWeek} af {course.totalWeeks}
                    </p>
                    {course.totalBlocks > 0 && (
                      <>
                        <div
                          style={{
                            height: 4,
                            background: "var(--surface2)",
                            borderRadius: 999,
                            overflow: "hidden",
                            marginBottom: 4,
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${course.pct}%`,
                              background: "linear-gradient(90deg, var(--accent), var(--success))",
                              borderRadius: 999,
                            }}
                          />
                        </div>
                        <p style={{ fontSize: 11, color: "var(--muted2)" }}>{course.pct}% lokið</p>
                      </>
                    )}
                  </div>

                  {/* CTA */}
                  <Link
                    href={`/courses/${course.slug}`}
                    style={{
                      flexShrink: 0,
                      color: "var(--accent)",
                      fontSize: 12,
                      fontWeight: 600,
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Halda áfram →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 4. Menu Items */}
        <section style={{ marginBottom: 24 }}>
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "var(--muted2)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            STILLINGAR
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {menuItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  textDecoration: "none",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "var(--surface2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    flexShrink: 0,
                  }}
                >
                  {item.emoji}
                </div>
                <span
                  style={{
                    flex: 1,
                    fontSize: 14,
                    fontWeight: 500,
                    color: "var(--text)",
                  }}
                >
                  {item.label}
                </span>
                <svg
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  style={{ color: "var(--muted)", flexShrink: 0 }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </section>

        {/* 5. Sign Out */}
        <ProfileSignOut />
      </main>
    </div>
  );
}
