"use client";

import { useState } from "react";
import type { DbExercise } from "@/types";
import ExerciseVideoModal from "@/components/ExerciseVideoModal";

interface Props {
  exercise: DbExercise;
  compact?: boolean;
}

export default function ExerciseCard({ exercise }: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  const hasThumbnail = !!exercise.mux_playback_id;
  const thumbnailUrl = hasThumbnail
    ? `https://image.mux.com/${exercise.mux_playback_id}/thumbnail.jpg`
    : null;

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        aria-label={`Watch ${exercise.name}`}
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "4/3",
          borderRadius: 14,
          overflow: "hidden",
          border: "none",
          cursor: "pointer",
          padding: 0,
          display: "block",
          background: "var(--surface2)",
        }}
      >
        {/* Thumbnail or gradient fallback */}
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={exercise.name}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(135deg, var(--surface2), var(--surface3))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="white">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
            </div>
          </div>
        )}

        {/* Dark gradient overlay on bottom 60% */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)",
          }}
        />

        {/* Bottom overlay content */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "10px 10px 10px",
            textAlign: "left",
          }}
        >
          {/* Category badge */}
          <div
            style={{
              display: "inline-block",
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              background: "var(--accent-dim)",
              color: "var(--accent)",
              borderRadius: 4,
              padding: "2px 6px",
              marginBottom: 4,
            }}
          >
            {exercise.category}
          </div>

          {/* Exercise name */}
          <p
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#fff",
              lineHeight: 1.3,
              margin: 0,
              marginBottom: exercise.description ? 2 : 0,
            }}
          >
            {exercise.name}
          </p>

          {/* Description — 1 line */}
          {exercise.description && (
            <p
              style={{
                fontSize: 11,
                color: "var(--muted2)",
                margin: 0,
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              }}
            >
              {exercise.description}
            </p>
          )}
        </div>
      </button>

      {modalOpen && (
        <ExerciseVideoModal
          exercise={exercise}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
