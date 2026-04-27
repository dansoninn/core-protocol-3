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
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      {/* Hero */}
      <section
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          padding: "64px 20px 48px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <h1
            style={{
              fontFamily: "var(--font-bebas)",
              fontSize: "clamp(40px, 8vw, 64px)",
              color: "var(--text)",
              letterSpacing: "0.04em",
              lineHeight: 1,
              marginBottom: 12,
            }}
          >
            Hvað ertu að leita að?
          </h1>
          <p style={{ fontSize: 16, color: "var(--muted2)", lineHeight: 1.6 }}>
            Veldu markmið þitt og við finnum námskeið fyrir þig
          </p>
        </div>
      </section>

      {/* Filter + Grid */}
      <section
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "32px 20px 80px",
        }}
        className="sm:px-6 lg:px-8"
      >
        {categories.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <FilterButtons
              categories={categories}
              selected={selected}
              onChange={setSelected}
              allLabel="Öll námskeið"
            />
          </div>
        )}

        {filtered.length === 0 ? (
          <p
            style={{
              color: "var(--muted2)",
              textAlign: "center",
              padding: "64px 0",
              fontSize: 14,
            }}
          >
            {courses.length === 0
              ? "Engin námskeið í boði eins og er."
              : "Engin námskeið fundust í þessum flokki."}
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 20,
            }}
          >
            {filtered.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
