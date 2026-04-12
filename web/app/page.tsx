import { createClient } from "@/lib/supabase/server";
import HomeClient from "./HomeClient";
import type { DbCourse } from "@/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("courses")
    .select("id, title, slug, description, category, price, cover_image, instructor")
    .order("created_at", { ascending: false });

  if (error) console.error("[Home] Supabase error:", error.message);

  const courses = (data as DbCourse[]) ?? [];

  // Derive unique categories from actual data for the filter buttons
  const categories = Array.from(new Set(courses.map((c) => c.category))).sort();

  return <HomeClient courses={courses} categories={categories} />;
}
