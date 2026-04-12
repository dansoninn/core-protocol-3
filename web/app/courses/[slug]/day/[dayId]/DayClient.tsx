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
  const [completedIds, setCompletedIds] = useState<Set<string>>(
    new Set(initialCompletedBlockIds)
  );
  const [saving, setSaving] = useState<string | null>(null);
  const [activeExercise, setActiveExercise] = useState<DbExercise | null>(null);

  const allBlockIds = tasks.flatMap((t) => t.blocks.map((b) => b.id));
  const allDone =
    allBlockIds.length > 0 && allBlockIds.every((id) => completedIds.has(id));

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
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-zinc-500 flex items-center gap-1.5 flex-wrap">
        <Link href="/" className="hover:text-zinc-800 transition-colors">
          Forsíða
        </Link>
        <span>/</span>
        <Link
          href={`/courses/${courseSlug}`}
          className="hover:text-zinc-800 transition-colors"
        >
          {courseTitle}
        </Link>
        <span>/</span>
        <span className="text-zinc-800">{day.title}</span>
      </nav>

      {/* Week label + title */}
      <div>
        <p className="text-sm text-zinc-500 mb-1">{weekTitle}</p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900">
          {day.title}
        </h1>
        {allDone && (
          <span className="inline-flex items-center gap-1.5 mt-2 text-sm font-semibold text-green-700 bg-green-50 px-3 py-1 rounded-full">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Dagur lokinn
          </span>
        )}
      </div>

      {/* Description */}
      {day.description && (
        <section className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
          <div className="text-zinc-700 text-sm leading-relaxed whitespace-pre-line">
            {day.description}
          </div>
        </section>
      )}

      {/* Tasks */}
      {tasks.length === 0 ? (
        <p className="text-zinc-400 text-sm text-center py-8">
          Engar æfingar fundust fyrir þennan dag.
        </p>
      ) : (
        <div className="space-y-6">
          {tasks.map((task) => (
            <section key={task.id}>
              {/* Task header */}
              <div
                className="flex items-center gap-2 mb-3 px-1"
              >
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: task.color }}
                />
                <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-wide">
                  {task.name}
                </h2>
              </div>

              {/* Blocks */}
              <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm divide-y divide-zinc-50">
                {task.blocks.map((block) => {
                  const done = completedIds.has(block.id);
                  const isSaving = saving === block.id;

                  return (
                    <div
                      key={block.id}
                      className="flex items-start gap-3 px-5 py-4"
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => handleToggle(block.id)}
                        disabled={isSaving}
                        className={`mt-0.5 w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
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

                      {/* Content */}
                      {block.type === "exercise" && block.exercises ? (
                        <button
                          onClick={() => setActiveExercise(block.exercises!)}
                          className="flex-1 text-left group"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p
                                className={`text-sm font-semibold transition-colors ${
                                  done
                                    ? "text-zinc-400 line-through"
                                    : "text-zinc-900 group-hover:text-zinc-600"
                                }`}
                              >
                                {block.exercises.name}
                              </p>
                              <p className="text-xs text-zinc-500 mt-0.5">
                                {block.exercises.category}
                              </p>
                            </div>
                            {block.exercises.video_url && (
                              <div className="w-8 h-8 rounded-lg bg-zinc-100 group-hover:bg-zinc-200 flex items-center justify-center transition-colors shrink-0">
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
                          </div>
                        </button>
                      ) : (
                        <p
                          className={`flex-1 text-sm leading-relaxed whitespace-pre-line ${
                            done ? "text-zinc-400 line-through" : "text-zinc-700"
                          }`}
                        >
                          {block.content}
                        </p>
                      )}
                    </div>
                  );
                })}

                {task.blocks.length === 0 && (
                  <p className="px-5 py-4 text-sm text-zinc-400">
                    Engar æfingar í þessum hóp.
                  </p>
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Exercise video modal */}
      {activeExercise && (
        <ExerciseVideoModal
          exercise={activeExercise}
          onClose={() => setActiveExercise(null)}
        />
      )}

      {/* Back */}
      <div className="pb-8">
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
