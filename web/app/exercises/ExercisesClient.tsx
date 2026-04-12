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
  const [query, setQuery] = useState("");

  const filtered = exercises.filter((e) => {
    const matchesCategory = !selected || e.category === selected;
    const matchesQuery =
      !query || e.name.toLowerCase().includes(query.toLowerCase());
    return matchesCategory && matchesQuery;
  });

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

      {/* Search */}
      <div className="mb-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Leita að æfingu..."
          className="w-full sm:w-80 bg-zinc-900 text-white placeholder-zinc-500 text-sm px-4 py-2.5 rounded-xl border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-white/20"
        />
      </div>

      {/* Category filter */}
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
          {query
            ? `Engar æfingar fundust fyrir „${query}".`
            : "Engar æfingar fundust í þessum flokki."}
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
