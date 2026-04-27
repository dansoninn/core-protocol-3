"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { DbCourse, DbWeek } from "@/types";

interface DayProgressData {
  blocksComplete: number;
  blocksTotal: number;
  tasksComplete: number;
  tasksTotal: number;
}

interface Props {
  course: DbCourse;
  weeks: DbWeek[];
  purchased: boolean;
  completedDayIds: string[];
  blocksCompleted: number;
  blocksTotal: number;
  userId: string | null;
  dayProgress: Record<string, DayProgressData>;
}

// ── Status ring ───────────────────────────────────────────────────────────────

function DayRing({
  blocksComplete,
  blocksTotal,
  isComplete,
  locked,
}: {
  blocksComplete: number;
  blocksTotal: number;
  isComplete: boolean;
  locked: boolean;
}) {
  if (locked) {
    return (
      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"
        style={{ flexShrink: 0, color: "var(--muted)" }}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    );
  }

  if (isComplete) {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" style={{ flexShrink: 0 }} aria-hidden>
        <circle cx="10" cy="10" r="10" fill="var(--success)" />
        <path d="M6 10.5l2.5 2.5 5.5-5.5" stroke="white" strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    );
  }

  if (blocksTotal > 0 && blocksComplete > 0) {
    const r = 8;
    const circ = 2 * Math.PI * r;
    const dash = (blocksComplete / blocksTotal) * circ;
    return (
      <svg width="20" height="20" viewBox="0 0 20 20"
        style={{ transform: "rotate(-90deg)", flexShrink: 0 }} aria-hidden>
        <circle cx="10" cy="10" r={r} fill="none" stroke="var(--accent-dim)" strokeWidth="2.5" />
        <circle cx="10" cy="10" r={r} fill="none" stroke="var(--accent)" strokeWidth="2.5"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
    );
  }

  // Unlocked, not started
  return (
    <div style={{
      width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
      border: "2px solid var(--accent)",
      background: "transparent",
    }} />
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CourseClient({
  course,
  weeks,
  purchased: initialPurchased,
  completedDayIds,
  blocksCompleted,
  blocksTotal,
  userId,
  dayProgress,
}: Props) {
  const allSortedDays = weeks.flatMap((w) =>
    w.days.map((d) => ({ ...d, weekId: w.id }))
  );

  const firstIncompleteDayId = initialPurchased
    ? allSortedDays.find((d) => !completedDayIds.includes(d.id))?.id ?? null
    : null;

  const currentWeekId = firstIncompleteDayId != null
    ? weeks.find((w) => w.days.some((d) => d.id === firstIncompleteDayId))?.id ?? null
    : null;

  // Unlock set: all days up to and including first incomplete
  const unlockedDayIds = new Set<string>();
  if (initialPurchased) {
    let unlocking = true;
    for (const day of allSortedDays) {
      if (unlocking) {
        unlockedDayIds.add(day.id);
        if (!completedDayIds.includes(day.id)) unlocking = false;
      }
    }
  }

  const [purchased, setPurchased] = useState(initialPurchased);
  const [buying, setBuying] = useState(false);
  const [expandedWeekIds, setExpandedWeekIds] = useState<Set<string>>(
    new Set(
      currentWeekId ? [currentWeekId] : weeks[0] ? [weeks[0].id] : []
    )
  );
  const router = useRouter();

  const progressPct = blocksTotal > 0
    ? Math.round((blocksCompleted / blocksTotal) * 100)
    : 0;
  const totalDays = allSortedDays.length;
  const completedDaysCount = completedDayIds.length;

  const handlePurchase = async () => {
    if (!userId) {
      router.push(`/auth/login?next=/courses/${course.slug}`);
      return;
    }
    setBuying(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("purchases")
      .insert({ user_id: userId, course_id: course.id });
    if (!error) {
      setPurchased(true);
      router.refresh();
    }
    setBuying(false);
  };

  const toggleWeek = (weekId: string) => {
    setExpandedWeekIds((prev) => {
      const next = new Set(prev);
      if (next.has(weekId)) next.delete(weekId);
      else next.add(weekId);
      return next;
    });
  };

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <div style={{
        position: "relative",
        minHeight: 300,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        overflow: "hidden",
        background: "var(--surface)",
      }}>
        {/* Cover image */}
        {course.cover_image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.cover_image}
            alt=""
            aria-hidden
            style={{
              position: "absolute", inset: 0,
              width: "100%", height: "100%",
              objectFit: "cover",
            }}
          />
        )}
        {/* Gradient overlay */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, rgba(10,12,15,0.2) 0%, rgba(10,12,15,0.95) 100%)",
        }} />

        {/* Back button — round circle → /dashboard */}
        <div style={{ position: "absolute", top: 16, left: 16, zIndex: 10 }}>
          <Link
            href="/dashboard"
            style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "rgba(0,0,0,0.35)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center",
              textDecoration: "none", color: "#fff", flexShrink: 0,
            }}
            aria-label="Til baka"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
        </div>

        {/* Hero text */}
        <div style={{ position: "relative", zIndex: 1, padding: "0 20px 28px", width: "100%" }}>
          {/* Eyebrow */}
          <p style={{
            fontSize: 10, fontWeight: 700, color: "var(--accent)",
            letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8,
          }}>
            CORE PROTOCOL
          </p>

          {/* Title */}
          <h1 style={{
            fontFamily: "var(--font-bebas)",
            fontSize: 36,
            color: "#fff",
            letterSpacing: "0.04em",
            lineHeight: 1,
            marginBottom: 10,
          }}>
            {course.title}
          </h1>

          {/* Instructor + category */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: purchased && blocksTotal > 0 ? 16 : 0, flexWrap: "wrap" }}>
            {course.instructor && (
              <span style={{ fontSize: 12, color: "var(--muted2)" }}>
                {course.instructor}
              </span>
            )}
            {course.category && (
              <span style={{
                fontSize: 10, fontWeight: 700, color: "var(--accent)",
                background: "var(--accent-dim)",
                padding: "3px 10px", borderRadius: 999,
                letterSpacing: "0.06em",
              }}>
                {course.category}
              </span>
            )}
          </div>

          {/* Progress bar (purchased only) */}
          {purchased && blocksTotal > 0 && (
            <div>
              <p style={{ fontSize: 12, color: "var(--muted2)", marginBottom: 6 }}>
                {completedDaysCount} af {totalDays} dögum · {progressPct}%
              </p>
              <div style={{ height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 999, overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${progressPct}%`,
                  background: "linear-gradient(90deg, var(--accent), var(--success))",
                  borderRadius: 999, transition: "width 0.4s ease",
                }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── CONTENT ──────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "20px 20px 80px" }}>

        {/* Purchase card (not yet enrolled) */}
        {!purchased && (
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: "18px 20px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}>
            <div>
              {course.description && (
                <p style={{ fontSize: 13, color: "var(--muted2)", lineHeight: 1.6, marginBottom: 8, maxWidth: 360 }}>
                  {course.description}
                </p>
              )}
              <p style={{ fontSize: 22, fontWeight: 700, color: "var(--text)" }}>
                {course.price.toLocaleString("is-IS")} kr.
              </p>
            </div>
            <button
              onClick={handlePurchase}
              disabled={buying}
              style={{
                background: "var(--accent)", color: "#fff",
                fontSize: 14, fontWeight: 700,
                padding: "12px 22px", borderRadius: 12,
                border: "none", cursor: buying ? "default" : "pointer",
                opacity: buying ? 0.6 : 1,
                transition: "opacity 0.15s", flexShrink: 0,
              }}
            >
              {buying ? "Hinkraðu…" : "Kaupa"}
            </button>
          </div>
        )}

        {/* Week list */}
        {weeks.length > 0 && (
          <section>
            <p style={{
              fontSize: 10, fontWeight: 700, color: "var(--muted2)",
              letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12,
            }}>
              NÁMSKEIÐ — YFIRLIT
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {weeks.map((week, weekIdx) => {
                const isOpen = expandedWeekIds.has(week.id);

                return (
                  <div
                    key={week.id}
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 14,
                      overflow: "hidden",
                    }}
                  >
                    {/* Week header */}
                    <button
                      onClick={() => toggleWeek(week.id)}
                      style={{
                        width: "100%", display: "flex", alignItems: "center",
                        justifyContent: "space-between",
                        padding: "14px 16px",
                        background: "transparent", border: "none",
                        cursor: "pointer", textAlign: "left",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{
                          fontFamily: "var(--font-bebas)",
                          fontSize: 18,
                          color: "var(--text)",
                          letterSpacing: "0.04em",
                          lineHeight: 1,
                        }}>
                          Vika {weekIdx + 1}
                        </span>
                        <span style={{
                          fontSize: 11, color: "var(--muted2)",
                          background: "var(--surface2)",
                          padding: "2px 8px", borderRadius: 999,
                        }}>
                          {week.days.length} {week.days.length === 1 ? "dagur" : "dagar"}
                        </span>
                      </div>
                      <svg
                        width="14" height="14" fill="none" stroke="var(--muted2)" viewBox="0 0 24 24"
                        style={{ transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Day rows */}
                    {isOpen && (
                      <div style={{
                        borderTop: "1px solid var(--border)",
                        background: "var(--bg)",
                        padding: "8px 10px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}>
                        {week.days.map((day) => {
                          const dp = dayProgress[day.id];
                          const isComplete = completedDayIds.includes(day.id);
                          const isUnlocked = purchased && unlockedDayIds.has(day.id);
                          const isLocked = !purchased || !unlockedDayIds.has(day.id);
                          const isCurrent = day.id === firstIncompleteDayId;
                          const pct = dp && dp.blocksTotal > 0
                            ? Math.round((dp.blocksComplete / dp.blocksTotal) * 100)
                            : 0;

                          const rowStyle: React.CSSProperties = {
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            background: isCurrent ? "var(--accent-dim)" : "var(--surface)",
                            border: `1px solid ${isCurrent ? "rgba(59,107,255,0.35)" : "var(--border)"}`,
                            borderRadius: 12,
                            padding: "14px 16px",
                            opacity: isLocked ? 0.3 : 1,
                            cursor: (isUnlocked || isComplete) ? "pointer" : "not-allowed",
                            textDecoration: "none",
                            transition: "background 0.1s",
                          };

                          const rowContent = (
                            <>
                              <DayRing
                                blocksComplete={dp?.blocksComplete ?? 0}
                                blocksTotal={dp?.blocksTotal ?? 0}
                                isComplete={isComplete}
                                locked={isLocked}
                              />

                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{
                                  fontSize: 13, fontWeight: 600,
                                  color: "var(--text)",
                                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                  marginBottom: dp && dp.tasksTotal > 0 ? 2 : 0,
                                }}>
                                  {day.title}
                                </p>
                                {dp && dp.tasksTotal > 0 && (
                                  <p style={{ fontSize: 11, color: "var(--muted2)" }}>
                                    {dp.tasksComplete}/{dp.tasksTotal} verkefni
                                  </p>
                                )}
                              </div>

                              <div style={{ flexShrink: 0, minWidth: 32, textAlign: "right" }}>
                                {isLocked ? (
                                  <span style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", letterSpacing: "0.04em" }}>
                                    Læst
                                  </span>
                                ) : isComplete ? (
                                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--success)" }}>
                                    100%
                                  </span>
                                ) : pct > 0 ? (
                                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)" }}>
                                    {pct}%
                                  </span>
                                ) : null}
                              </div>
                            </>
                          );

                          if (isUnlocked || isComplete) {
                            return (
                              <Link
                                key={day.id}
                                href={`/courses/${course.slug}/weeks/${week.id}/days/${day.id}`}
                                style={rowStyle}
                              >
                                {rowContent}
                              </Link>
                            );
                          }

                          return (
                            <div key={day.id} style={rowStyle}>
                              {rowContent}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
