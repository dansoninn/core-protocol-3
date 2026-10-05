// Pure day-view logic, shared by server pages and client components.
// No server or browser imports here.

import type { DbTask } from "@/types";

const DAY_ABBREVS = ["MÁN", "ÞRI", "MIÐ", "FIM", "FÖS", "LAU", "SUN"];

export function dayAbbrev(orderIndex: number): string {
  return DAY_ABBREVS[orderIndex] ?? `D${orderIndex + 1}`;
}

// ─── Unlocking ────────────────────────────────────────────────────────────────

/**
 * Sequential unlock: every day up to and including the first incomplete one.
 * `orderedDayIds` is course order (weeks by order_index, then days).
 *
 * Single source of truth for the course overview's lock display
 * (CourseClient) and the server-side check (lib/dayAccess.ts). If these two
 * ever disagreed, users would see an open day that the server refuses.
 */
export function computeUnlockedDayIds(
  orderedDayIds: string[],
  completedDayIds: ReadonlySet<string>
): Set<string> {
  const unlocked = new Set<string>();
  for (const id of orderedDayIds) {
    unlocked.add(id);
    if (!completedDayIds.has(id)) break;
  }
  return unlocked;
}

// ─── Parts and progress ───────────────────────────────────────────────────────

type PartLike = Pick<DbTask, "blocks">;

export function exerciseBlocks<T extends PartLike>(part: T): T["blocks"] {
  return part.blocks.filter((b) => b.type === "exercise");
}

/**
 * A part is done when all its exercise blocks are completed. Progress is
 * block-level, so a part with no exercise blocks can never be done — it is
 * left out of the "{done} / {total} liðir" count (open question for step 3b).
 */
export function isPartDone(part: PartLike, completed: ReadonlySet<string>): boolean {
  const ex = exerciseBlocks(part);
  return ex.length > 0 && ex.every((b) => completed.has(b.id));
}

export function partProgress(parts: PartLike[], completed: ReadonlySet<string>) {
  const countable = parts.filter((p) => exerciseBlocks(p).length > 0);
  return {
    done: countable.filter((p) => isPartDone(p, completed)).length,
    total: countable.length,
  };
}

// ─── Time ─────────────────────────────────────────────────────────────────────

/** max(1, sets) — sets is free text ("3", "3-4"), so take the leading number. */
export function parseSets(sets: string | null | undefined): number {
  const n = parseInt(sets ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/**
 * Σ duration_sec × max(1, sets) + rest_sec over the part's exercise blocks.
 * Null when no exercise block has a duration.
 *
 * Also null for a video part: its total time is the Mux video duration
 * (STATUS.md → Decided), which step 3b adds. Summing reference exercises
 * would show the wrong number.
 */
export function partTotalSeconds(part: Pick<DbTask, "blocks" | "video_url">): number | null {
  if (part.video_url) return null;
  const ex = exerciseBlocks(part);
  if (!ex.some((b) => (b.duration_sec ?? 0) > 0)) return null;
  return ex.reduce(
    (sum, b) => sum + (b.duration_sec ?? 0) * parseSets(b.sets) + (b.rest_sec ?? 0),
    0
  );
}

/** 540 → "~9 mín". Never "~0 mín". */
export function formatApproxMinutes(sec: number): string {
  return `~${Math.max(1, Math.round(sec / 60))} mín`;
}

/** 30 → "30 sek.", 120 → "2 mín", 90 → "1:30 mín". */
export function formatDurationLabel(sec: number): string {
  if (sec < 60) return `${sec} sek.`;
  if (sec % 60 === 0) return `${sec / 60} mín`;
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")} mín`;
}

// ─── Instructions ─────────────────────────────────────────────────────────────

/**
 * The "Leiðbeiningar" text: tasks.instructions, or — when that is empty — the
 * part's text blocks joined in order. `fromTextBlocks` tells the caller not to
 * render those text blocks again inline.
 */
export function partInstructions(
  part: Pick<DbTask, "instructions" | "blocks">
): { text: string | null; fromTextBlocks: boolean } {
  const own = part.instructions?.trim();
  if (own) return { text: own, fromTextBlocks: false };
  const joined = part.blocks
    .filter((b) => b.type === "text")
    .map((b) => b.content?.trim())
    .filter(Boolean)
    .join("\n\n");
  return { text: joined || null, fromTextBlocks: true };
}

// ─── Shapes passed from the server pages to the components ───────────────────

export type StripDayState = "current" | "done" | "open" | "locked";

export interface StripDay {
  id: string;
  order_index: number;
  /** null when the day is locked — it must not be a link. */
  href: string | null;
  state: StripDayState;
}

export interface DayNavTarget {
  href: string;
  title: string;
}

export interface DayView {
  userId: string;
  course: { id: string; title: string; slug: string };
  week: { id: string; title: string; number: number; total: number };
  day: { id: string; title: string; description: string | null; order_index: number };
  dayHref: string;
  weekDays: StripDay[];
  prevDay: DayNavTarget | null;
  nextDay: (DayNavTarget & { locked: boolean }) | null;
}
