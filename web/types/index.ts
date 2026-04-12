// Types that match the Supabase database schema (snake_case columns).

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

export interface DbTask {
  id: string;
  day_id: string;
  name: string;
  color: string;
  order_index: number;
  blocks: DbBlock[];
}

export interface DbBlock {
  id: string;
  task_id: string;
  type: "exercise" | "text";
  order_index: number;
  exercise_id: string | null;
  content: string | null;
  exercises: DbExercise | null;
}

export interface DbExercise {
  id: string;
  name: string;
  category: string;
  description: string | null;
  video_url: string | null;
}
