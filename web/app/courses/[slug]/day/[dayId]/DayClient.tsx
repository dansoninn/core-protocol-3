"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import VideoPlayer from "@/components/VideoPlayer";
import ExerciseVideoModal from "@/components/ExerciseVideoModal";
import type { DbExercise } from "@/types";

interface DayProps {
  id: string;
  title: string;
  video_url: string | null;
  workout_text: string | null;
  is_free_preview: boolean;
}

interface Props {
  courseSlug: string;
  courseTitle: string;
  weekTitle: string;
  day: DayProps;
  exercises: DbExercise[];
  userId: string | null;
  initialCompleted: boolean;
}

export default function DayClient({
  courseSlug,
  courseTitle,
  weekTitle,
  day,
  exercises,
  userId,
  initialCompleted,
}: Props) {
  const [checked, setChecked] = useState(initialCompleted);
  const [saving, setSaving] = useState(false);
  const [activeExercise, setActiveExercise] = useState<DbExercise | null>(null);

  const handleToggle = async () => {
    if (!userId || saving) return;
    const next = !checked;
    setChecked(next);
    setSaving(true);
    const supabase = createClient();
    await supabase.from("progress").upsert(
      { user_id: userId, day_id: day.id, completed: next },
      { onConflict: "user_id,day_id" }
    );
    setSaving(false);
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
        {checked && (
          <span className="inline-flex items-center gap-1.5 mt-2 text-sm font-semibold text-green-700 bg-green-50 px-3 py-1 rounded-full">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Lokið
          </span>
        )}
      </div>

      {/* Video */}
      {day.video_url && (
        <section className="bg-black rounded-2xl overflow-hidden">
          <VideoPlayer url={day.video_url} title={day.title} />
        </section>
      )}

      {/* Workout text */}
      {day.workout_text && (
        <section className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-zinc-900 mb-4">
            Æfing dagsins
          </h2>
          <div className="text-zinc-700 text-sm leading-relaxed whitespace-pre-line">
            {day.workout_text}
          </div>
        </section>
      )}

      {/* Exercises */}
      {exercises.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-zinc-900 mb-4">
            Æfingar dagsins
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {exercises.map((ex) => (
              <button
                key={ex.id}
                onClick={() => setActiveExercise(ex)}
                className="group bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all text-left"
              >
                <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-zinc-200 transition-colors">
                  <svg
                    className="w-5 h-5 text-zinc-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-zinc-900 text-sm truncate">
                    {ex.name}
                  </p>
                  <p className="text-xs text-zinc-500">{ex.category}</p>
                </div>
                <svg
                  className="w-4 h-4 text-zinc-400 shrink-0"
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
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Exercise video modal */}
      {activeExercise && (
        <ExerciseVideoModal
          exercise={activeExercise}
          onClose={() => setActiveExercise(null)}
        />
      )}

      {/* Mark complete — hidden for unauthenticated visitors */}
      {userId && (
        <section className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={checked}
              onChange={handleToggle}
              disabled={saving}
              className="sr-only"
            />
            <div
              className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${
                checked
                  ? "bg-zinc-900 border-zinc-900"
                  : "border-zinc-300 group-hover:border-zinc-500"
              } ${saving ? "opacity-50" : ""}`}
            >
              {checked && (
                <svg
                  className="w-3.5 h-3.5 text-white"
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
            </div>
            <span className="font-semibold text-zinc-800">Dagur lokið</span>
          </label>
        </section>
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
