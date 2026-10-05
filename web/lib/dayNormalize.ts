// Normalises day-view rows from Supabase to the shapes declared in
// types/index.ts — once, at the data boundary — so components can rely on the
// declared types instead of guarding every value.
//
// Why: the live column types are not guaranteed to match the migration files.
// `ADD COLUMN IF NOT EXISTS` silently skips a column that already exists with
// another type (e.g. blocks.sets / reps created earlier as integers), and the
// day view crashed calling .trim() on a number. Pure module: no server or
// browser imports, so it can be tested on its own.

import type {
  BlockIntensity,
  BlockSide,
  DbBlock,
  DbExercise,
  DbTask,
  TaskFormat,
} from "@/types";

const TASK_FORMATS: readonly TaskFormat[] = [
  "sets", "amrap", "emom", "tabata", "for_time", "rounds", "interval", "ladder", "chipper",
];
const BLOCK_SIDES: readonly BlockSide[] = ["each_side", "alternating"];
const BLOCK_INTENSITIES: readonly BlockIntensity[] = ["light", "moderate", "hard"];

type Row = Record<string, unknown>;

// Report each column whose live type differs from the declared one, once per
// server instance, so the real schema shows up in the logs without spamming.
const reported = new Set<string>();
function report(column: string, value: unknown, declared: string) {
  const key = `${column}:${typeof value}`;
  if (reported.has(key)) return;
  reported.add(key);
  console.warn(
    `[dayNormalize] ${column} arrived as ${typeof value}, declared ${declared} — normalised. ` +
      "Align types/index.ts with the live schema."
  );
}

/** Text column → string | null. Numbers and booleans are stringified. */
function text(row: Row, column: string, table: string): string | null {
  const v = row[column];
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  report(`${table}.${column}`, v, "text");
  return typeof v === "number" || typeof v === "boolean" || typeof v === "bigint"
    ? String(v)
    : null;
}

/** Integer column → number | null. Numeric strings are parsed; anything else is null. */
function int(row: Row, column: string, table: string): number | null {
  const v = row[column];
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  report(`${table}.${column}`, v, "integer");
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function oneOf<T extends string>(row: Row, column: string, allowed: readonly T[]): T | null {
  const v = row[column];
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : null;
}

export function normalizeExercise(raw: unknown): DbExercise | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Row;
  return {
    id: String(r.id),
    name: text(r, "name", "exercises") ?? "",
    category: text(r, "category", "exercises") ?? "",
    description: text(r, "description", "exercises"),
    video_url: text(r, "video_url", "exercises"),
    mux_playback_id: text(r, "mux_playback_id", "exercises"),
  };
}

export function normalizeBlock(raw: unknown): DbBlock {
  const r = (raw ?? {}) as Row;
  return {
    id: String(r.id),
    task_id: String(r.task_id),
    type: r.type === "exercise" ? "exercise" : "text",
    order_index: int(r, "order_index", "blocks") ?? 0,
    exercise_id: text(r, "exercise_id", "blocks"),
    content: text(r, "content", "blocks"),
    sets: text(r, "sets", "blocks"),
    reps: text(r, "reps", "blocks"),
    load: text(r, "load", "blocks"),
    duration_sec: int(r, "duration_sec", "blocks"),
    rest_sec: int(r, "rest_sec", "blocks"),
    side: oneOf(r, "side", BLOCK_SIDES),
    intensity: oneOf(r, "intensity", BLOCK_INTENSITIES),
    group_label: text(r, "group_label", "blocks"),
    exercises: normalizeExercise(r.exercises),
  };
}

/** A part (task) with its blocks normalised and sorted by order_index. */
export function normalizePart(raw: unknown): DbTask {
  const r = (raw ?? {}) as Row;
  const blocks = Array.isArray(r.blocks) ? r.blocks.map(normalizeBlock) : [];
  return {
    id: String(r.id),
    day_id: String(r.day_id),
    name: text(r, "name", "tasks") ?? "",
    color: text(r, "color", "tasks") ?? "",
    order_index: int(r, "order_index", "tasks") ?? 0,
    video_url: text(r, "video_url", "tasks"),
    instructions: text(r, "instructions", "tasks"),
    format: oneOf(r, "format", TASK_FORMATS) ?? "sets",
    work_sec: int(r, "work_sec", "tasks"),
    rest_sec: int(r, "rest_sec", "tasks"),
    rounds: int(r, "rounds", "tasks"),
    time_cap_sec: int(r, "time_cap_sec", "tasks"),
    rep_scheme: text(r, "rep_scheme", "tasks"),
    blocks: blocks.sort((a, b) => a.order_index - b.order_index),
  };
}
