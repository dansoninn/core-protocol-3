"use client";

import { useState, type MouseEvent } from "react";
import { Check, ChevronDown, Dumbbell, Play } from "lucide-react";
import type { DbBlock, DbExercise } from "@/types";
import PrescriptionList from "@/components/day/PrescriptionList";

/**
 * An exercise on the part page. Tap the card to expand (coach note, else the
 * bank description, then "Merkja lokið"). Tap the thumbnail to play the
 * explanation video — only when the exercise has one.
 *
 * `referenceOnly`: an exercise tagged on a video part. It is shown for
 * reference — numbered, never checked, no "Merkja lokið"; the part is
 * completed as a whole.
 */
export default function PartExerciseCard({
  block,
  number,
  done,
  saving,
  onToggleDone,
  onPlay,
  referenceOnly = false,
}: {
  block: DbBlock;
  /** "3", or "A1" inside a superset / complex. */
  number: number | string;
  done: boolean;
  saving: boolean;
  onToggleDone: (e: MouseEvent) => void;
  onPlay: (exercise: DbExercise) => void;
  referenceOnly?: boolean;
}) {
  const showDone = done && !referenceOnly;
  const note = block.content?.trim() || block.exercises?.description?.trim() || null;
  // A reference card with no note has nothing to expand.
  const expandable = Boolean(note) || !referenceOnly;
  const [open, setOpen] = useState(false);
  const exercise = block.exercises;
  const name = exercise?.name ?? "Æfing";
  // ExerciseVideoModal plays Mux only, so that is what makes the thumbnail tappable.
  const playable = Boolean(exercise?.mux_playback_id?.trim());

  return (
    <div
      style={{
        background: "var(--surface)",
        border: `1px solid ${open ? "var(--accent-line)" : "var(--border)"}`,
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: 14 }}>
        <span
          aria-label={showDone ? "Lokið" : undefined}
          style={{
            width: 26,
            height: 26,
            marginTop: 15,
            borderRadius: "50%",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-bebas)",
            fontSize: 15,
            background: showDone ? "var(--success-dim)" : "var(--surface2)",
            color: showDone ? "var(--success)" : "var(--muted2)",
            border: showDone ? "1px solid var(--success)" : "1px solid var(--border)",
          }}
        >
          {showDone ? <Check size={14} strokeWidth={2.5} /> : number}
        </span>

        <Thumbnail
          playbackId={playable ? exercise!.mux_playback_id : null}
          name={name}
          onPlay={(e) => {
            e.preventDefault();
            if (exercise) onPlay(exercise);
          }}
        />

        <button
          type="button"
          aria-expanded={expandable ? open : undefined}
          disabled={!expandable}
          onClick={(e) => {
            e.preventDefault();
            if (expandable) setOpen((v) => !v);
          }}
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            background: "none",
            border: "none",
            padding: 0,
            textAlign: "left",
            cursor: expandable ? "pointer" : "default",
            color: "inherit",
          }}
        >
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 15, fontWeight: 600, color: "var(--text)", lineHeight: 1.3 }}>
              {name}
            </span>
            {exercise?.category && (
              <span
                style={{
                  display: "inline-block",
                  marginTop: 5,
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--accent)",
                  background: "var(--accent-dim)",
                  borderRadius: 4,
                  padding: "2px 6px",
                }}
              >
                {exercise.category}
              </span>
            )}
            <PrescriptionList block={block} />
          </span>
          {expandable && (
            <ChevronDown
              size={18}
              style={{
                color: "var(--muted2)",
                flexShrink: 0,
                marginTop: 2,
                transform: open ? "rotate(180deg)" : "none",
                transition: "transform 0.15s",
              }}
            />
          )}
        </button>
      </div>

      {open && expandable && (
        <div style={{ padding: "0 14px 14px", borderTop: "1px solid var(--border)" }}>
          {note && (
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text)", whiteSpace: "pre-wrap", paddingTop: 12 }}>
              {note}
            </p>
          )}
          {!referenceOnly && (
            <button
              type="button"
              onClick={onToggleDone}
              disabled={saving}
              style={{
                marginTop: 12,
                width: "100%",
                padding: "12px 16px",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 700,
                cursor: saving ? "default" : "pointer",
                opacity: saving ? 0.6 : 1,
                ...(done
                  ? { background: "var(--success-dim)", color: "var(--success)", border: "1px solid var(--success)" }
                  : { background: "var(--accent)", color: "var(--bg)", border: "1px solid var(--accent)" }),
              }}
            >
              {saving ? "Vistar…" : done ? "Lokið ✓ — afmerkja" : "Merkja lokið"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Thumbnail({
  playbackId,
  name,
  onPlay,
}: {
  playbackId: string | null;
  name: string;
  onPlay: (e: MouseEvent) => void;
}) {
  const box = {
    width: 56,
    height: 56,
    borderRadius: 12,
    flexShrink: 0,
    overflow: "hidden",
    position: "relative" as const,
    background: "var(--surface2)",
    border: "1px solid var(--border)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  if (!playbackId) {
    return (
      <span style={box} aria-hidden="true">
        <Dumbbell size={20} style={{ color: "var(--muted2)" }} />
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onPlay}
      aria-label={`Spila útskýringarmyndband: ${name}`}
      style={{ ...box, padding: 0, cursor: "pointer" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- Mux thumbnail, same as ExerciseCard */}
      <img
        src={`https://image.mux.com/${playbackId}/thumbnail.jpg?width=112&height=112&fit_mode=smartcrop`}
        alt=""
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
      {/* Scrim over a photo, not a themed surface — fixed in both themes on purpose */}
      <span
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0,0,0,0.25)",
        }}
      >
        <Play size={16} fill="white" color="white" />
      </span>
    </button>
  );
}
