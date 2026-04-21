import { createClient } from "@/lib/supabase/server";
import ExercisesClient from "./ExercisesClient";
import type { DbExercise } from "@/types";

export const revalidate = 60;

export default async function ExercisesPage() {
  const supabase = createClient();

  const { data } = await supabase
    .from("exercises")
    .select("id, name, category, description, video_url, mux_playback_id")
    .order("name");

  const exercises = (data as DbExercise[]) ?? [];

  // Derive categories from actual data so the filter always reflects reality
  const categories = Array.from(new Set(exercises.map((e) => e.category))).sort();

  return <ExercisesClient exercises={exercises} categories={categories} />;
}
