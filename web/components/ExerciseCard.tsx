"use client";

import { useState } from "react";
import type { DbExercise } from "@/types";
import ExerciseVideoModal from "@/components/ExerciseVideoModal";

interface Props {
  exercise: DbExercise;
  compact?: boolean;
}

const categoryColors: Record<string, string> = {
  Styrkur: "bg-blue-100 text-blue-800",
  Þyngdartap: "bg-orange-100 text-orange-800",
  "Liðleiki & hreyfigeta": "bg-green-100 text-green-800",
  "Heilsa & endurnæring": "bg-teal-100 text-teal-800",
  Endurhæfing: "bg-purple-100 text-purple-800",
};

export default function ExerciseCard({ exercise, compact }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const colorClass =
    categoryColors[exercise.category] ?? "bg-zinc-100 text-zinc-800";

  return (
    <>
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-zinc-100">
        {/* Thumbnail — click opens modal */}
        <button
          onClick={() => setModalOpen(true)}
          className="relative w-full bg-zinc-900 flex items-center justify-center group"
          style={{ paddingTop: "56.25%" }}
          aria-label={`Watch ${exercise.name}`}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center group-hover:bg-white transition-colors shadow">
              <svg
                className="w-5 h-5 text-zinc-900 ml-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
            </div>
          </div>
        </button>

        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-1">
            {/* Clickable name also opens modal */}
            <button
              onClick={() => setModalOpen(true)}
              className={`font-semibold text-zinc-900 text-left hover:text-zinc-600 transition-colors ${
                compact ? "text-sm" : "text-base"
              }`}
            >
              {exercise.name}
            </button>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${colorClass}`}
            >
              {exercise.category}
            </span>
          </div>
          {!compact && exercise.description && (
            <p className="text-sm text-zinc-500 leading-relaxed">
              {exercise.description}
            </p>
          )}
        </div>
      </div>

      {modalOpen && (
        <ExerciseVideoModal
          exercise={exercise}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
