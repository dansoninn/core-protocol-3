"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import ExerciseVideoModal from "@/components/ExerciseVideoModal";
import VideoPlayer from "@/components/VideoPlayer";
import type { DbTask, DbExercise } from "@/types";

const DAY_ABBREVS = ["MÁN", "ÞRI", "MIÐ", "FIM", "FÖS", "LAU", "SUN"];

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
  day: { id: string; title: string; description: string | null; order_index: number };
  tasks: DbTask[];
  userId: string;
  initialCompletedBlockIds: string[];
  prevDay: DayNavItem | null;
  nextDay: DayNavItem | null;
}

function ProgressRing({
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
        opacity="0.25"
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

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <div className="relative w-full h-56 sm:h-72 bg-zinc-900 overflow-hidden">
        {coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverImage}
            alt={courseTitle}
            className="absolute inset-0 w-full h-full object-cover opacity-40"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-black/80" />

        {/* Back button */}
        <div className="absolute top-4 left-4 z-10">
          <Link
            href={`/courses/${courseSlug}`}
            className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium transition-colors bg-black/30 hover:bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-sm"
          >
            <svg
              className="w-4 h-4"
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
          <div className="absolute top-4 right-4 z-10">
            <span className="inline-block text-[10px] font-bold bg-white/15 text-white px-2.5 py-1 rounded-full backdrop-blur-sm tracking-wider uppercase">
              {courseCategory}
            </span>
          </div>
        )}

        {/* Hero text */}
        <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-6 pb-5">
          <p className="text-white/60 text-xs font-semibold tracking-widest uppercase mb-1">
            Vika {weekNumber} / {totalWeeks}
          </p>
          <h1
            className="text-5xl sm:text-6xl text-white leading-none tracking-wide uppercase"
            style={{ fontFamily: "var(--font-bebas)" }}
          >
            {day.title}
          </h1>
          {courseInstructor && (
            <p className="text-white/50 text-xs mt-1.5">{courseInstructor}</p>
          )}
        </div>
      </div>

      {/* ── WEEK STRIP ───────────────────────────────────────────────────── */}
      {weekDays.length > 0 && (
        <div className="sticky top-16 md:top-0 z-20 bg-zinc-900 border-b border-zinc-800">
          <div className="flex items-center gap-1 px-3 py-2 overflow-x-auto max-w-2xl mx-auto">
            {weekDays.map((wd) => {
              const abbrev = DAY_ABBREVS[wd.order_index] ?? `D${wd.order_index + 1}`;
              const isCurrent = wd.id === day.id;
              return (
                <Link
                  key={wd.id}
                  href={`/courses/${courseSlug}/weeks/${weekId}/days/${wd.id}`}
                  className={`flex flex-col items-center px-3.5 py-1.5 rounded-lg transition-colors shrink-0 min-w-[48px] ${
                    isCurrent
                      ? "bg-white text-zinc-900"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                  }`}
                >
                  <span className="text-[10px] font-bold tracking-wider uppercase leading-none">
                    {abbrev}
                  </span>
                  <span
                    className={`text-[10px] font-medium mt-0.5 leading-none ${
                      isCurrent ? "text-zinc-500" : "text-zinc-600"
                    }`}
                  >
                    {wd.order_index + 1}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-4 pb-28 md:pb-12">

        {/* Day summary card */}
        {(day.description || totalExerciseCount > 0) && (
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
            {day.description && (
              <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-line mb-4">
                {day.description}
              </p>
            )}
            {totalExerciseCount > 0 && (
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-zinc-900 rounded-full transition-all duration-500"
                    style={{
                      width: `${(completedExerciseCount / totalExerciseCount) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-xs font-semibold text-zinc-500 tabular-nums whitespace-nowrap shrink-0">
                  {completedExerciseCount} / {totalExerciseCount} æfingar
                </span>
              </div>
            )}
          </div>
        )}

        {/* Task accordion */}
        {tasks.length === 0 ? (
          <p className="text-zinc-400 text-sm text-center py-10">
            Engar æfingar fundust fyrir þennan dag.
          </p>
        ) : (
          <div className="space-y-3">
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

              return (
                <div
                  key={task.id}
                  className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden"
                >
                  {/* Color accent bar */}
                  <div className="h-1 w-full" style={{ backgroundColor: task.color }} />

                  {/* Accordion header */}
                  <button
                    onClick={(e) => toggleTask(e, task.id)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left min-h-[54px]"
                    aria-expanded={isExpanded}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ProgressRing
                        done={taskDone}
                        total={taskTotal}
                        color={task.color}
                      />
                      <span
                        className={`font-semibold text-sm truncate ${
                          taskComplete ? "text-zinc-400" : "text-zinc-900"
                        }`}
                      >
                        {task.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {taskTotal > 0 && !taskComplete && (
                        <span className="text-xs font-medium tabular-nums text-zinc-400">
                          {taskDone}/{taskTotal}
                        </span>
                      )}
                      <svg
                        className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
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

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="border-t border-zinc-100">
                      {/* Task video */}
                      {task.video_url && (
                        <div className="bg-black">
                          <VideoPlayer url={task.video_url} title={task.name} />
                        </div>
                      )}

                      {/* Blocks */}
                      {task.blocks.length === 0 ? (
                        <p className="px-5 py-6 text-sm text-zinc-400 text-center">
                          Engar æfingar í þessum hóp.
                        </p>
                      ) : (
                        <div className="divide-y divide-zinc-50">
                          {task.blocks.map((block) => {
                            if (block.type === "text") {
                              return (
                                <div key={block.id} className="px-5 py-4">
                                  <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-line">
                                    {block.content}
                                  </p>
                                </div>
                              );
                            }

                            if (!block.exercises) return null;
                            const ex = block.exercises;
                            const done = completedIds.has(block.id);
                            const isSaving = saving === block.id;

                            const setsReps =
                              block.sets && block.reps
                                ? `${block.sets} × ${block.reps}`
                                : block.sets || block.reps || null;
                            const prescription = [setsReps, block.load]
                              .filter(Boolean)
                              .join(" — ");

                            return (
                              <div
                                key={block.id}
                                className="flex items-center gap-3 px-5 py-4 min-h-[56px]"
                              >
                                {/* Checkbox */}
                                <button
                                  onClick={(e) => handleToggle(e, block.id)}
                                  disabled={isSaving}
                                  className={`w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                                    done
                                      ? "border-transparent bg-zinc-900"
                                      : "border-zinc-300 hover:border-zinc-600"
                                  } ${isSaving ? "opacity-50" : ""}`}
                                  aria-label={done ? "Merkja ólokið" : "Merkja lokið"}
                                >
                                  {done && (
                                    <svg
                                      className="w-3 h-3 text-white"
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  )}
                                </button>

                                {/* Exercise info — click opens modal */}
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setActiveExercise(ex);
                                  }}
                                  className="flex-1 flex items-center justify-between gap-3 text-left group min-w-0"
                                >
                                  <div className="min-w-0">
                                    <p
                                      className={`text-sm font-semibold truncate transition-colors ${
                                        done
                                          ? "text-zinc-400 line-through"
                                          : "text-zinc-900 group-hover:text-zinc-600"
                                      }`}
                                    >
                                      {ex.name}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-500 uppercase tracking-wide">
                                        {ex.category}
                                      </span>
                                      {prescription && (
                                        <span className="text-xs text-zinc-400 font-medium">
                                          {prescription}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {ex.mux_playback_id && (
                                    <div className="w-8 h-8 rounded-xl bg-zinc-100 group-hover:bg-zinc-200 flex items-center justify-center transition-colors shrink-0">
                                      <svg
                                        className="w-4 h-4 text-zinc-600"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    </div>
                                  )}
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

        {/* Day complete banner */}
        {allDone && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                <svg
                  className="w-5 h-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <p className="font-bold text-emerald-800">Dagur lokinn!</p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  Þú hefur lokið öllum æfingum dagsins.
                </p>
              </div>
            </div>
            {nextDay ? (
              <Link
                href={`/courses/${courseSlug}/weeks/${nextDay.weekId}/days/${nextDay.id}`}
                className="flex items-center justify-between w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-3 rounded-xl transition-colors min-h-[44px]"
              >
                <span>Næsti dagur: {nextDay.title}</span>
                <svg
                  className="w-4 h-4"
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
            ) : (
              <Link
                href={`/courses/${courseSlug}`}
                className="flex items-center justify-between w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-3 rounded-xl transition-colors min-h-[44px]"
              >
                <span>Til baka í námskeið</span>
                <svg
                  className="w-4 h-4"
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
        )}

        {/* Prev/Next navigation */}
        <div className="flex items-center justify-between pt-2 pb-4">
          {prevDay ? (
            <Link
              href={`/courses/${courseSlug}/weeks/${prevDay.weekId}/days/${prevDay.id}`}
              className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 transition-colors min-h-[44px]"
            >
              <svg
                className="w-4 h-4"
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
              className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 transition-colors min-h-[44px]"
            >
              <svg
                className="w-4 h-4"
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
              className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 transition-colors min-h-[44px]"
            >
              Næsti dagur
              <svg
                className="w-4 h-4"
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
