import type { BlockIntensity, BlockSide, TaskFormat } from "@/types";

// Rows as the course builder loads them (select("*, days(*, tasks(*, blocks(*)))")),
// sorted by order_index. Not normalised like the day view — the builder
// writes back exactly what it read.

export interface BExercise {
  id: string;
  name: string;
  category: string;
  description: string | null;
  video_url: string | null;
  mux_playback_id: string | null;
}

export interface BCourse {
  id: string;
  title: string;
  slug?: string;
}

export interface BBlock {
  id: string;
  task_id: string;
  type: "exercise" | "text";
  order_index: number;
  exercise_id: string | null;
  content: string | null;
  sets: string | null;
  reps: string | null;
  load: string | null;
  duration_sec: number | null;
  rest_sec: number | null;
  side: BlockSide | null;
  intensity: BlockIntensity | null;
  group_label: string | null;
}

export interface BTask {
  id: string;
  day_id: string;
  name: string;
  color: string;
  order_index: number;
  video_url: string | null;
  instructions: string | null;
  format: TaskFormat;
  work_sec: number | null;
  rest_sec: number | null;
  rounds: number | null;
  time_cap_sec: number | null;
  rep_scheme: string | null;
  video_duration_sec: number | null;
  /** Absent until migration-task-reference.sql runs — anything but false is true. */
  exercises_are_reference?: boolean;
  /** Absent until migration-task-icon.sql runs. */
  icon?: string | null;
  blocks: BBlock[];
}

export interface BDay {
  id: string;
  week_id: string;
  title: string;
  description: string | null;
  order_index: number;
  tasks: BTask[];
}

export interface BWeek {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
  days: BDay[];
}

export type Selection = { kind: "week" | "day" | "part"; id: string } | null;

/** Content state shown in the tree. */
export type Readiness = "ready" | "warn" | "empty";

/** A part is ready when it has something to do or watch. */
export function partReadiness(t: BTask): Readiness {
  const hasExercise = t.blocks.some((b) => b.type === "exercise" && b.exercise_id);
  const hasText = t.blocks.some((b) => b.type === "text" && b.content?.trim());
  if (t.video_url || hasExercise) {
    // An exercise block without an exercise picked is a half-finished edit
    return t.blocks.some((b) => b.type === "exercise" && !b.exercise_id) ? "warn" : "ready";
  }
  if (t.instructions?.trim() || hasText) return "ready";
  return "warn";
}

export function dayReadiness(d: BDay): Readiness {
  if (d.tasks.length === 0) return "empty";
  return d.tasks.every((t) => partReadiness(t) === "ready") ? "ready" : "warn";
}

export function weekReadiness(w: BWeek): Readiness {
  if (w.days.length === 0) return "empty";
  const states = w.days.map(dayReadiness);
  if (states.every((s) => s === "ready")) return "ready";
  return states.some((s) => s === "warn") ? "warn" : "empty";
}
