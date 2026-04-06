"use client";

import { useState } from "react";
import type { Exercise, Category } from "@/types";
import ExerciseCard from "@/components/ExerciseCard";
import { EXERCISE_CATEGORIES } from "@/lib/data";

interface Props {
  exercises: Exercise[];
}

export default function ExercisesClient({ exercises }: Props) {
  const [selected, setSelected] = useState<Category | null>(null);

  const filtered = selected
    ? exercises.filter((e) => e.category === selected)
    : exercises;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-zinc-900 mb-2">Æfingabanki</h1>
        <p className="text-zinc-500">Skoðaðu allar æfingarnar og lærðu rétta framkvæmd.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setSelected(null)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
            selected === null
              ? "bg-zinc-900 text-white border-zinc-900"
              : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400"
          }`}
        >
          Allt
        </button>
        {EXERCISE_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelected(cat as Category)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
              selected === cat
                ? "bg-zinc-900 text-white border-zinc-900"
                : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-zinc-500 text-center py-16">
          Engar æfingar fundust í þessum flokki.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((ex) => (
            <div key={ex.id} id={ex.id}>
              <ExerciseCard exercise={ex} />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
