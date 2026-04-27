"use client";

import { useEffect } from "react";
import MuxPlayer from "@mux/mux-player-react";
import type { DbExercise } from "@/types";

interface Props {
  exercise: DbExercise;
  onClose: () => void;
}

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
        style={{ background: "var(--bg)", borderRadius: 16 }}
        className="shadow-2xl w-full max-w-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: "var(--surface)",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
          }}
        >
          <h2 style={{ fontWeight: 700, color: "var(--text)", fontSize: 17, lineHeight: 1.35, paddingRight: 16 }}>
            {exercise.name}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--muted2)",
              flexShrink: 0,
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface2)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
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

        {/* Video */}
        {exercise.mux_playback_id ? (
          <MuxPlayer
            playbackId={exercise.mux_playback_id}
            streamType="on-demand"
            style={{ width: "100%", aspectRatio: "16/9" }}
          />
        ) : (
          <div className="w-full bg-zinc-900 flex items-center justify-center h-48">
            <p className="text-zinc-500 text-sm">No video available</p>
          </div>
        )}

        {/* Description */}
        {exercise.description && (
          <div style={{ padding: "16px 20px" }}>
            <p style={{ fontSize: 13, color: "var(--muted2)", lineHeight: 1.6 }}>
              {exercise.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
