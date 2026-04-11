"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { Course, DayLesson, Exercise } from "@/types";
import {
  hasPurchased,
  isDayComplete,
  toggleDayComplete,
} from "@/lib/storage";
import VideoPlayer from "@/components/VideoPlayer";
import ExerciseVideoModal from "@/components/ExerciseVideoModal";

interface Props {
  course: Course;
  day: DayLesson;
  weekTitle: string;
  exercises: Exercise[];
}

export default function DayClient({ course, day, weekTitle, exercises }: Props) {
  const [purchased, setPurchased] = useState(false);
  const [complete, setComplete] = useState(false);
  const [checked, setChecked] = useState(false);
  const [activeExercise, setActiveExercise] = useState<Exercise | null>(null);

  useEffect(() => {
    const p = hasPurchased(course.id);
    const isFree = day.isFreePreview;
    setPurchased(p || !!isFree);
    const c = isDayComplete(day.id);
    setComplete(c);
    setChecked(c);
  }, [course.id, day.id, day.isFreePreview]);

  const handleToggle = () => {
    toggleDayComplete(day.id);
    const now = !checked;
    setChecked(now);
    setComplete(now);
  };

  if (!purchased) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-20 text-center">
        <svg
          className="w-12 h-12 text-zinc-300 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <h1 className="text-xl font-bold text-zinc-800 mb-2">
          Þú þarft að kaupa námskeiðið
        </h1>
        <p className="text-zinc-500 mb-6">
          Þessi dagur er aðeins aðgengilegur eftir kaup.
        </p>
        <Link
          href={`/courses/${course.slug}`}
          className="inline-block bg-zinc-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-zinc-700 transition-colors"
        >
          Fara í námskeið
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-zinc-500 flex items-center gap-1.5 flex-wrap">
        <Link href="/" className="hover:text-zinc-800">Forsíða</Link>
        <span>/</span>
        <Link href={`/courses/${course.slug}`} className="hover:text-zinc-800">
          {course.title}
        </Link>
        <span>/</span>
        <span className="text-zinc-800">{day.title}</span>
      </nav>

      {/* Week label + Day title */}
      <div>
        <p className="text-sm text-zinc-500 mb-1">{weekTitle}</p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900">
          {day.title}
        </h1>
        {complete && (
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
      <section className="bg-black rounded-2xl overflow-hidden">
        <VideoPlayer url={day.videoUrl} title={day.title} />
      </section>

      {/* Workout text */}
      <section className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
        <h2 className="text-lg font-bold text-zinc-900 mb-4">Æfing dagsins</h2>
        <div className="text-zinc-700 text-sm leading-relaxed whitespace-pre-line">
          {day.workoutText}
        </div>
      </section>

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
                  <p className="font-semibold text-zinc-900 text-sm truncate">{ex.name}</p>
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

      {/* Mark complete */}
      <section className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={checked}
            onChange={handleToggle}
            className="sr-only"
          />
          <div
            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${
              checked
                ? "bg-zinc-900 border-zinc-900"
                : "border-zinc-300 group-hover:border-zinc-500"
            }`}
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

      {/* Back */}
      <div className="pb-8">
        <Link
          href={`/courses/${course.slug}`}
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
