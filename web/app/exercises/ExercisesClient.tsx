"use client";

import { useState } from "react";
import type { DbExercise } from "@/types";
import ExerciseCard from "@/components/ExerciseCard";
import FilterButtons from "@/components/FilterButtons";

interface Props {
  exercises: DbExercise[];
  categories: string[];
}

export default function ExercisesClient({ exercises, categories }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = selected
    ? exercises.filter((e) => e.category === selected)
    : exercises;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-zinc-900 mb-2">
          Æfingabanki
        </h1>
        <p className="text-zinc-500">
          Skoðaðu allar æfingarnar og lærðu rétta framkvæmd.
        </p>
      </div>

      <div className="mb-8">
        <FilterButtons
          categories={categories}
          selected={selected}
          onChange={setSelected}
          allLabel="Allt"
        />
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
