"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import ExerciseVideoModal from "@/components/ExerciseVideoModal";
import VideoPlayer from "@/components/VideoPlayer";
import type { DbTask, DbExercise } from "@/types";

const DAY_ABBREVS = ["MÁN", "ÞRI", "MIÐ", "FIM", "FÖS", "LAU", "SUN"];

const C = {
  page: "#0a0c0f",
  card: "#111318",
  row: "#161a21",
  body: "#f0f2f5",
  muted: "#8892a0",
  blue: "#3b6bff",
  teal: "#2dd4a0",
  border: "rgba(255,255,255,0.06)",
};

interface DayNavItem {
  id: string;
  title: string;
  weekId: string;
}

interface WeekDay {
  id: string;
  title: string;
  order_index: number;
}

interface Props {
  courseSlug: string;
  courseTitle: string;
  courseCategory: string | null;
  courseInstructor: string | null;
  coverImage: string | null;
  weekTitle: string;
  weekId: string;
  weekNumber: number;
  totalWeeks: number;
  weekDays: WeekDay[];
  day: {
    id: string;
    title: string;
    description: string | null;
    order_index: number;
  };
  tasks: DbTask[];
  userId: string;
  initialCompletedBlockIds: string[];
  prevDay: DayNavItem | null;
  nextDay: DayNavItem | null;
}

function getTaskBadge(name: string): { bg: string; color: string } {
  const lower = name.toLowerCase();
  if (lower.includes("upphitun"))
    return { bg: "rgba(255,140,66,0.15)", color: "#ff8c42" };
  if (lower.includes("aðal") || lower.includes("adal"))
    return { bg: "rgba(59,107,255,0.12)", color: "#3b6bff" };
  if (lower.includes("block") || lower.includes("blokk"))
    return { bg: "rgba(45,212,160,0.10)", color: "#2dd4a0" };
  if (lower.includes("texti") || lower.includes("text"))
    return { bg: C.row, color: C.muted };
  return { bg: "rgba(59,107,255,0.12)", color: C.blue };
}

function TaskProgressRing({
  done,
  total,
  color,
}: {
  done: number;
  total: number;
  color: string;
}) {
  if (total === 0) return null;
  const r = 9;
  const circ = 2 * Math.PI * r;
  const complete = done === total;

  if (complete) {
    return (
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
        <circle cx="11" cy="11" r="11" fill={color} />
        <path
          d="M7 11.5l3 3 5-5.5"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    );
  }

  const dash = (done / total) * circ;
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      style={{ transform: "rotate(-90deg)" }}
      aria-hidden="true"
    >
      <circle
        cx="11"
        cy="11"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        opacity="0.2"
      />
      {done > 0 && (
        <circle
          cx="11"
          cy="11"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

function PrescriptionPill({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div
      style={{
        background: C.page,
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 8,
        padding: "6px 10px",
        minWidth: 44,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-bebas)",
          fontSize: 20,
          lineHeight: 1,
          color: C.body,
          letterSpacing: "0.02em",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 10,
          color: C.muted,
          marginTop: 2,
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </div>
    </div>
  );
}

export default function DayClient({
  courseSlug,
  courseTitle,
  courseCategory,
  courseInstructor,
  coverImage,
  weekId,
  weekNumber,
  totalWeeks,
  weekDays,
  day,
  tasks,
  userId,
  initialCompletedBlockIds,
  prevDay,
  nextDay,
}: Props) {
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(
    new Set(tasks[0] ? [tasks[0].id] : [])
  );
  const [completedIds, setCompletedIds] = useState<Set<string>>(
    new Set(initialCompletedBlockIds)
  );
  const [saving, setSaving] = useState<string | null>(null);
  const [activeExercise, setActiveExercise] = useState<DbExercise | null>(null);

  const allExerciseBlocks = tasks.flatMap((t) =>
    t.blocks.filter((b) => b.type === "exercise")
  );
  const totalExerciseCount = allExerciseBlocks.length;
  const completedExerciseCount = allExerciseBlocks.filter((b) =>
    completedIds.has(b.id)
  ).length;
  const allDone =
    totalExerciseCount > 0 && completedExerciseCount === totalExerciseCount;

  const toggleTask = (e: React.MouseEvent, taskId: string) => {
    e.preventDefault();
    setExpandedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const handleToggle = async (e: React.MouseEvent, blockId: string) => {
    e.preventDefault();
    if (saving) return;
    setSaving(blockId);
    const supabase = createClient();
    const isDone = completedIds.has(blockId);

    if (isDone) {
      const { error } = await supabase
        .from("progress")
        .delete()
        .eq("user_id", userId)
        .eq("block_id", blockId);
      if (!error) {
        setCompletedIds((prev) => {
          const next = new Set(prev);
          next.delete(blockId);
          return next;
        });
      }
    } else {
      const { error } = await supabase
        .from("progress")
        .upsert(
          { user_id: userId, block_id: blockId },
          { onConflict: "user_id,block_id" }
        );
      if (!error) {
        setCompletedIds((prev) => {
          const next = new Set(prev);
          next.add(blockId);
          return next;
        });
      }
    }
    setSaving(null);
  };

  const progressPct =
    totalExerciseCount > 0
      ? (completedExerciseCount / totalExerciseCount) * 100
      : 0;

  return (
    <>
      <div style={{ background: C.page, minHeight: "100vh" }}>

        {/* ── HERO ──────────────────────────────────────────────────────── */}
        <div
          style={{ position: "relative", overflow: "hidden", minHeight: 240 }}
          className="flex flex-col justify-end"
        >
          {/* Cover image */}
          {coverImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverImage}
              alt={courseTitle}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: 0.45,
              }}
            />
          )}

          {/* Gradient overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to bottom, rgba(10,12,15,0.2) 0%, rgba(10,12,15,0.92) 100%)",
            }}
          />

          {/* Back button */}
          <div style={{ position: "absolute", top: 16, left: 16, zIndex: 10 }}>
            <Link
              href={`/courses/${courseSlug}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                color: "rgba(240,242,245,0.75)",
                fontSize: 13,
                fontWeight: 500,
                background: "rgba(10,12,15,0.5)",
                backdropFilter: "blur(8px)",
                padding: "6px 12px 6px 8px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.08)",
                textDecoration: "none",
              }}
            >
              <svg
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              {courseTitle}
            </Link>
          </div>

          {/* Category badge */}
          {courseCategory && (
            <div
              style={{ position: "absolute", top: 16, right: 16, zIndex: 10 }}
            >
              <span
                style={{
                  display: "inline-block",
                  fontSize: 10,
                  fontWeight: 700,
                  background: "rgba(255,255,255,0.1)",
                  color: "rgba(240,242,245,0.8)",
                  padding: "4px 10px",
                  borderRadius: 999,
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                {courseCategory}
              </span>
            </div>
          )}

          {/* Hero text */}
          <div
            style={{ position: "relative", zIndex: 1, padding: "0 20px 24px" }}
            className="sm:px-6"
          >
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: C.blue,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Vika {weekNumber} / {totalWeeks}
            </p>
            <h1
              style={{
                fontFamily: "var(--font-bebas)",
                fontSize: 48,
                lineHeight: 1,
                color: "#ffffff",
                letterSpacing: "0.03em",
                textTransform: "uppercase",
                marginBottom: day.description ? 10 : 0,
              }}
            >
              {day.title}
            </h1>
            {day.description && (
              <p
                style={{
                  fontSize: 13,
                  color: C.muted,
                  lineHeight: 1.6,
                  whiteSpace: "pre-line",
                  maxWidth: 480,
                }}
              >
                {day.description}
              </p>
            )}
            {courseInstructor && (
              <p
                style={{
                  fontSize: 11,
                  color: "rgba(136,146,160,0.7)",
                  marginTop: 8,
                }}
              >
                {courseInstructor}
              </p>
            )}
          </div>
        </div>

        {/* ── WEEK STRIP ─────────────────────────────────────────────────── */}
        {weekDays.length > 0 && (
          <div
            style={{
              background: C.page,
              padding: "12px 12px 4px",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 5,
                overflowX: "auto",
                maxWidth: 672,
                margin: "0 auto",
                paddingBottom: 8,
                scrollbarWidth: "none",
              }}
              className="[&::-webkit-scrollbar]:hidden"
            >
              {weekDays.map((wd) => {
                const abbrev =
                  DAY_ABBREVS[wd.order_index] ?? `D${wd.order_index + 1}`;
                const isCurrent = wd.id === day.id;
                const isPast = wd.order_index < day.order_index;
                const isLocked = wd.order_index > day.order_index;

                let pillStyle: React.CSSProperties = {
                  background: C.card,
                  border: `1px solid ${C.border}`,
                };
                let abbrevColor = C.muted;
                let numColor = C.muted;

                if (isCurrent) {
                  pillStyle = {
                    background: "rgba(59,107,255,0.10)",
                    border: "1px solid rgba(59,107,255,0.5)",
                  };
                  abbrevColor = C.blue;
                  numColor = C.blue;
                } else if (isPast) {
                  pillStyle = {
                    background: "rgba(45,212,160,0.07)",
                    border: "1px solid rgba(45,212,160,0.28)",
                  };
                  abbrevColor = C.teal;
                  numColor = C.teal;
                }

                return (
                  <Link
                    key={wd.id}
                    href={`/courses/${courseSlug}/weeks/${weekId}/days/${wd.id}`}
                    style={{
                      ...pillStyle,
                      borderRadius: 12,
                      padding: "10px 6px",
                      minWidth: 44,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      textDecoration: "none",
                      flexShrink: 0,
                      opacity: isLocked ? 0.28 : 1,
                      transition: "opacity 0.15s",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 9,
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
                        fontFamily: "var(--font-bebas)",
                        fontSize: 20,
                        color: numColor,
                        marginTop: 3,
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

        {/* ── MAIN CONTENT ───────────────────────────────────────────────── */}
        <main
          style={{ maxWidth: 672, margin: "0 auto", padding: "16px 16px 96px" }}
          className="sm:px-6"
        >

          {/* Day summary card */}
          {totalExerciseCount > 0 && (
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 16,
                padding: "16px 20px",
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                {/* Ring */}
                <svg
                  width="42"
                  height="42"
                  viewBox="0 0 42 42"
                  style={{ flexShrink: 0, transform: "rotate(-90deg)" }}
                >
                  <circle
                    cx="21"
                    cy="21"
                    r="17"
                    fill="none"
                    stroke="rgba(59,107,255,0.15)"
                    strokeWidth="3"
                  />
                  <circle
                    cx="21"
                    cy="21"
                    r="17"
                    fill="none"
                    stroke={C.blue}
                    strokeWidth="3"
                    strokeDasharray={`${(progressPct / 100) * 2 * Math.PI * 17} ${2 * Math.PI * 17}`}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dasharray 0.4s ease" }}
                  />
                </svg>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      height: 5,
                      background: "rgba(255,255,255,0.06)",
                      borderRadius: 999,
                      overflow: "hidden",
                      marginBottom: 6,
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${progressPct}%`,
                        background: `linear-gradient(90deg, ${C.blue}, ${C.teal})`,
                        borderRadius: 999,
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      color: C.muted,
                      fontWeight: 500,
                    }}
                  >
                    {completedExerciseCount} / {totalExerciseCount} verkefni
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Task accordion */}
          {tasks.length === 0 ? (
            <p
              style={{
                color: C.muted,
                fontSize: 14,
                textAlign: "center",
                padding: "40px 0",
              }}
            >
              Engar æfingar fundust fyrir þennan dag.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {tasks.map((task) => {
                const isExpanded = expandedTaskIds.has(task.id);
                const taskExBlocks = task.blocks.filter(
                  (b) => b.type === "exercise"
                );
                const taskDone = taskExBlocks.filter((b) =>
                  completedIds.has(b.id)
                ).length;
                const taskTotal = taskExBlocks.length;
                const taskComplete = taskTotal > 0 && taskDone === taskTotal;
                const badge = getTaskBadge(task.name);

                return (
                  <div
                    key={task.id}
                    style={{
                      background: C.card,
                      border: `1px solid ${C.border}`,
                      borderRadius: 14,
                      overflow: "hidden",
                      borderLeft: `2px solid ${task.color}`,
                    }}
                  >
                    {/* Accordion header */}
                    <button
                      onClick={(e) => toggleTask(e, task.id)}
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
                        minHeight: 54,
                        gap: 8,
                      }}
                      aria-expanded={isExpanded}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
                        <TaskProgressRing
                          done={taskDone}
                          total={taskTotal}
                          color={task.color}
                        />
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 500,
                            color: taskComplete
                              ? "rgba(240,242,245,0.35)"
                              : C.body,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {task.name}
                        </span>
                        <span
                          style={{
                            background: badge.bg,
                            color: badge.color,
                            fontSize: 10,
                            fontWeight: 600,
                            padding: "2px 7px",
                            borderRadius: 999,
                            letterSpacing: "0.04em",
                            flexShrink: 0,
                          }}
                        >
                          {task.name}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          flexShrink: 0,
                        }}
                      >
                        {taskTotal > 0 && !taskComplete && (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 500,
                              color: C.muted,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {taskDone}/{taskTotal}
                          </span>
                        )}
                        <svg
                          width="16"
                          height="16"
                          fill="none"
                          stroke={C.muted}
                          viewBox="0 0 24 24"
                          style={{
                            transition: "transform 0.2s",
                            transform: isExpanded
                              ? "rotate(180deg)"
                              : "rotate(0deg)",
                          }}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </button>

                    {/* Expanded body */}
                    {isExpanded && (
                      <div
                        style={{
                          background: C.page,
                          borderTop: `1px solid ${C.border}`,
                        }}
                      >
                        {/* Task video */}
                        {task.video_url && (
                          <div style={{ background: "#000" }}>
                            <VideoPlayer url={task.video_url} title={task.name} />
                          </div>
                        )}

                        {/* Blocks */}
                        {task.blocks.length === 0 ? (
                          <p
                            style={{
                              padding: "24px 20px",
                              fontSize: 13,
                              color: C.muted,
                              textAlign: "center",
                            }}
                          >
                            Engar æfingar í þessum hóp.
                          </p>
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 6,
                              padding: "10px 10px",
                            }}
                          >
                            {task.blocks.map((block) => {
                              // ── TEXT / COACH NOTES BLOCK ──────────────────
                              if (block.type === "text") {
                                return (
                                  <div
                                    key={block.id}
                                    style={{
                                      background: C.row,
                                      borderRadius: 11,
                                      borderLeft: `2px solid ${C.blue}`,
                                      padding: "12px 14px",
                                    }}
                                  >
                                    <p
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        color: C.blue,
                                        letterSpacing: "0.1em",
                                        textTransform: "uppercase",
                                        marginBottom: 6,
                                      }}
                                    >
                                      Leiðbeiningar
                                    </p>
                                    <p
                                      style={{
                                        fontSize: 13,
                                        color: C.muted,
                                        lineHeight: 1.6,
                                        whiteSpace: "pre-line",
                                      }}
                                    >
                                      {block.content}
                                    </p>
                                  </div>
                                );
                              }

                              // ── EXERCISE BLOCK ────────────────────────────
                              if (!block.exercises) return null;
                              const ex = block.exercises;
                              const done = completedIds.has(block.id);
                              const isSaving = saving === block.id;

                              return (
                                <div
                                  key={block.id}
                                  style={{
                                    background: C.row,
                                    borderRadius: 10,
                                    padding: "12px 14px",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 10,
                                    opacity: isSaving ? 0.6 : 1,
                                    transition: "opacity 0.15s",
                                  }}
                                >
                                  {/* Top: exercise name + play button */}
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "flex-start",
                                      justifyContent: "space-between",
                                      gap: 8,
                                    }}
                                  >
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        setActiveExercise(ex);
                                      }}
                                      style={{
                                        background: "transparent",
                                        border: "none",
                                        cursor: "pointer",
                                        padding: 0,
                                        textAlign: "left",
                                        flex: 1,
                                        minWidth: 0,
                                      }}
                                    >
                                      <p
                                        style={{
                                          fontSize: 13,
                                          fontWeight: 500,
                                          color: done
                                            ? "rgba(240,242,245,0.35)"
                                            : C.body,
                                          textDecoration: done
                                            ? "line-through"
                                            : "none",
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        {ex.name}
                                      </p>
                                      <span
                                        style={{
                                          display: "inline-block",
                                          marginTop: 4,
                                          fontSize: 9,
                                          fontWeight: 600,
                                          color: C.muted,
                                          background: C.page,
                                          padding: "2px 6px",
                                          borderRadius: 999,
                                          letterSpacing: "0.08em",
                                          textTransform: "uppercase",
                                        }}
                                      >
                                        {ex.category}
                                      </span>
                                    </button>

                                    {ex.mux_playback_id && (
                                      <button
                                        onClick={(e) => {
                                          e.preventDefault();
                                          setActiveExercise(ex);
                                        }}
                                        style={{
                                          width: 32,
                                          height: 32,
                                          borderRadius: 8,
                                          background: "rgba(59,107,255,0.12)",
                                          border:
                                            "1px solid rgba(59,107,255,0.25)",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          cursor: "pointer",
                                          flexShrink: 0,
                                        }}
                                        aria-label="Horfa á myndband"
                                      >
                                        <svg
                                          width="14"
                                          height="14"
                                          fill={C.blue}
                                          viewBox="0 0 20 20"
                                        >
                                          <path
                                            fillRule="evenodd"
                                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                                            clipRule="evenodd"
                                          />
                                        </svg>
                                      </button>
                                    )}
                                  </div>

                                  {/* Prescription pills */}
                                  {(block.sets || block.reps || block.load) && (
                                    <div
                                      style={{
                                        display: "flex",
                                        gap: 6,
                                        flexWrap: "wrap",
                                      }}
                                    >
                                      {block.sets && (
                                        <PrescriptionPill
                                          value={block.sets}
                                          label="set"
                                        />
                                      )}
                                      {block.reps && (
                                        <PrescriptionPill
                                          value={block.reps}
                                          label="reps"
                                        />
                                      )}
                                      {block.load && (
                                        <PrescriptionPill
                                          value={block.load}
                                          label="kg"
                                        />
                                      )}
                                    </div>
                                  )}

                                  {/* Mark done button */}
                                  <button
                                    onClick={(e) => handleToggle(e, block.id)}
                                    disabled={isSaving}
                                    style={{
                                      width: "100%",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 8,
                                      padding: "9px 14px",
                                      borderRadius: 8,
                                      background: done
                                        ? "rgba(45,212,160,0.10)"
                                        : "rgba(255,255,255,0.04)",
                                      border: `1px solid ${done ? "rgba(45,212,160,0.25)" : "rgba(255,255,255,0.08)"}`,
                                      cursor: isSaving ? "default" : "pointer",
                                      transition: "background 0.15s, border 0.15s",
                                    }}
                                    aria-label={done ? "Merkja ólokið" : "Merkja lokið"}
                                  >
                                    {/* Circular indicator */}
                                    <div
                                      style={{
                                        width: 18,
                                        height: 18,
                                        borderRadius: "50%",
                                        background: done ? C.teal : "transparent",
                                        border: `2px solid ${done ? C.teal : "rgba(255,255,255,0.2)"}`,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                        transition:
                                          "background 0.15s, border 0.15s",
                                      }}
                                    >
                                      {done && (
                                        <svg
                                          width="10"
                                          height="10"
                                          fill="white"
                                          viewBox="0 0 20 20"
                                        >
                                          <path
                                            fillRule="evenodd"
                                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                            clipRule="evenodd"
                                          />
                                        </svg>
                                      )}
                                    </div>
                                    <span
                                      style={{
                                        fontSize: 13,
                                        fontWeight: 600,
                                        color: done ? C.teal : C.muted,
                                      }}
                                    >
                                      {done ? "Lokið" : "Merkja lokið"}
                                    </span>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Day complete card */}
          {allDone && (
            <div
              style={{
                marginTop: 16,
                background: "rgba(45,212,160,0.08)",
                border: "1px solid rgba(45,212,160,0.2)",
                borderRadius: 16,
                padding: 20,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "rgba(45,212,160,0.15)",
                    border: "1px solid rgba(45,212,160,0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg width="18" height="18" fill={C.teal} viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <p
                    style={{
                      fontFamily: "var(--font-bebas)",
                      fontSize: 22,
                      color: C.teal,
                      letterSpacing: "0.05em",
                      lineHeight: 1,
                    }}
                  >
                    Dagur lokinn!
                  </p>
                  <p style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
                    Þú hefur lokið öllum æfingum dagsins.
                  </p>
                </div>
              </div>

              {nextDay ? (
                <Link
                  href={`/courses/${courseSlug}/weeks/${nextDay.weekId}/days/${nextDay.id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: C.teal,
                    color: "#0a0c0f",
                    fontSize: 13,
                    fontWeight: 700,
                    padding: "12px 16px",
                    borderRadius: 10,
                    textDecoration: "none",
                    minHeight: 44,
                  }}
                >
                  <span>Næsti dagur: {nextDay.title}</span>
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              ) : (
                <Link
                  href={`/courses/${courseSlug}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: C.teal,
                    color: "#0a0c0f",
                    fontSize: 13,
                    fontWeight: 700,
                    padding: "12px 16px",
                    borderRadius: 10,
                    textDecoration: "none",
                    minHeight: 44,
                  }}
                >
                  <span>Til baka í námskeið</span>
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              )}
            </div>
          )}

          {/* Prev / Next navigation */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 20,
              paddingBottom: 8,
              gap: 8,
            }}
          >
            {prevDay ? (
              <Link
                href={`/courses/${courseSlug}/weeks/${prevDay.weekId}/days/${prevDay.id}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 500,
                  color: C.muted,
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  padding: "10px 14px",
                  borderRadius: 10,
                  textDecoration: "none",
                  minHeight: 44,
                }}
              >
                <svg
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Fyrri dagur
              </Link>
            ) : (
              <Link
                href={`/courses/${courseSlug}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 500,
                  color: C.muted,
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  padding: "10px 14px",
                  borderRadius: 10,
                  textDecoration: "none",
                  minHeight: 44,
                }}
              >
                <svg
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Til baka í námskeið
              </Link>
            )}

            {nextDay && (
              <Link
                href={`/courses/${courseSlug}/weeks/${nextDay.weekId}/days/${nextDay.id}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 500,
                  color: C.muted,
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  padding: "10px 14px",
                  borderRadius: 10,
                  textDecoration: "none",
                  minHeight: 44,
                }}
              >
                Næsti dagur
                <svg
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            )}
          </div>
        </main>
      </div>

      {/* Exercise video modal */}
      {activeExercise && (
        <ExerciseVideoModal
          exercise={activeExercise}
          onClose={() => setActiveExercise(null)}
        />
      )}
    </>
  );
}
