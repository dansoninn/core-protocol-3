"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { DbCourse, DbWeek } from "@/types";

const DAY_ABBREVS = ["MÁN", "ÞRI", "MIÐ", "FIM", "FÖS", "LAU", "SUN"];

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

function DayRing({
  blocksComplete,
  blocksTotal,
  locked,
}: {
  blocksComplete: number;
  blocksTotal: number;
  locked: boolean;
}) {
  if (locked) {
    return (
      <svg
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        style={{ flexShrink: 0, color: "var(--muted)" }}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
    );
  }

  if (blocksTotal === 0) {
    return (
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          border: "2px solid var(--border)",
          flexShrink: 0,
        }}
      />
    );
  }

  const complete = blocksComplete === blocksTotal;
  if (complete) {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        style={{ flexShrink: 0 }}
        aria-hidden="true"
      >
        <circle cx="9" cy="9" r="9" fill="var(--success)" />
        <path
          d="M5 9.5l2.5 2.5 5-5"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    );
  }

  const r = 7;
  const circ = 2 * Math.PI * r;
  const dash = (blocksComplete / blocksTotal) * circ;
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      style={{ transform: "rotate(-90deg)", flexShrink: 0 }}
      aria-hidden="true"
    >
      <circle
        cx="9"
        cy="9"
        r={r}
        fill="none"
        stroke="var(--accent-dim)"
        strokeWidth="2.5"
      />
      {blocksComplete > 0 && (
        <circle
          cx="9"
          cy="9"
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.5"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

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
  // All days in order (weeks and days already sorted by server)
  const allSortedDays = weeks.flatMap((w) =>
    w.days.map((d) => ({ ...d, weekId: w.id }))
  );

  // First incomplete day
  const firstIncompleteDayId =
    initialPurchased
      ? allSortedDays.find((d) => !completedDayIds.includes(d.id))?.id ?? null
      : null;

  // Which week contains the current day
  const currentWeekId =
    firstIncompleteDayId != null
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
      currentWeekId
        ? [currentWeekId]
        : weeks[0]
        ? [weeks[0].id]
        : []
    )
  );
  const router = useRouter();

  const progressPct =
    blocksTotal > 0 ? Math.round((blocksCompleted / blocksTotal) * 100) : 0;
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
      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          minHeight: 240,
          background: "var(--surface)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
        }}
      >
        {course.cover_image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.cover_image}
            alt={course.title}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.4,
            }}
          />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, rgba(10,12,15,0.2), rgba(10,12,15,0.9))",
          }}
        />

        {/* Back */}
        <div style={{ position: "absolute", top: 16, left: 16, zIndex: 10 }}>
          <Link
            href="/courses"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              fontWeight: 500,
              color: "rgba(240,242,245,0.75)",
              background: "rgba(10,12,15,0.5)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.08)",
              padding: "6px 12px 6px 8px",
              borderRadius: 999,
              textDecoration: "none",
            }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Námskeið
          </Link>
        </div>

        {/* Hero text */}
        <div
          style={{ position: "relative", zIndex: 1, padding: "0 20px 24px" }}
          className="sm:px-6"
        >
          <span
            style={{
              display: "inline-block",
              fontSize: 10,
              fontWeight: 700,
              color: "var(--muted2)",
              background: "rgba(10,12,15,0.6)",
              backdropFilter: "blur(6px)",
              border: "1px solid rgba(255,255,255,0.08)",
              padding: "3px 10px",
              borderRadius: 999,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            {course.category}
          </span>
          <h1
            style={{
              fontFamily: "var(--font-bebas)",
              fontSize: "clamp(36px, 6vw, 56px)",
              lineHeight: 1,
              color: "#fff",
              letterSpacing: "0.03em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            {course.title}
          </h1>
          {course.instructor && (
            <p style={{ fontSize: 12, color: "rgba(136,146,160,0.8)" }}>
              {course.instructor}
            </p>
          )}
          {purchased && progressPct > 0 && (
            <span
              style={{
                display: "inline-block",
                marginTop: 10,
                fontSize: 11,
                fontWeight: 700,
                color: "var(--success)",
                background: "rgba(45,212,160,0.12)",
                border: "1px solid rgba(45,212,160,0.25)",
                padding: "3px 10px",
                borderRadius: 999,
              }}
            >
              {progressPct}% lokið
            </span>
          )}
        </div>
      </div>

      <div
        style={{ maxWidth: 768, margin: "0 auto", padding: "20px 16px 80px" }}
        className="sm:px-6"
      >
        {/* Overall progress bar */}
        {purchased && blocksTotal > 0 && (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: "16px 20px",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                Framvinda
              </span>
              <span style={{ fontSize: 12, color: "var(--muted2)" }}>
                {completedDaysCount} af {totalDays} dögum · {progressPct}%
              </span>
            </div>
            <div
              style={{
                height: 4,
                background: "var(--surface2)",
                borderRadius: 999,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progressPct}%`,
                  background: "linear-gradient(90deg, var(--accent), var(--success))",
                  borderRadius: 999,
                  transition: "width 0.4s ease",
                }}
              />
            </div>
          </div>
        )}

        {/* Purchase / description card */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: "18px 20px",
            marginBottom: 20,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
          className="sm:flex-row sm:items-center sm:justify-between"
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            {course.description && (
              <p style={{ fontSize: 13, color: "var(--muted2)", lineHeight: 1.6 }}>
                {course.description}
              </p>
            )}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 8,
              flexShrink: 0,
            }}
            className="sm:items-end"
          >
            <p
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "var(--text)",
              }}
            >
              {course.price.toLocaleString("is-IS")} kr.
            </p>
            {purchased ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--success)",
                }}
              >
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Námskeið keypt
              </span>
            ) : (
              <button
                onClick={handlePurchase}
                disabled={buying}
                style={{
                  background: "var(--accent)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "10px 20px",
                  borderRadius: 10,
                  border: "none",
                  cursor: buying ? "default" : "pointer",
                  opacity: buying ? 0.6 : 1,
                  transition: "opacity 0.15s",
                  minHeight: 40,
                }}
              >
                {buying ? "Hinkraðu…" : "Kaupa námskeið"}
              </button>
            )}
          </div>
        </div>

        {/* Curriculum */}
        {weeks.length > 0 && (
          <section>
            <h2
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--muted2)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              Námskeið — yfirlit
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {weeks.map((week, weekIdx) => {
                const isOpen = expandedWeekIds.has(week.id);
                const weekDaysComplete = week.days.filter((d) =>
                  completedDayIds.includes(d.id)
                ).length;

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
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "14px 16px",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: "var(--accent)",
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                          }}
                        >
                          Vika {weekIdx + 1}
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: "var(--text)",
                          }}
                        >
                          {week.title}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexShrink: 0,
                        }}
                      >
                        {purchased && (
                          <span style={{ fontSize: 11, color: "var(--muted2)" }}>
                            {weekDaysComplete}/{week.days.length}
                          </span>
                        )}
                        <svg
                          width="14"
                          height="14"
                          fill="none"
                          stroke="var(--muted2)"
                          viewBox="0 0 24 24"
                          style={{
                            transition: "transform 0.2s",
                            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                          }}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {/* Week days */}
                    {isOpen && (
                      <div
                        style={{
                          borderTop: "1px solid var(--border)",
                          background: "var(--bg)",
                        }}
                      >
                        {week.days.map((day, dayIdx) => {
                          const dp = dayProgress[day.id];
                          const isComplete = completedDayIds.includes(day.id);
                          const isUnlocked = purchased && unlockedDayIds.has(day.id);
                          const isLocked = purchased && !unlockedDayIds.has(day.id);
                          const abbrev = DAY_ABBREVS[day.order_index] ?? `D${day.order_index + 1}`;

                          const rowContent = (
                            <>
                              <DayRing
                                blocksComplete={dp?.blocksComplete ?? 0}
                                blocksTotal={dp?.blocksTotal ?? 0}
                                locked={isLocked || !purchased}
                              />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <span
                                  style={{
                                    fontSize: 13,
                                    fontWeight: 500,
                                    color: isComplete
                                      ? "var(--muted)"
                                      : "var(--text)",
                                    textDecoration: isComplete ? "line-through" : "none",
                                    display: "block",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {day.title}
                                </span>
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  flexShrink: 0,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 600,
                                    color: "var(--muted)",
                                    letterSpacing: "0.06em",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  {abbrev}
                                </span>
                                {dp && dp.tasksTotal > 0 && (
                                  <span
                                    style={{
                                      fontSize: 11,
                                      color: "var(--muted2)",
                                      fontVariantNumeric: "tabular-nums",
                                    }}
                                  >
                                    {dp.tasksComplete}/{dp.tasksTotal}
                                  </span>
                                )}
                                {isUnlocked && !isComplete && (
                                  <svg
                                    width="14"
                                    height="14"
                                    fill="none"
                                    stroke="var(--muted)"
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                )}
                              </div>
                            </>
                          );

                          const rowStyle: React.CSSProperties = {
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "12px 16px",
                            borderBottom:
                              dayIdx < week.days.length - 1
                                ? "1px solid var(--border)"
                                : "none",
                            opacity: isLocked || !purchased ? 0.35 : 1,
                            cursor: isUnlocked || isComplete ? "pointer" : "not-allowed",
                            textDecoration: "none",
                            transition: "background 0.1s",
                          };

                          if (isUnlocked || isComplete) {
                            return (
                              <Link
                                key={day.id}
                                href={`/courses/${course.slug}/weeks/${week.id}/days/${day.id}`}
                                style={rowStyle}
                                className="hover:bg-white/[0.03]"
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
