"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronLeft } from "lucide-react";
import type { DbExercise, DbTask } from "@/types";
import {
  exerciseBlocks,
  formatApproxMinutes,
  isPartDone,
  isWholePart,
  partInstructions,
  partProgress,
  partTotalSeconds,
  type DayView,
} from "@/lib/dayLogic";
import { useBlockProgress } from "@/components/day/useBlockProgress";
import { useTaskProgress } from "@/components/day/useTaskProgress";
import DayStrip from "@/components/day/DayStrip";
import DayProgress from "@/components/day/DayProgress";
import InstructionsBox from "@/components/day/InstructionsBox";
import NoteRow from "@/components/day/NoteRow";
import PartExerciseCard from "@/components/day/PartExerciseCard";
import PrevNextNav from "@/components/day/PrevNextNav";
import VideoPlayer from "@/components/VideoPlayer";
import ExerciseVideoModal from "@/components/ExerciseVideoModal";

/**
 * One part of the day: instructions, optional video, exercises, prev/next part.
 *
 * Two ways a part is completed (lib/dayLogic.ts → isWholePart):
 * - exercise by exercise ("Merkja lokið" on each card), or
 * - as a whole — a video part, or a part with no exercise blocks — by one
 *   "Merkja lokið" for the part. A video part's tagged exercises are reference.
 */
export default function PartClient({
  view,
  parts,
  partIndex,
  initialCompletedBlockIds,
  completedTaskIds,
}: {
  view: DayView;
  parts: DbTask[];
  partIndex: number;
  initialCompletedBlockIds: string[];
  /** Parts marked done as a whole (task_progress). */
  completedTaskIds: string[];
}) {
  const { completedIds, saving, toggle } = useBlockProgress(view.userId, initialCompletedBlockIds);
  const { completedTaskIds: completedTasks, savingTask, failedTask, toggleTask } = useTaskProgress(
    view.userId,
    completedTaskIds
  );
  const [activeExercise, setActiveExercise] = useState<DbExercise | null>(null);

  const part = parts[partIndex];
  const partHref = (p: DbTask) => `${view.dayHref}/tasks/${p.id}`;
  const prevPart = partIndex > 0 ? parts[partIndex - 1] : null;
  const nextPart = partIndex < parts.length - 1 ? parts[partIndex + 1] : null;

  const { done, total } = partProgress(parts, completedIds, completedTasks);
  const partDone = isPartDone(part, completedIds, completedTasks);
  const exercises = exerciseBlocks(part);
  const seconds = partTotalSeconds(part);
  const instructions = partInstructions(part);
  const isVideo = Boolean(part.video_url);
  const whole = isWholePart(part);
  const wholeDone = completedTasks.has(part.id);

  let exerciseNumber = 0;

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "16px 16px 96px" }}>
        <Link
          href={view.dayHref}
          style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--muted2)", textDecoration: "none" }}
        >
          <ChevronLeft size={16} />
          Til baka í dagsyfirlit
        </Link>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 12 }}>
          <div style={{ minWidth: 0, overflow: "hidden" }}>
            <DayStrip days={view.weekDays} compact />
          </div>
          <DayProgress done={done} total={total} compact />
        </div>

        <header style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 20, marginBottom: 14 }}>
          <h1 style={{ fontFamily: "var(--font-bebas)", fontSize: 34, lineHeight: 1.05, color: "var(--text)", minWidth: 0 }}>
            {part.name}
          </h1>
          {partDone && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                flexShrink: 0,
                fontSize: 11,
                fontWeight: 700,
                color: "var(--success)",
                background: "var(--success-dim)",
                border: "1px solid var(--success)",
                borderRadius: 999,
                padding: "3px 9px",
              }}
            >
              <Check size={12} strokeWidth={2.5} />
              Lokið
            </span>
          )}
        </header>

        {part.video_url && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ borderRadius: 14, overflow: "hidden", background: "var(--surface)" }}>
              <VideoPlayer url={part.video_url} title={part.name} />
            </div>
            {seconds !== null && (
              <p style={{ fontSize: 12, color: "var(--muted2)", marginTop: 8 }}>
                Myndband · {formatApproxMinutes(seconds)}
              </p>
            )}
          </div>
        )}

        {instructions.text && <InstructionsBox text={instructions.text} />}

        {exercises.length > 0 && (
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginTop: 24, marginBottom: 10 }}>
            <h2 style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted2)" }}>
              {isVideo ? "Æfingar í myndbandinu" : `Æfingar í ${part.name}`} ({exercises.length})
            </h2>
            {seconds !== null && !isVideo && (
              <span style={{ fontSize: 12, color: "var(--muted2)", flexShrink: 0 }}>
                {formatApproxMinutes(seconds)} heildartími
              </span>
            )}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: exercises.length > 0 ? 0 : 16 }}>
          {part.blocks.map((block) => {
            if (block.type === "text") {
              // Used as the Leiðbeiningar fallback → don't repeat it here
              if (instructions.fromTextBlocks || !block.content?.trim()) return null;
              return <NoteRow key={block.id} text={block.content.trim()} />;
            }
            exerciseNumber += 1;
            return (
              <PartExerciseCard
                key={block.id}
                block={block}
                number={exerciseNumber}
                done={completedIds.has(block.id)}
                saving={saving === block.id}
                onToggleDone={(e) => toggle(e, block.id)}
                onPlay={setActiveExercise}
                referenceOnly={isVideo}
              />
            );
          })}
        </div>

        {whole && (
          <div style={{ marginTop: 24 }}>
            <button
              type="button"
              onClick={(e) => toggleTask(e, part.id)}
              disabled={savingTask === part.id}
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: 14,
                fontSize: 15,
                fontWeight: 700,
                cursor: savingTask === part.id ? "default" : "pointer",
                opacity: savingTask === part.id ? 0.6 : 1,
                ...(wholeDone
                  ? { background: "var(--success-dim)", color: "var(--success)", border: "1px solid var(--success)" }
                  : { background: "var(--accent)", color: "var(--bg)", border: "1px solid var(--accent)" }),
              }}
            >
              {savingTask === part.id ? "Vistar…" : wholeDone ? "Lokið ✓ — afmerkja" : "Merkja lokið"}
            </button>
            {failedTask === part.id && (
              <p role="alert" style={{ fontSize: 12, color: "var(--muted2)", marginTop: 8, textAlign: "center" }}>
                Tókst ekki að vista. Reyndu aftur.
              </p>
            )}
          </div>
        )}

        <PrevNextNav
          prev={prevPart ? { href: partHref(prevPart), label: "Fyrri liður", title: prevPart.name } : null}
          next={
            nextPart
              ? { href: partHref(nextPart), label: "Næsti liður", title: nextPart.name }
              : { href: view.dayHref, label: "Ljúka degi", title: view.day.title }
          }
        />
      </main>

      {activeExercise && (
        <ExerciseVideoModal exercise={activeExercise} onClose={() => setActiveExercise(null)} />
      )}
    </div>
  );
}
