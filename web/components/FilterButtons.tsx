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
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      <button
        onClick={() => onChange(null)}
        style={{
          padding: "7px 16px",
          borderRadius: 999,
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
          border: `1px solid ${selected === null ? "var(--accent)" : "var(--border)"}`,
          background: selected === null ? "var(--accent-dim)" : "var(--surface)",
          color: selected === null ? "var(--accent)" : "var(--muted2)",
          transition: "all 0.15s",
        }}
      >
        {allLabel}
      </button>
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          style={{
            padding: "7px 16px",
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            border: `1px solid ${selected === cat ? "var(--accent)" : "var(--border)"}`,
            background: selected === cat ? "var(--accent-dim)" : "var(--surface)",
            color: selected === cat ? "var(--accent)" : "var(--muted2)",
            transition: "all 0.15s",
          }}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
