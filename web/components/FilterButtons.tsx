"use client";

import { CATEGORIES } from "@/lib/data";
import type { Category } from "@/types";

interface Props {
  selected: Category | null;
  onChange: (cat: Category | null) => void;
}

export default function FilterButtons({ selected, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onChange(null)}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
          selected === null
            ? "bg-zinc-900 text-white border-zinc-900"
            : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400"
        }`}
      >
        Öll námskeið
      </button>
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat as Category)}
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
  );
}
