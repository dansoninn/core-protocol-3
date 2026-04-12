"use client";

interface Props {
  categories: string[];
  selected: string | null;
  onChange: (cat: string | null) => void;
  allLabel?: string;
}

export default function FilterButtons({
  categories,
  selected,
  onChange,
  allLabel = "Allt",
}: Props) {
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
        {allLabel}
      </button>
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
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
