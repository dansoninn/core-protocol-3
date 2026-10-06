// Types that match the Supabase database schema (snake_case columns).
//
// Day-view rows (DbTask, DbBlock, DbExercise) are normalised to these shapes in
// lib/dayNormalize.ts before any component sees them.

export interface DbCourse {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category: string;
  price: number;
  cover_image: string | null;
  instructor: string | null;
}

export interface DbWeek {
  id: string;
  title: string;
  order_index: number;
  days: DbDay[];
}

export interface DbDay {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
}

/** Workout format for a task (part). Superset/complex is not a format — see DbBlock.group_label. */
export type TaskFormat =
  | "sets"
  | "amrap"
  | "emom"
  | "tabata"
  | "for_time"
  | "rounds"
  | "interval"
  | "ladder"
  | "chipper";

export type BlockSide = "each_side" | "alternating";

export type BlockIntensity = "light" | "moderate" | "hard";

export interface DbTask {
  id: string;
  day_id: string;
  name: string;
  color: string;
  order_index: number;
  video_url: string | null;
  // Day view v2 (migration-day-view-v2.sql, live in Supabase).
  instructions: string | null; // "Leiðbeiningar" for the part
  format: TaskFormat; // NOT NULL DEFAULT 'sets' in the database
  work_sec: number | null; // interval/tabata work, EMOM interval
  rest_sec: number | null; // interval/tabata rest, rest between rounds
  rounds: number | null;
  time_cap_sec: number | null; // AMRAP duration, for_time/chipper cap
  rep_scheme: string | null; // ladder only, e.g. "2-4-6-8-10" or "21-15-9"
  // Step 3b (migration-task-progress.sql). Mux duration in whole seconds —
  // a video part's total time. Null when there is no video or it predates the backfill.
  video_duration_sec: number | null;
  blocks: DbBlock[];
}

export interface DbBlock {
  id: string;
  task_id: string;
  type: "exercise" | "text";
  order_index: number;
  exercise_id: string | null;
  // On an exercise block: a program-specific coaching note. When empty, the UI
  // falls back to the exercise bank's exercises.description.
  content: string | null;
  sets: string | null;
  reps: string | null;
  load: string | null;
  // Day view v2 (migration-day-view-v2.sql).
  duration_sec: number | null; // e.g. 30 for "30 sek."
  rest_sec: number | null; // rest after this exercise / after its group
  side: BlockSide | null;
  intensity: BlockIntensity | null;
  group_label: string | null; // "A", "B"… groups blocks into a superset/complex
  exercises: DbExercise | null;
}

export interface DbExercise {
  id: string;
  name: string;
  category: string;
  description: string | null;
  video_url: string | null;
  mux_playback_id: string | null;
}
