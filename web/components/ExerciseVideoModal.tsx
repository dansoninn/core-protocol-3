"use client";

import { useEffect } from "react";
import type { DbExercise } from "@/types";

interface Props {
  exercise: DbExercise;
  onClose: () => void;
}

/**
 * Modal that embeds a YouTube iframe for the given exercise.
 * The video src is currently a YouTube embed URL — when moving to
 * Supabase Storage, swap the <iframe> for a <video> tag here.
 */
export default function ExerciseVideoModal({ exercise, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <h2 className="font-bold text-zinc-900 text-lg leading-snug pr-4">
            {exercise.name}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 transition-colors text-zinc-500 shrink-0"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Video — swap <iframe> for <video> when migrating to Supabase Storage */}
        {exercise.video_url ? (
          <div
            className="relative w-full bg-black"
            style={{ paddingTop: "56.25%" }}
          >
            <iframe
              src={`${exercise.video_url}?autoplay=1&rel=0`}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={exercise.name}
            />
          </div>
        ) : (
          <div className="w-full bg-zinc-900 flex items-center justify-center h-48">
            <p className="text-zinc-500 text-sm">No video available</p>
          </div>
        )}

        {/* Description */}
        {exercise.description && (
          <div className="px-5 py-4">
            <p className="text-sm text-zinc-600 leading-relaxed">
              {exercise.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
