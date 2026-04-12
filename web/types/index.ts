// Types that match the Supabase database schema (snake_case columns).
// The old mock-data types (Course, Exercise, DayLesson, Week) have been removed.

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
  video_url: string | null;
  workout_text: string | null;
  is_free_preview: boolean;
  order_index: number;
}

export interface DbExercise {
  id: string;
  name: string;
  category: string;
  description: string | null;
  video_url: string | null;
}
