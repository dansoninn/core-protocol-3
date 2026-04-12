"use client";

import { useState } from "react";
import type { DbCourse } from "@/types";
import FilterButtons from "@/components/FilterButtons";
import CourseCard from "@/components/CourseCard";

interface Props {
  courses: DbCourse[];
  categories: string[];
}

export default function HomeClient({ courses, categories }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = selected
    ? courses.filter((c) => c.category === selected)
    : courses;

  return (
    <main>
      {/* Hero */}
      <section className="bg-zinc-900 text-white py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
            Hvað ertu að leita að?
          </h1>
          <p className="text-zinc-400 text-lg sm:text-xl">
            Veldu markmið þitt og við finnum námskeið fyrir þig
          </p>
        </div>
      </section>

      {/* Filter + Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {categories.length > 0 && (
          <div className="mb-8">
            <FilterButtons
              categories={categories}
              selected={selected}
              onChange={setSelected}
              allLabel="Öll námskeið"
            />
          </div>
        )}

        {filtered.length === 0 ? (
          <p className="text-zinc-500 text-center py-16">
            {courses.length === 0
              ? "Engin námskeið í boði eins og er."
              : "Engin námskeið fundust í þessum flokki."}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
