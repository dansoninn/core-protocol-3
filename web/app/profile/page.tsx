import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

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
    return { ...course, totalBlocks: allBlockIds.length, completedCount, pct };
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

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <main
        style={{ maxWidth: 640, margin: "0 auto", padding: "28px 16px 80px" }}
        className="sm:px-6 space-y-4"
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={fullName ?? email}
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: "50%",
                  objectFit: "cover",
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: "50%",
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  fontWeight: 700,
                  color: "var(--text)",
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>
            )}
            <div>
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
                <p style={{ fontSize: 12, color: "var(--muted2)" }}>{email}</p>
              )}
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                Meðlimur síðan {memberSince}
              </p>
            </div>
          </div>

          <Link
            href="/settings"
            style={{ color: "var(--muted2)", marginTop: 4, textDecoration: "none" }}
            title="Stillingar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
        </div>

        {/* Streak */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>🔥</span>
          <div>
            <p
              style={{
                fontFamily: "var(--font-bebas)",
                fontSize: 24,
                color: "var(--text)",
                letterSpacing: "0.04em",
                lineHeight: 1,
              }}
            >
              {streak} {streak === 1 ? "DAGUR" : "DAGAR"} Í RÖÐ
            </p>
            <p style={{ fontSize: 12, color: "var(--muted2)", marginTop: 3 }}>
              {streak === 0
                ? "Ljúktu við æfingu í dag til að byrja strák!"
                : "Streak í gangi — hald áfram!"}
            </p>
          </div>
        </div>

        {/* Enrolled courses */}
        <section style={{ paddingTop: 8 }}>
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
            Mín námskeið
          </p>

          {enrolledCourses.length === 0 ? (
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 14,
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
                    borderRadius: 14,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "14px 16px",
                    }}
                  >
                    <div
                      style={{
                        width: 56,
                        height: 40,
                        borderRadius: 8,
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
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--text)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          marginBottom: 4,
                        }}
                      >
                        {course.title}
                      </p>
                      {course.totalBlocks > 0 && (
                        <>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: 5,
                            }}
                          >
                            <span style={{ fontSize: 11, color: "var(--muted2)" }}>Framvinda</span>
                            <span style={{ fontSize: 11, color: "var(--muted2)" }}>
                              {course.completedCount}/{course.totalBlocks} · {course.pct}%
                            </span>
                          </div>
                          <div
                            style={{
                              height: 3,
                              background: "var(--surface2)",
                              borderRadius: 999,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                width: `${course.pct}%`,
                                background: "var(--accent)",
                                borderRadius: 999,
                              }}
                            />
                          </div>
                        </>
                      )}
                    </div>
                    <Link
                      href={`/courses/${course.slug}`}
                      style={{
                        flexShrink: 0,
                        background: "var(--surface2)",
                        border: "1px solid var(--border)",
                        color: "var(--text)",
                        fontSize: 12,
                        fontWeight: 600,
                        padding: "8px 14px",
                        borderRadius: 8,
                        textDecoration: "none",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Halda áfram
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
