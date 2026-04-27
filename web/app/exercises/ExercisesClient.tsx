"use client";

import { useState } from "react";
import type { DbExercise } from "@/types";
import ExerciseCard from "@/components/ExerciseCard";

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

  const allTabs = ["Allt", ...categories];

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px 80px" }}>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{
            fontFamily: "var(--font-bebas)",
            fontSize: 32,
            color: "var(--text)",
            letterSpacing: "0.04em",
            lineHeight: 1,
            marginBottom: 6,
          }}>
            ÆFINGABANKI
          </h1>
          <p style={{ fontSize: 14, color: "var(--muted2)" }}>
            Skoðaðu allar æfingar og lærðu rétta framkvæmd.
          </p>
        </div>

        {/* Search */}
        <div style={{ marginBottom: 12 }}>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Leita að æfingu..."
            style={{
              width: "100%",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "12px 16px",
              fontSize: 14,
              color: "var(--text)",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Filter tabs */}
        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            flexWrap: "nowrap",
            paddingBottom: 4,
            marginBottom: 20,
            scrollbarWidth: "none",
          }}
          className="[&::-webkit-scrollbar]:hidden"
        >
          {allTabs.map((tab) => {
            const isActive = tab === "Allt" ? !selected : selected === tab;
            return (
              <button
                key={tab}
                onClick={() => setSelected(tab === "Allt" ? null : tab)}
                style={{
                  flexShrink: 0,
                  padding: "6px 14px",
                  borderRadius: 99,
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? "#fff" : "var(--muted2)",
                  background: isActive ? "var(--accent)" : "var(--surface)",
                  border: isActive ? "1px solid transparent" : "1px solid var(--border)",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                }}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <p style={{
            color: "var(--muted2)", textAlign: "center",
            padding: "48px 0", fontSize: 14,
          }}>
            {query
              ? `Engar æfingar fundust fyrir „${query}".`
              : "Engar æfingar fundust í þessum flokki."}
          </p>
        ) : (
          <div
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
            style={{ gap: 12 }}
          >
            {filtered.map((ex) => (
              <ExerciseCard key={ex.id} exercise={ex} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
