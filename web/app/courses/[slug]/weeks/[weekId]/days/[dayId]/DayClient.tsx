"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import ExerciseVideoModal from "@/components/ExerciseVideoModal";
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
  day: DayProps;
  tasks: DbTask[];
  userId: string;
  initialCompletedBlockIds: string[];
}

export default function DayClient({
  courseSlug,
  courseTitle,
  weekTitle,
  day,
  tasks,
  userId,
  initialCompletedBlockIds,
}: Props) {
  const [activeTaskIdx, setActiveTaskIdx] = useState(0);
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

  const activeTask = tasks[activeTaskIdx] ?? null;

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6 pb-24 md:pb-8">
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

      {/* Task tab bar */}
      {tasks.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1 scrollbar-hide">
          {tasks.map((task, idx) => {
            const taskExBlocks = task.blocks.filter(
              (b) => b.type === "exercise"
            );
            const taskDone = taskExBlocks.filter((b) =>
              completedIds.has(b.id)
            ).length;
            const taskTotal = taskExBlocks.length;
            const isActive = idx === activeTaskIdx;
            const taskComplete = taskTotal > 0 && taskDone === taskTotal;

            return (
              <button
                key={task.id}
                onClick={() => setActiveTaskIdx(idx)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                  isActive
                    ? "text-white border-transparent shadow-sm"
                    : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300 hover:text-zinc-700"
                }`}
                style={isActive ? { backgroundColor: task.color } : {}}
              >
                {taskComplete && (
                  <svg
                    className="w-3 h-3 shrink-0"
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
                <span>{task.name}</span>
                {taskTotal > 0 && (
                  <span
                    className={`font-normal ${
                      isActive ? "opacity-75" : "text-zinc-400"
                    }`}
                  >
                    {taskDone}/{taskTotal}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Active task content */}
      {activeTask && (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
          {/* Color accent strip */}
          <div className="h-1" style={{ backgroundColor: activeTask.color }} />

          {activeTask.blocks.length === 0 ? (
            <p className="px-6 py-10 text-sm text-zinc-400 text-center">
              Engar æfingar í þessum hóp.
            </p>
          ) : (
            <div className="divide-y divide-zinc-50">
              {activeTask.blocks.map((block) => {
                if (block.type === "text") {
                  return (
                    <div key={block.id} className="px-6 py-4">
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

                return (
                  <div key={block.id} className="flex items-center gap-4 px-5 py-4">
                    {/* Checkbox */}
                    <button
                      onClick={() => handleToggle(block.id)}
                      disabled={isSaving}
                      className={`w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                        done
                          ? "bg-zinc-900 border-zinc-900"
                          : "border-zinc-300 hover:border-zinc-500"
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
                      onClick={() => setActiveExercise(ex)}
                      className="flex-1 flex items-center gap-3 text-left group min-w-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-semibold truncate transition-colors ${
                            done
                              ? "text-zinc-400 line-through"
                              : "text-zinc-900 group-hover:text-zinc-600"
                          }`}
                        >
                          {ex.name}
                        </p>
                        <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 uppercase tracking-wide">
                          {ex.category}
                        </span>
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

      {/* Day complete banner */}
      {allDone && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
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
              <p className="font-bold text-green-800 text-sm">Dagur lokinn!</p>
              <p className="text-xs text-green-600 mt-0.5">
                Þú hefur lokið öllum æfingum dagsins.
              </p>
            </div>
          </div>
          <Link
            href={`/courses/${courseSlug}`}
            className="text-sm font-semibold text-green-800 hover:text-green-900 flex items-center gap-1 transition-colors shrink-0"
          >
            Til baka
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
