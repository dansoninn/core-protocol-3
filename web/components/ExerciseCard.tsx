"use client";

import { useState } from "react";
import type { Exercise } from "@/types";

interface Props {
  exercise: Exercise;
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
  const [playing, setPlaying] = useState(false);
  const colorClass =
    categoryColors[exercise.category] || "bg-zinc-100 text-zinc-800";

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-zinc-100">
      <div className="relative w-full bg-zinc-900" style={{ paddingTop: "56.25%" }}>
        {playing ? (
          <video
            className="absolute inset-0 w-full h-full object-cover"
            src={exercise.videoUrl}
            autoPlay
            controls
            onEnded={() => setPlaying(false)}
          />
        ) : (
          <button
            onClick={() => setPlaying(true)}
            className="absolute inset-0 w-full h-full flex items-center justify-center group"
          >
            <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center group-hover:bg-white transition-colors shadow">
              <svg
                className="w-5 h-5 text-zinc-900 ml-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
            </div>
          </button>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className={`font-semibold text-zinc-900 ${compact ? "text-sm" : "text-base"}`}>
            {exercise.name}
          </h3>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${colorClass}`}>
            {exercise.category}
          </span>
        </div>
        {!compact && (
          <p className="text-sm text-zinc-500 leading-relaxed">{exercise.description}</p>
        )}
      </div>
    </div>
  );
}
