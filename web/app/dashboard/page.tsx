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

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/dashboard");

  // DEBUG
  console.log("[dashboard] user.id:", user.id);
  console.log("[dashboard] user.email:", user.email);

  // Profile
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();
  const firstName =
    profileRow?.full_name?.trim()?.split(" ")[0] ||
    user.email?.split("@")[0] ||
    "Vinur";

  // Step 1: enrollment check — simple query, no joins
  const { data: purchaseData, error: purchaseError } = await supabase
    .from("purchases")
    .select("course_id")
    .eq("user_id", user.id);

  // DEBUG
  console.log("[dashboard] purchaseData:", JSON.stringify(purchaseData));
  console.log("[dashboard] purchaseError:", JSON.stringify(purchaseError));

  const courseIds = (purchaseData ?? []).map((p: { course_id: string }) => p.course_id);

  // Step 2: fetch full course data only if enrolled
  let coursesData: CourseRow[] = [];
  if (courseIds.length > 0) {
    const { data: coursesRaw } = await supabase
      .from("courses")
      .select(`
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
      `)
      .in("id", courseIds);
    coursesData = (coursesRaw as unknown as CourseRow[]) ?? [];
  }

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

  // ── isDayDone helper ──────────────────────────────────────────────────────
  const isDayDone = (d: DayRow): boolean => {
    const exBlocks = d.tasks.flatMap((t) =>
      t.blocks.filter((b) => b.type === "exercise")
    );
    if (exBlocks.length === 0) return true;
    return exBlocks.every((b) => completedIds.has(b.id));
  };

  // ── Per-course enrichment ─────────────────────────────────────────────────
  type EnrichedCourse = CourseRow & {
    allBlockIds: string[];
    completedCount: number;
    pct: number;
    currentWeekNum: number;
    totalWeeks: number;
    allSortedDays: (DayRow & { weekId: string; weekNum: number })[];
  };

  const enrichedCourses: EnrichedCourse[] = coursesData.map((course) => {
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

  // ── Today / current day ───────────────────────────────────────────────────
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

  // Today's exercise counts
  const todayExBlocks = currentDay
    ? currentDay.tasks.flatMap((t) => t.blocks.filter((b) => b.type === "exercise"))
    : [];
  const todayExTotal = todayExBlocks.length;
  const todayExDone = todayExBlocks.filter((b) => completedIds.has(b.id)).length;
  const todayProgressPct = todayExTotal > 0 ? (todayExDone / todayExTotal) * 100 : 0;
  const todayEstMin = Math.round(todayExTotal * 3);

  const firstIncompleteTask = currentDay?.tasks.find((t) => {
    const ex = t.blocks.filter((b) => b.type === "exercise");
    return ex.length > 0 && ex.some((b) => !completedIds.has(b.id));
  });
  const ctaLabel = firstIncompleteTask
    ? `Halda áfram — ${firstIncompleteTask.name}`
    : todayExDone > 0
    ? "Skoða daginn"
    : "Byrja daginn →";

  // Training week
  const currentTrainingWeek =
    currentDay && activeCourse
      ? activeCourse.weeks.find((w) => w.id === currentDay.weekId) ?? null
      : null;
  const trainingWeekDays = currentTrainingWeek
    ? [...currentTrainingWeek.days].sort((a, b) => a.order_index - b.order_index)
    : [];

  const weekDaysCompleted = trainingWeekDays.filter(isDayDone).length;
  const weekDaysTotal = trainingWeekDays.length;
  const weekProgressPct =
    weekDaysTotal > 0 ? Math.round((weekDaysCompleted / weekDaysTotal) * 100) : 0;

  // Tomorrow
  const tomorrowExTotal = tomorrowDay
    ? tomorrowDay.tasks.flatMap((t) => t.blocks.filter((b) => b.type === "exercise")).length
    : 0;

  // Browse courses if not enrolled
  let browseCourses: { id: string; title: string; slug: string; category: string; price: number; cover_image: string | null }[] = [];
  if (courseIds.length === 0) {
    const { data } = await supabase
      .from("courses")
      .select("id, title, slug, category, price, cover_image")
      .order("created_at", { ascending: false })
      .limit(4);
    browseCourses = data ?? [];
  }

  // ── Shared styles ─────────────────────────────────────────────────────────
  const sectionLabel: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    color: "var(--muted2)",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    marginBottom: 10,
  };

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <main
        style={{ maxWidth: 680, margin: "0 auto", padding: "24px 20px 96px" }}
      >

        {/* ── GREETING ─────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 12, color: "var(--muted2)", marginBottom: 4 }}>
            {islandicDate(today)}
          </p>
          <h1
            style={{
              fontFamily: "var(--font-bebas)",
              fontSize: 48,
              color: "var(--text)",
              letterSpacing: "0.04em",
              lineHeight: 1,
              marginBottom: 6,
            }}
          >
            HÆ, {firstName.toUpperCase()}!
          </h1>
          <p style={{ fontSize: 14, color: "var(--muted2)", lineHeight: 1.5 }}>
            Þú ert að gera vel. Haltu áfram.
          </p>
        </div>

        {/* ── STREAK CARD ──────────────────────────────────────────────── */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: "16px 20px",
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          {/* Left: icon + count */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "rgba(255,140,66,0.15)",
                border: "1px solid rgba(255,140,66,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                flexShrink: 0,
              }}
            >
              🔥
            </div>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-bebas)",
                  fontSize: 28,
                  color: "var(--text)",
                  letterSpacing: "0.04em",
                  lineHeight: 1,
                }}
              >
                {streak} DAGAR
              </div>
              <p style={{ fontSize: 11, color: "var(--muted2)", marginTop: 2 }}>
                {streak === 0 ? "Byrjaðu strákinn í dag" : "Streak í gangi"}
              </p>
            </div>
          </div>

          {/* Right: 7-dot week row */}
          <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
            {calWeekDots.map((dot, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <div
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: dot.isToday
                      ? "var(--accent)"
                      : dot.isDone
                      ? "var(--success)"
                      : "var(--surface2)",
                    border: dot.isFuture
                      ? "1px solid var(--border)"
                      : dot.isToday
                      ? "2px solid rgba(59,107,255,0.35)"
                      : "none",
                    boxSizing: "border-box",
                  }}
                />
                <span
                  style={{
                    fontSize: 7,
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
            {/* ── TODAY CARD ───────────────────────────────────────────── */}
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 20,
                overflow: "hidden",
                position: "relative",
                marginBottom: 10,
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
                  background: "linear-gradient(90deg, #3b6bff, #7c3aed, #2dd4a0)",
                  zIndex: 2,
                }}
              />

              {/* Cover image background */}
              {activeCourse.cover_image && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeCourse.cover_image}
                    alt=""
                    aria-hidden
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      opacity: 0.4,
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "linear-gradient(180deg, rgba(10,12,15,0.55) 0%, rgba(10,12,15,0.90) 100%)",
                    }}
                  />
                </>
              )}

              {/* Content */}
              <div style={{ position: "relative", zIndex: 1, padding: "20px 20px 18px" }}>
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
                  DAGUR {currentDay.order_index + 1} · VIKA {currentDay.weekNum}
                </p>

                <h2
                  style={{
                    fontFamily: "var(--font-bebas)",
                    fontSize: 32,
                    color: "var(--text)",
                    letterSpacing: "0.04em",
                    lineHeight: 1,
                    marginBottom: 6,
                  }}
                >
                  {currentDay.title}
                </h2>

                {todayExTotal > 0 && (
                  <p style={{ fontSize: 12, color: "var(--muted2)", marginBottom: 16 }}>
                    {todayExTotal} verkefni{todayEstMin > 0 ? ` · ~${todayEstMin} mín` : ""}
                  </p>
                )}

                {/* Progress ring + bar */}
                {todayExTotal > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                    <svg
                      width="38"
                      height="38"
                      viewBox="0 0 38 38"
                      style={{ flexShrink: 0, transform: "rotate(-90deg)" }}
                    >
                      <circle cx="19" cy="19" r="15" fill="none" stroke="rgba(59,107,255,0.15)" strokeWidth="3" />
                      <circle
                        cx="19" cy="19" r="15" fill="none"
                        stroke="var(--accent)" strokeWidth="3"
                        strokeDasharray={`${(todayProgressPct / 100) * 2 * Math.PI * 15} ${2 * Math.PI * 15}`}
                        strokeLinecap="round"
                        style={{ transition: "stroke-dasharray 0.4s ease" }}
                      />
                    </svg>
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 999, overflow: "hidden", marginBottom: 5 }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${todayProgressPct}%`,
                            background: "linear-gradient(90deg, var(--accent), var(--success))",
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

                {/* CTA button */}
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
                    padding: "13px 18px",
                    borderRadius: 12,
                    textDecoration: "none",
                    gap: 8,
                  }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {firstIncompleteTask ? `▶ ${ctaLabel}` : ctaLabel}
                  </span>
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* ── TOMORROW PREVIEW ─────────────────────────────────────── */}
            {tomorrowDay && (
              <Link
                href={`/courses/${activeCourse.slug}/weeks/${tomorrowDay.weekId}/days/${tomorrowDay.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "12px 16px",
                  textDecoration: "none",
                  marginBottom: 20,
                }}
              >
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2 }}>
                    Á morgun
                  </p>
                  <p style={{ fontFamily: "var(--font-bebas)", fontSize: 18, color: "var(--text)", letterSpacing: "0.04em", lineHeight: 1, marginBottom: 2 }}>
                    {tomorrowDay.title}
                  </p>
                  {tomorrowExTotal > 0 && (
                    <p style={{ fontSize: 11, color: "var(--muted2)" }}>
                      {tomorrowExTotal} verkefni · ~{Math.round(tomorrowExTotal * 3)} mín
                    </p>
                  )}
                </div>
                <svg width="16" height="16" fill="none" stroke="var(--muted)" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )}

            {/* ── WEEK PROGRESS ────────────────────────────────────────── */}
            {weekDaysTotal > 0 && (
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  padding: "16px 20px",
                  marginBottom: 20,
                }}
              >
                <p style={sectionLabel}>Þessi vika</p>
                <p style={{ fontSize: 13, color: "var(--text)", fontWeight: 600, marginBottom: 10 }}>
                  {weekDaysCompleted} af {weekDaysTotal} dögum kláraðir
                </p>
                <div style={{ height: 5, background: "var(--surface2)", borderRadius: 999, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${weekProgressPct}%`,
                      background: "linear-gradient(90deg, var(--accent), var(--success))",
                      borderRadius: 999,
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
              </div>
            )}

            {/* ── MY PROGRAMS ──────────────────────────────────────────── */}
            {enrichedCourses.length > 0 && (
              <section>
                <p style={sectionLabel}>Mín námskeið</p>
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
                      {/* Thumbnail */}
                      <div
                        style={{
                          width: 48,
                          height: 48,
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

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }}>
                          {course.title}
                        </p>
                        <p style={{ fontSize: 11, color: "var(--muted2)", marginBottom: 6 }}>
                          Vika {course.currentWeekNum} af {course.totalWeeks} · {course.pct}%
                        </p>
                        <div style={{ height: 3, background: "var(--surface2)", borderRadius: 999, overflow: "hidden" }}>
                          <div
                            style={{
                              height: "100%",
                              width: `${course.pct}%`,
                              background: "linear-gradient(90deg, var(--accent), var(--success))",
                              borderRadius: 999,
                            }}
                          />
                        </div>
                      </div>

                      <svg width="14" height="14" fill="none" stroke="var(--muted)" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          /* ── Not enrolled ─────────────────────────────────────────────── */
          <section>
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 16,
                padding: "32px 20px",
                textAlign: "center",
                marginBottom: 20,
              }}
            >
              <p style={{ fontFamily: "var(--font-bebas)", fontSize: 24, color: "var(--text)", letterSpacing: "0.04em", marginBottom: 8 }}>
                Byrjaðu í dag
              </p>
              <p style={{ fontSize: 13, color: "var(--muted2)", marginBottom: 20, lineHeight: 1.6 }}>
                Þú ert ekki skráður í nein námskeið enn.<br />Veldu námskeið og byrjaðu þjálfunina.
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
                <p style={sectionLabel}>Í boði</p>
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
                      <div style={{ width: 48, height: 48, borderRadius: 10, overflow: "hidden", background: "var(--surface2)", flexShrink: 0 }}>
                        {course.cover_image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={course.cover_image} alt={course.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        )}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {course.title}
                      </span>
                      <svg width="14" height="14" fill="none" stroke="var(--muted)" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
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
