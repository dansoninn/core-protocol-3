import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BlockRow { id: string; type: string; }
interface TaskRow { id: string; name: string; order_index: number; blocks: BlockRow[]; }
interface DayRow {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  tasks: TaskRow[];
}
interface WeekRow { id: string; title: string; order_index: number; days: DayRow[]; }
interface CourseRow {
  id: string; title: string; slug: string;
  category: string; cover_image: string | null; instructor: string | null;
  weeks: WeekRow[];
}
interface PurchaseRow { courses: CourseRow; }
interface ProgressRow { block_id: string; completed_at: string; }

const DAY_ABBREVS = ["MÁN", "ÞRI", "MIÐ", "FIM", "FÖS", "LAU", "SUN"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function islandicDate(date: Date): string {
  return date.toLocaleDateString("is-IS", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).replace(/^\w/, (c) => c.toUpperCase());
}

function computeStreak(completedDates: Set<string>): number {
  const sorted = Array.from(completedDates).sort((a, b) => b.localeCompare(a));
  if (sorted.length === 0) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const latest = new Date(sorted[0]);
  latest.setHours(0, 0, 0, 0);
  const gap = Math.round((today.getTime() - latest.getTime()) / 86_400_000);
  if (gap > 1) return 0;
  let streak = 0;
  let expected = latest;
  for (const ds of sorted) {
    const d = new Date(ds);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === expected.getTime()) {
      streak++;
      expected = new Date(expected.getTime() - 86_400_000);
    } else break;
  }
  return streak;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/dashboard");

  // Profile
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();
  const displayName =
    profileRow?.full_name?.trim()?.split(" ")[0] || user.email || "";

  // Purchases with full course structure
  const { data: purchaseRows } = await supabase
    .from("purchases")
    .select(`
      courses (
        id, title, slug, category, cover_image, instructor,
        weeks (
          id, title, order_index,
          days (
            id, title, description, order_index,
            tasks (
              id, name, order_index,
              blocks ( id, type )
            )
          )
        )
      )
    `)
    .eq("user_id", user.id);

  const purchases = (purchaseRows as unknown as PurchaseRow[]) ?? [];

  // Progress
  const { data: progressRaw } = await supabase
    .from("progress")
    .select("block_id, completed_at")
    .eq("user_id", user.id);
  const progressRows = (progressRaw as ProgressRow[]) ?? [];

  const completedIds = new Set<string>();
  const completedDates = new Set<string>();
  for (const p of progressRows) {
    completedIds.add(p.block_id);
    if (p.completed_at) {
      completedDates.add(new Date(p.completed_at).toISOString().slice(0, 10));
    }
  }

  // ── Streak ────────────────────────────────────────────────────────────────
  const streak = computeStreak(completedDates);

  // ── Calendar week dots (Mon–Sun) ──────────────────────────────────────────
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const dow = today.getDay();
  const daysFromMon = dow === 0 ? 6 : dow - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysFromMon);
  monday.setHours(0, 0, 0, 0);

  const calWeekDots = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const ds = d.toISOString().slice(0, 10);
    return {
      label: DAY_ABBREVS[i],
      isToday: ds === todayStr,
      isDone: completedDates.has(ds) && ds <= todayStr,
      isFuture: ds > todayStr,
    };
  });

  // ── Per-course enrichment ─────────────────────────────────────────────────
  type EnrichedCourse = CourseRow & {
    allBlockIds: string[];
    completedCount: number;
    pct: number;
    currentWeekNum: number;
    totalWeeks: number;
    allSortedDays: (DayRow & { weekId: string; weekNum: number })[];
  };

  const enrichedCourses: EnrichedCourse[] = purchases.map((p) => {
    const course = p.courses;
    const sortedWeeks = [...(course.weeks ?? [])].sort(
      (a, b) => a.order_index - b.order_index
    );

    const allSortedDays = sortedWeeks.flatMap((w) =>
      [...(w.days ?? [])]
        .sort((a, b) => a.order_index - b.order_index)
        .map((d) => ({
          ...d,
          tasks: [...(d.tasks ?? [])].sort(
            (a, b) => a.order_index - b.order_index
          ),
          weekId: w.id,
          weekNum: w.order_index + 1,
        }))
    );

    const allBlockIds = allSortedDays.flatMap((d) =>
      d.tasks.flatMap((t) => t.blocks.map((b) => b.id))
    );

    const completedCount = allBlockIds.filter((id) => completedIds.has(id)).length;
    const pct =
      allBlockIds.length > 0
        ? Math.round((completedCount / allBlockIds.length) * 100)
        : 0;

    // Find current (first incomplete) day
    const isDayDone = (d: DayRow): boolean => {
      const exBlocks = d.tasks.flatMap((t) =>
        t.blocks.filter((b) => b.type === "exercise")
      );
      if (exBlocks.length === 0) return true;
      return exBlocks.every((b) => completedIds.has(b.id));
    };

    const firstIncompleteDay = allSortedDays.find((d) => !isDayDone(d));
    const currentWeekNum = firstIncompleteDay?.weekNum ?? sortedWeeks.length;
    const totalWeeks = sortedWeeks.length;

    return {
      ...course,
      weeks: sortedWeeks,
      allBlockIds,
      completedCount,
      pct,
      currentWeekNum,
      totalWeeks,
      allSortedDays,
    };
  });

  // Primary active course (first enrolled)
  const activeCourse = enrichedCourses[0] ?? null;

  // ── Today / current day for active course ─────────────────────────────────
  const isDayDone = (d: DayRow): boolean => {
    const exBlocks = d.tasks.flatMap((t) =>
      t.blocks.filter((b) => b.type === "exercise")
    );
    if (exBlocks.length === 0) return true;
    return exBlocks.every((b) => completedIds.has(b.id));
  };

  const currentDay = activeCourse
    ? activeCourse.allSortedDays.find((d) => !isDayDone(d)) ??
      activeCourse.allSortedDays[activeCourse.allSortedDays.length - 1] ??
      null
    : null;

  const currentDayIdx = currentDay
    ? activeCourse!.allSortedDays.findIndex((d) => d.id === currentDay.id)
    : -1;

  const tomorrowDay =
    currentDayIdx >= 0 &&
    currentDayIdx < activeCourse!.allSortedDays.length - 1
      ? activeCourse!.allSortedDays[currentDayIdx + 1]
      : null;

  // Exercise counts for today card
  const todayExBlocks = currentDay
    ? currentDay.tasks.flatMap((t) =>
        t.blocks.filter((b) => b.type === "exercise")
      )
    : [];
  const todayExTotal = todayExBlocks.length;
  const todayExDone = todayExBlocks.filter((b) =>
    completedIds.has(b.id)
  ).length;
  const todayProgressPct =
    todayExTotal > 0 ? (todayExDone / todayExTotal) * 100 : 0;
  const todayEstMin = Math.round(todayExTotal * 3);

  const firstIncompleteTask = currentDay?.tasks.find((t) => {
    const ex = t.blocks.filter((b) => b.type === "exercise");
    return ex.length > 0 && ex.some((b) => !completedIds.has(b.id));
  });
  const ctaLabel = firstIncompleteTask
    ? `Halda áfram — ${firstIncompleteTask.name}`
    : todayExDone > 0
    ? "Skoða daginn"
    : "Byrja daginn";

  // Training week strip
  const currentTrainingWeek =
    currentDay && activeCourse
      ? activeCourse.weeks.find((w) => w.id === currentDay.weekId) ?? null
      : null;
  const trainingWeekDays = currentTrainingWeek
    ? [...currentTrainingWeek.days].sort((a, b) => a.order_index - b.order_index)
    : [];

  // Tomorrow exercise count
  const tomorrowExTotal = tomorrowDay
    ? tomorrowDay.tasks.flatMap((t) =>
        t.blocks.filter((b) => b.type === "exercise")
      ).length
    : 0;

  // ── Browse courses if no purchases ────────────────────────────────────────
  let browseCourses: { id: string; title: string; slug: string; category: string; price: number; cover_image: string | null }[] = [];
  if (purchases.length === 0) {
    const { data } = await supabase
      .from("courses")
      .select("id, title, slug, category, price, cover_image")
      .order("created_at", { ascending: false })
      .limit(4);
    browseCourses = data ?? [];
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const S = {
    card: {
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 14,
      padding: "18px 20px",
    } as React.CSSProperties,
    label: {
      fontSize: 10,
      fontWeight: 700,
      color: "var(--muted2)",
      letterSpacing: "0.1em",
      textTransform: "uppercase" as const,
      marginBottom: 12,
    },
  };

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <main
        style={{ maxWidth: 672, margin: "0 auto", padding: "24px 16px 96px" }}
        className="sm:px-6"
      >
        {/* ── GREETING ───────────────────────────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 12, color: "var(--muted2)", marginBottom: 2 }}>
            {islandicDate(today)}
          </p>
          <h1
            style={{
              fontFamily: "var(--font-bebas)",
              fontSize: 42,
              color: "var(--text)",
              letterSpacing: "0.04em",
              lineHeight: 1,
            }}
          >
            Hæ, {displayName}
          </h1>
        </div>

        {/* ── STREAK CARD ────────────────────────────────────────────── */}
        <div style={{ ...S.card, marginBottom: 14 }}>
          <div
            style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}
          >
            <span style={{ fontSize: 28, lineHeight: 1 }}>🔥</span>
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span
                  style={{
                    fontFamily: "var(--font-bebas)",
                    fontSize: 28,
                    color: "var(--text)",
                    letterSpacing: "0.04em",
                    lineHeight: 1,
                  }}
                >
                  {streak}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-bebas)",
                    fontSize: 20,
                    color: "var(--muted2)",
                    letterSpacing: "0.08em",
                  }}
                >
                  DAGAR
                </span>
              </div>
              <p style={{ fontSize: 12, color: "var(--muted2)", marginTop: 2 }}>
                {streak === 0
                  ? "Ljúktu við æfingu í dag til að byrja strák"
                  : "Streak í gangi — hald áfram!"}
              </p>
            </div>
          </div>

          {/* 7-dot week row */}
          <div style={{ display: "flex", gap: 4 }}>
            {calWeekDots.map((dot, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: dot.isToday
                      ? "var(--accent)"
                      : dot.isDone
                      ? "var(--success)"
                      : "var(--surface2)",
                    border: dot.isToday
                      ? "2px solid rgba(59,107,255,0.4)"
                      : "none",
                    boxSizing: "border-box",
                  }}
                />
                <span
                  style={{
                    fontSize: 8,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    color: dot.isToday ? "var(--accent)" : "var(--muted)",
                    textTransform: "uppercase",
                  }}
                >
                  {dot.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {activeCourse && currentDay ? (
          <>
            {/* ── TODAY CARD ─────────────────────────────────────────── */}
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: "18px 20px",
                position: "relative",
                overflow: "hidden",
                marginBottom: 14,
              }}
            >
              {/* Gradient top border */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background:
                    "linear-gradient(90deg, var(--accent), #8b5cf6, var(--success))",
                }}
              />

              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--accent)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                Dagur {currentDay.order_index + 1} · Vika {currentDay.weekNum}
              </p>
              <h2
                style={{
                  fontFamily: "var(--font-bebas)",
                  fontSize: 28,
                  color: "var(--text)",
                  letterSpacing: "0.04em",
                  lineHeight: 1,
                  marginBottom: 4,
                }}
              >
                {currentDay.title}
              </h2>

              {todayExTotal > 0 && (
                <p style={{ fontSize: 12, color: "var(--muted2)", marginBottom: 14 }}>
                  {todayExTotal} verkefni
                  {todayEstMin > 0 && ` · ~${todayEstMin} mín`}
                </p>
              )}

              {/* Progress ring + bar */}
              {todayExTotal > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <svg
                    width="38"
                    height="38"
                    viewBox="0 0 38 38"
                    style={{ flexShrink: 0, transform: "rotate(-90deg)" }}
                  >
                    <circle
                      cx="19"
                      cy="19"
                      r="15"
                      fill="none"
                      stroke="rgba(59,107,255,0.15)"
                      strokeWidth="3"
                    />
                    <circle
                      cx="19"
                      cy="19"
                      r="15"
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="3"
                      strokeDasharray={`${(todayProgressPct / 100) * 2 * Math.PI * 15} ${2 * Math.PI * 15}`}
                      strokeLinecap="round"
                      style={{ transition: "stroke-dasharray 0.4s ease" }}
                    />
                  </svg>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        height: 4,
                        background: "var(--surface2)",
                        borderRadius: 999,
                        overflow: "hidden",
                        marginBottom: 5,
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${todayProgressPct}%`,
                          background:
                            "linear-gradient(90deg, var(--accent), var(--success))",
                          borderRadius: 999,
                          transition: "width 0.4s ease",
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 11, color: "var(--muted2)" }}>
                      {todayExDone} / {todayExTotal} lokið
                    </span>
                  </div>
                </div>
              )}

              {/* CTA */}
              <Link
                href={`/courses/${activeCourse.slug}/weeks/${currentDay.weekId}/days/${currentDay.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "var(--accent)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  padding: "13px 16px",
                  borderRadius: 10,
                  textDecoration: "none",
                  minHeight: 46,
                  gap: 8,
                }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  ▶ {ctaLabel}
                </span>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            {/* ── TRAINING WEEK STRIP ────────────────────────────────── */}
            {trainingWeekDays.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <p style={{ ...S.label, marginBottom: 8 }}>
                  Vika {currentDay.weekNum} — {currentTrainingWeek?.title}
                </p>
                <div style={{ display: "flex", gap: 6 }}>
                  {trainingWeekDays.map((wd) => {
                    const abbrev = DAY_ABBREVS[wd.order_index] ?? `D${wd.order_index + 1}`;
                    const isCurrent = wd.id === currentDay.id;
                    const isPast = wd.order_index < currentDay.order_index;
                    const isLocked = wd.order_index > currentDay.order_index;

                    let pillStyle: React.CSSProperties = {
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                    };
                    let abbrevColor = "var(--muted2)";
                    let numColor = "var(--muted)";

                    if (isCurrent) {
                      pillStyle = {
                        background: "rgba(59,107,255,0.10)",
                        border: "1px solid rgba(59,107,255,0.5)",
                      };
                      abbrevColor = "var(--accent)";
                      numColor = "var(--accent)";
                    } else if (isPast) {
                      pillStyle = {
                        background: "rgba(45,212,160,0.07)",
                        border: "1px solid rgba(45,212,160,0.28)",
                      };
                      abbrevColor = "var(--success)";
                      numColor = "var(--success)";
                    }

                    return (
                      <Link
                        key={wd.id}
                        href={`/courses/${activeCourse.slug}/weeks/${currentDay.weekId}/days/${wd.id}`}
                        style={{
                          ...pillStyle,
                          borderRadius: 12,
                          padding: "10px 4px",
                          minWidth: 48,
                          flex: 1,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          textDecoration: "none",
                          opacity: isLocked ? 0.28 : 1,
                          transition: "opacity 0.15s",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: abbrevColor,
                            lineHeight: 1,
                          }}
                        >
                          {abbrev}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: numColor,
                            marginTop: 4,
                            lineHeight: 1,
                          }}
                        >
                          {wd.order_index + 1}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── TOMORROW PREVIEW ───────────────────────────────────── */}
            {tomorrowDay && (
              <div
                style={{
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 24,
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "var(--muted)",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      marginBottom: 3,
                    }}
                  >
                    Á morgun
                  </p>
                  <p
                    style={{
                      fontFamily: "var(--font-bebas)",
                      fontSize: 18,
                      color: "var(--text)",
                      letterSpacing: "0.04em",
                      lineHeight: 1,
                      marginBottom: 2,
                    }}
                  >
                    {tomorrowDay.title}
                  </p>
                  {tomorrowExTotal > 0 && (
                    <p style={{ fontSize: 11, color: "var(--muted2)" }}>
                      {tomorrowExTotal} verkefni · ~{Math.round(tomorrowExTotal * 3)} mín
                    </p>
                  )}
                </div>
                <svg
                  width="16"
                  height="16"
                  fill="none"
                  stroke="var(--muted)"
                  viewBox="0 0 24 24"
                  style={{ flexShrink: 0 }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            )}

            {/* ── PROGRAMS LIST ──────────────────────────────────────── */}
            <section>
              <p style={S.label}>Mín námskeið</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {enrichedCourses.map((course) => (
                  <Link
                    key={course.id}
                    href={`/courses/${course.slug}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      padding: "12px 14px",
                      textDecoration: "none",
                    }}
                  >
                    {/* Cover strip */}
                    <div
                      style={{
                        width: 52,
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
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            background: "var(--surface3)",
                          }}
                        />
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--text)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          marginBottom: 2,
                        }}
                      >
                        {course.title}
                      </p>
                      <p style={{ fontSize: 11, color: "var(--muted2)", marginBottom: 6 }}>
                        Vika {course.currentWeekNum} af {course.totalWeeks} · {course.pct}% lokið
                      </p>
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
                            transition: "width 0.4s ease",
                          }}
                        />
                      </div>
                    </div>

                    <svg
                      width="14"
                      height="14"
                      fill="none"
                      stroke="var(--muted)"
                      viewBox="0 0 24 24"
                      style={{ flexShrink: 0 }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            </section>
          </>
        ) : (
          /* ── No purchases — browse ──────────────────────────────────── */
          <section>
            <div
              style={{
                ...S.card,
                textAlign: "center",
                padding: "32px 20px",
                marginBottom: 20,
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-bebas)",
                  fontSize: 24,
                  color: "var(--text)",
                  letterSpacing: "0.04em",
                  marginBottom: 8,
                }}
              >
                Byrjaðu í dag
              </p>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--muted2)",
                  marginBottom: 20,
                  lineHeight: 1.6,
                }}
              >
                Þú ert ekki skráður í nein námskeið enn. Veldu námskeið og byrjaðu þjálfunina.
              </p>
              <Link
                href="/courses"
                style={{
                  display: "inline-block",
                  background: "var(--accent)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  padding: "11px 24px",
                  borderRadius: 10,
                  textDecoration: "none",
                }}
              >
                Skoða námskeið
              </Link>
            </div>

            {browseCourses.length > 0 && (
              <>
                <p style={S.label}>Í boði</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {browseCourses.map((course) => (
                    <Link
                      key={course.id}
                      href={`/courses/${course.slug}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: "12px 14px",
                        textDecoration: "none",
                      }}
                    >
                      <div
                        style={{
                          width: 48,
                          height: 36,
                          borderRadius: 6,
                          overflow: "hidden",
                          background: "var(--surface2)",
                          flexShrink: 0,
                        }}
                      >
                        {course.cover_image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={course.cover_image}
                            alt={course.title}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: "var(--text)",
                          flex: 1,
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {course.title}
                      </span>
                      <svg
                        width="14"
                        height="14"
                        fill="none"
                        stroke="var(--muted)"
                        viewBox="0 0 24 24"
                        style={{ flexShrink: 0 }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
