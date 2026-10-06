"use client";

import { useRef, useState } from "react";
import type { DbExercise } from "@/types";
import { inputStyle, labelStyle } from "@/components/admin/fields";

/**
 * Quick-tag for a video part: a persistent search box under the part's
 * blocks. Enter adds the top match as a new exercise block and keeps focus,
 * so the next exercise can be typed straight away. Exercises already tagged
 * on the part are skipped. Optional — "+ Æfing" still adds one at a time.
 */
export default function QuickTag({
  exercises,
  taggedExerciseIds,
  onAdd,
}: {
  exercises: DbExercise[];
  taggedExerciseIds: ReadonlySet<string>;
  /** Insert one exercise block; resolves when the write is done. */
  onAdd: (exerciseId: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const q = query.trim().toLowerCase();
  const matches = q
    ? exercises
        .filter((ex) => !taggedExerciseIds.has(ex.id))
        .filter((ex) => ex.name.toLowerCase().includes(q) || ex.category.toLowerCase().includes(q))
        // Name starting with the query first, then name matches, then category-only
        .sort((a, b) => rank(a, q) - rank(b, q) || a.name.localeCompare(b.name, "is"))
        .slice(0, 5)
    : [];

  const add = async (ex: DbExercise) => {
    if (busy) return;
    setBusy(true);
    await onAdd(ex.id);
    setBusy(false);
    setLastAdded(ex.name);
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border)" }}>
      <label style={{ display: "block" }}>
        <span style={labelStyle}>Merkja æfingar í myndbandinu</span>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (matches[0]) add(matches[0]);
            } else if (e.key === "Escape") {
              setQuery("");
            }
          }}
          placeholder="Skrifaðu nafn og ýttu á Enter…"
          aria-describedby="quicktag-hint"
          style={{ ...inputStyle, width: "100%", padding: "8px 12px", opacity: busy ? 0.6 : 1 }}
        />
      </label>
      <p id="quicktag-hint" style={{ fontSize: 11, color: "var(--muted2)", marginTop: 6, minHeight: 16 }}>
        {busy
          ? "Bætir við…"
          : q && matches.length === 0
          ? "Engin ómerkt æfing passar."
          : matches.length > 0
          ? (
            <>
              Enter bætir við <strong style={{ color: "var(--text)" }}>{matches[0].name}</strong>
              {matches.length > 1 && <> · {matches.slice(1).map((m) => m.name).join(", ")}</>}
            </>
          )
          : lastAdded
          ? `Bætt við: ${lastAdded}`
          : null}
      </p>
    </div>
  );
}

function rank(ex: DbExercise, q: string): number {
  const name = ex.name.toLowerCase();
  if (name.startsWith(q)) return 0;
  if (name.includes(q)) return 1;
  return 2;
}
