// Pure day-view logic, shared by server pages and client components.
// No server or browser imports here.

import type { DbTask, TaskFormat } from "@/types";

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

/** What a completion check needs. Full DbTask rows and the light id/type rows of the course pages both fit. */
export interface PartLike {
  id: string;
  blocks: readonly { id: string; type: string }[];
}

export function exerciseBlocks<B extends { type: string }>(part: { blocks: readonly B[] }): B[] {
  return part.blocks.filter((b) => b.type === "exercise");
}

/**
 * The one completion rule (STATUS.md → Decided). A part is done when it has a
 * task_progress row, or it has ≥1 exercise block and all of them are in
 * progress. Every part is completable — a part without exercise blocks (e.g.
 * a video part) is completed by its task_progress row.
 */
export function isPartDone(
  part: PartLike,
  completedBlockIds: ReadonlySet<string>,
  completedTaskIds: ReadonlySet<string>
): boolean {
  if (completedTaskIds.has(part.id)) return true;
  const ex = exerciseBlocks(part);
  return ex.length > 0 && ex.every((b) => completedBlockIds.has(b.id));
}

/** "{done} / {total} liðir" — every part counts. */
export function partProgress(
  parts: readonly PartLike[],
  completedBlockIds: ReadonlySet<string>,
  completedTaskIds: ReadonlySet<string>
) {
  return {
    done: parts.filter((p) => isPartDone(p, completedBlockIds, completedTaskIds)).length,
    total: parts.length,
  };
}

/**
 * A day is done when every part is done. A day with no parts is never done —
 * as the unlock check had it before step 3b — so it also stops every later
 * day from unlocking.
 * Feeds computeUnlockedDayIds on the course overview and in lib/dayAccess.ts.
 */
export function isDayDone(
  parts: readonly PartLike[],
  completedBlockIds: ReadonlySet<string>,
  completedTaskIds: ReadonlySet<string>
): boolean {
  return (
    parts.length > 0 &&
    parts.every((p) => isPartDone(p, completedBlockIds, completedTaskIds))
  );
}

// ─── Time ─────────────────────────────────────────────────────────────────────

/** max(1, sets) — sets is free text ("3", "3-4"), so take the leading number. */
export function parseSets(sets: string | null | undefined): number {
  const n = parseInt(sets ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/**
 * A part completed as a whole by one "Merkja lokið" (a task_progress row):
 * a video part — its tagged exercises are reference only — or a part with no
 * exercise blocks. Every other part is completed exercise by exercise.
 */
export function isWholePart(part: Pick<DbTask, "blocks" | "video_url">): boolean {
  return Boolean(part.video_url) || exerciseBlocks(part).length === 0;
}

/**
 * A part's total time in seconds, or null when it cannot be known.
 *
 * Video part: the Mux duration (tasks.video_duration_sec, STATUS.md →
 * Decided) — null until it is saved on upload or backfilled. Its reference
 * exercises are never summed; that would show the wrong number.
 *
 * Otherwise, from the format (formatSummary) when the format fixes the time —
 * AMRAP, EMOM, Tabata, interval, rounds. "sets" (and "rounds" without a fixed
 * exercise time) falls back to the exercise sum:
 * Σ duration_sec × max(1, sets) + rest_sec, null when no block has a duration.
 * For time / ladder / chipper end when the work is done: only a cap is known,
 * so null — the cap is shown as a tile instead.
 */
export function partTotalSeconds(
  part: Pick<
    DbTask,
    "blocks" | "video_url" | "video_duration_sec" | "format" | "work_sec" | "rest_sec" | "rounds" | "time_cap_sec" | "rep_scheme"
  >
): number | null {
  if (part.video_url) {
    return part.video_duration_sec && part.video_duration_sec > 0 ? part.video_duration_sec : null;
  }
  return formatSummary(part).totalSec;
}

/** Σ duration_sec × max(1, sets) + rest_sec over the exercise blocks; null when none has a duration. */
function exerciseSumSeconds(part: Pick<DbTask, "blocks">): number | null {
  const ex = exerciseBlocks(part);
  if (!ex.some((b) => (b.duration_sec ?? 0) > 0)) return null;
  return ex.reduce(
    (sum, b) => sum + (b.duration_sec ?? 0) * parseSets(b.sets) + (b.rest_sec ?? 0),
    0
  );
}

// ─── Format ───────────────────────────────────────────────────────────────────

export interface FormatTile {
  key: string;
  /** "12 mín", "20 sek.", "8", "21-15-9" */
  value: string;
  /** "Lengd", "Vinna", "Hringir"… — the same words as the admin's TaskSettings. */
  label: string;
}

export interface FormatSummary {
  /** "AMRAP", "EMOM"… — null for "sets", which shows no tiles. */
  name: string | null;
  tiles: FormatTile[];
  totalSec: number | null;
}

const FORMAT_NAMES: Record<TaskFormat, string | null> = {
  sets: null,
  amrap: "AMRAP",
  emom: "EMOM",
  tabata: "Tabata",
  for_time: "Á tíma",
  rounds: "Hringir",
  interval: "Interval",
  ladder: "Stigi",
  chipper: "Chipper",
};

const pos = (n: number | null | undefined): n is number => typeof n === "number" && n > 0;

/**
 * What the part page shows above the instructions: the format's name and one
 * tile per parameter that is set, plus the total time the format implies.
 * Parameters per format mirror components/admin/TaskSettings.tsx.
 */
export function formatSummary(
  part: Pick<DbTask, "blocks" | "format" | "work_sec" | "rest_sec" | "rounds" | "time_cap_sec" | "rep_scheme">
): FormatSummary {
  const { format, work_sec: work, rest_sec: rest, rounds, time_cap_sec: cap } = part;
  const scheme = part.rep_scheme?.trim() || null;
  const tiles: FormatTile[] = [];
  const add = (key: string, value: string, label: string) => tiles.push({ key, value, label });
  let totalSec: number | null = null;

  switch (format) {
    case "amrap":
      if (pos(cap)) {
        add("cap", formatDurationLabel(cap), "Lengd");
        totalSec = cap;
      }
      break;
    case "emom":
      if (pos(work)) add("work", formatDurationLabel(work), "Bil");
      if (pos(rounds)) add("rounds", String(rounds), "Hringir");
      if (pos(work) && pos(rounds)) totalSec = work * rounds;
      break;
    case "tabata":
    case "interval":
      if (pos(work)) add("work", formatDurationLabel(work), "Vinna");
      if (pos(rest)) add("rest", formatDurationLabel(rest), "Hvíld");
      if (pos(rounds)) add("rounds", String(rounds), "Hringir");
      if (pos(work) && pos(rounds)) totalSec = (work + (rest ?? 0)) * rounds;
      break;
    case "rounds": {
      if (pos(rounds)) add("rounds", String(rounds), "Hringir");
      if (pos(rest)) add("rest", formatDurationLabel(rest), "Hvíld");
      const perRound = exerciseSumSeconds(part);
      if (perRound !== null && pos(rounds)) totalSec = perRound * rounds + (rest ?? 0) * (rounds - 1);
      break;
    }
    case "for_time":
      if (pos(rounds)) add("rounds", String(rounds), "Hringir");
      if (pos(cap)) add("cap", formatDurationLabel(cap), "Tímamörk");
      break;
    case "ladder":
      if (scheme) add("scheme", scheme, "Endurtekningar");
      if (pos(cap)) add("cap", formatDurationLabel(cap), "Tímamörk");
      break;
    case "chipper":
      if (pos(cap)) add("cap", formatDurationLabel(cap), "Tímamörk");
      break;
    case "sets":
    default:
      totalSec = exerciseSumSeconds(part);
  }

  return { name: FORMAT_NAMES[format] ?? null, tiles, totalSec };
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

// ─── Grouping (superset / complex) ────────────────────────────────────────────

type LayoutBlock = DbTask["blocks"][number];

export type PartLayoutItem =
  | { kind: "note"; block: LayoutBlock }
  | { kind: "exercise"; block: LayoutBlock; label: string }
  | {
      kind: "group";
      /** "A" — the block's group_label, trimmed and upper-cased. */
      label: string;
      items: { block: LayoutBlock; label: string }[];
      /** Rest after the whole group: the last block's rest_sec (DbBlock.rest_sec). */
      restSec: number | null;
    };

/**
 * The part's blocks in order, with consecutive exercise blocks that share a
 * group_label gathered into one group labelled A1, A2… (superset / complex —
 * a grouping, not a format; STATUS.md → Decided). A run is broken by a text
 * block or a different label; a label on a single block is not a group.
 * Ungrouped exercises are numbered 1, 2… among themselves.
 * `skipText` drops text blocks (they were used as the Leiðbeiningar fallback).
 */
export function layoutPartBlocks(blocks: readonly LayoutBlock[], skipText: boolean): PartLayoutItem[] {
  const out: PartLayoutItem[] = [];
  let ungrouped = 0;
  const key = (b: LayoutBlock) => (b.type === "exercise" ? b.group_label?.trim().toUpperCase() || null : null);

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (block.type === "text") {
      if (!skipText && block.content?.trim()) out.push({ kind: "note", block });
      continue;
    }
    const label = key(block);
    let j = i;
    while (label && j + 1 < blocks.length && key(blocks[j + 1]) === label) j++;
    if (label && j > i) {
      const run = blocks.slice(i, j + 1);
      out.push({
        kind: "group",
        label,
        items: run.map((b, n) => ({ block: b, label: `${label}${n + 1}` })),
        restSec: pos(run[run.length - 1].rest_sec) ? run[run.length - 1].rest_sec : null,
      });
      i = j;
    } else {
      ungrouped += 1;
      out.push({ kind: "exercise", block, label: String(ungrouped) });
    }
  }
  return out;
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
  /** null when the day is locked — it must not be a link. Admins get an href even for locked days. */
  href: string | null;
  state: StripDayState;
}

export interface DayNavTarget {
  href: string;
  title: string;
}

export interface DayView {
  userId: string;
  /** Admins may open any day; locked days still look locked to them. */
  isAdmin: boolean;
  course: { id: string; title: string; slug: string };
  week: { id: string; title: string; number: number; total: number };
  day: { id: string; title: string; description: string | null; order_index: number };
  dayHref: string;
  weekDays: StripDay[];
  prevDay: DayNavTarget | null;
  nextDay: (DayNavTarget & { locked: boolean }) | null;
}
