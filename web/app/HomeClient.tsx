"use client";

import { useState } from "react";
import { COURSES } from "@/lib/data";
import FilterButtons from "@/components/FilterButtons";
import CourseCard from "@/components/CourseCard";
import type { Category } from "@/types";

export default function HomeClient() {
  const [selected, setSelected] = useState<Category | null>(null);

  const filtered = selected
    ? COURSES.filter((c) => c.category === selected)
    : COURSES;

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
        <div className="mb-8">
          <FilterButtons selected={selected} onChange={setSelected} />
        </div>

        {filtered.length === 0 ? (
          <p className="text-zinc-500 text-center py-16">
            Engin námskeið fundust í þessari flokk.
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
