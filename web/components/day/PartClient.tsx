"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronLeft } from "lucide-react";
import type { DbExercise, DbTask } from "@/types";
import {
  exerciseBlocks,
  formatApproxMinutes,
  isPartDone,
  partInstructions,
  partProgress,
  partTotalSeconds,
  type DayView,
} from "@/lib/dayLogic";
import { useBlockProgress } from "@/components/day/useBlockProgress";
import DayStrip from "@/components/day/DayStrip";
import DayProgress from "@/components/day/DayProgress";
import InstructionsBox from "@/components/day/InstructionsBox";
import NoteRow from "@/components/day/NoteRow";
import PartExerciseCard from "@/components/day/PartExerciseCard";
import PrevNextNav from "@/components/day/PrevNextNav";
import VideoPlayer from "@/components/VideoPlayer";
import ExerciseVideoModal from "@/components/ExerciseVideoModal";

/** One part of the day: instructions, optional video, exercises, prev/next part. */
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
  /** Parts marked done as a whole (task_progress). Read-only until the part's "Merkja lokið" lands. */
  completedTaskIds: string[];
}) {
  const { completedIds, saving, toggle } = useBlockProgress(view.userId, initialCompletedBlockIds);
  const completedTasks = new Set(completedTaskIds);
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
          <div style={{ borderRadius: 14, overflow: "hidden", marginBottom: 14, background: "var(--surface)" }}>
            <VideoPlayer url={part.video_url} title={part.name} />
          </div>
        )}

        {instructions.text && <InstructionsBox text={instructions.text} />}

        {exercises.length > 0 && (
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginTop: 24, marginBottom: 10 }}>
            <h2 style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted2)" }}>
              Æfingar í {part.name} ({exercises.length})
            </h2>
            {seconds !== null && (
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
              />
            );
          })}
        </div>

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
