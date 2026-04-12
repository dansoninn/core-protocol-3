"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import ExerciseVideoModal from "@/components/ExerciseVideoModal";
import VideoPlayer from "@/components/VideoPlayer";
import type { DbTask, DbExercise } from "@/types";

interface DayProps {
  id: string;
  title: string;
  description: string | null;
}

interface Props {
  courseSlug: string;
  courseTitle: string;
  weekTitle: string;
  weekId: string;
  day: DayProps;
  tasks: DbTask[];
  userId: string;
  initialCompletedBlockIds: string[];
  nextDay: { id: string; title: string } | null;
}

export default function DayClient({
  courseSlug,
  courseTitle,
  weekTitle,
  weekId,
  day,
  tasks,
  userId,
  initialCompletedBlockIds,
  nextDay,
}: Props) {
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(
    tasks[0]?.id ?? null
  );
  const [completedIds, setCompletedIds] = useState<Set<string>>(
    new Set(initialCompletedBlockIds)
  );
  const [saving, setSaving] = useState<string | null>(null);
  const [activeExercise, setActiveExercise] = useState<DbExercise | null>(null);

  const allExerciseBlocks = tasks.flatMap((t) =>
    t.blocks.filter((b) => b.type === "exercise")
  );
  const allDone =
    allExerciseBlocks.length > 0 &&
    allExerciseBlocks.every((b) => completedIds.has(b.id));

  const handleToggle = async (blockId: string) => {
    if (saving) return;
    setSaving(blockId);
    const supabase = createClient();
    const isDone = completedIds.has(blockId);

    if (isDone) {
      await supabase
        .from("progress")
        .delete()
        .eq("user_id", userId)
        .eq("block_id", blockId);
      setCompletedIds((prev) => {
        const next = new Set(prev);
        next.delete(blockId);
        return next;
      });
    } else {
      await supabase
        .from("progress")
        .insert({ user_id: userId, block_id: blockId });
      setCompletedIds((prev) => {
        const next = new Set(prev);
        next.add(blockId);
        return next;
      });
    }
    setSaving(null);
  };

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6 pb-24 md:pb-10">
      {/* Breadcrumb */}
      <nav className="text-sm text-zinc-500 flex items-center gap-1.5 flex-wrap">
        <Link
          href={`/courses/${courseSlug}`}
          className="hover:text-zinc-800 transition-colors"
        >
          {courseTitle}
        </Link>
        <span>/</span>
        <span className="text-zinc-400">{weekTitle}</span>
        <span>/</span>
        <span className="text-zinc-800 font-medium">{day.title}</span>
      </nav>

      {/* Day header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900">
          {day.title}
        </h1>
        {day.description && (
          <p className="mt-2 text-zinc-500 text-sm leading-relaxed whitespace-pre-line">
            {day.description}
          </p>
        )}
      </div>

      {/* Task accordion */}
      {tasks.length === 0 ? (
        <p className="text-zinc-400 text-sm text-center py-10">
          Engar æfingar fundust fyrir þennan dag.
        </p>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const isExpanded = expandedTaskId === task.id;
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
                style={{
                  borderLeftColor: task.color,
                  borderLeftWidth: "3px",
                }}
              >
                {/* Accordion header */}
                <button
                  onClick={() =>
                    setExpandedTaskId(isExpanded ? null : task.id)
                  }
                  className="w-full flex items-center justify-between px-5 py-4 text-left min-h-[52px]"
                  aria-expanded={isExpanded}
                >
                  <span className="font-semibold text-zinc-800 text-sm">
                    {task.name}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {taskComplete && (
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        style={{ color: task.color }}
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                    {taskTotal > 0 && (
                      <span
                        className={`text-xs font-medium tabular-nums ${
                          taskComplete ? "text-zinc-400" : "text-zinc-400"
                        }`}
                      >
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
                      <div className="p-4 border-b border-zinc-50 bg-black rounded-none">
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

                          // Exercise block
                          if (!block.exercises) return null;
                          const ex = block.exercises;
                          const done = completedIds.has(block.id);
                          const isSaving = saving === block.id;

                          // Build prescription string
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
                              className="flex items-center gap-3 px-5 py-3.5 min-h-[52px]"
                            >
                              {/* Checkbox */}
                              <button
                                onClick={() => handleToggle(block.id)}
                                disabled={isSaving}
                                className={`w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                                  done
                                    ? "border-zinc-900 bg-zinc-900"
                                    : "border-zinc-300 hover:border-zinc-500"
                                } ${isSaving ? "opacity-50" : ""}`}
                                aria-label={
                                  done ? "Merkja ólokið" : "Merkja lokið"
                                }
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
                                onClick={() => setActiveExercise(ex)}
                                className="flex-1 flex items-center justify-between gap-3 text-left group min-w-0"
                              >
                                <div className="min-w-0">
                                  <p
                                    className={`text-sm font-semibold truncate transition-colors ${
                                      done
                                        ? "text-zinc-400 line-through opacity-60"
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
                                      <span className="text-xs text-zinc-400">
                                        {prescription}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {ex.video_url && (
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
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center shrink-0">
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
              <p className="font-bold text-green-800">Dagur lokinn!</p>
              <p className="text-xs text-green-600 mt-0.5">
                Þú hefur lokið öllum æfingum dagsins.
              </p>
            </div>
          </div>
          {nextDay ? (
            <Link
              href={`/courses/${courseSlug}/weeks/${weekId}/days/${nextDay.id}`}
              className="flex items-center justify-between w-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-3 rounded-xl transition-colors min-h-[44px]"
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
              className="flex items-center justify-between w-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-3 rounded-xl transition-colors min-h-[44px]"
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

      {/* Exercise video modal */}
      {activeExercise && (
        <ExerciseVideoModal
          exercise={activeExercise}
          onClose={() => setActiveExercise(null)}
        />
      )}

      {/* Back link */}
      <div className="pb-4">
        <Link
          href={`/courses/${courseSlug}`}
          className="text-sm text-zinc-500 hover:text-zinc-800 flex items-center gap-1.5 transition-colors"
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
      </div>
    </main>
  );
}
