import type { ReactNode } from "react";
import { formatDurationLabel } from "@/lib/dayLogic";

/**
 * A superset / complex: consecutive exercise blocks sharing a group_label,
 * framed together. The cards inside are labelled A1, A2…; rest comes after
 * the whole group.
 */
export default function ExerciseGroup({
  label,
  count,
  restSec,
  children,
}: {
  label: string;
  count: number;
  restSec: number | null;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={`Hópur ${label}`}
      style={{
        border: "1px solid var(--accent-line)",
        borderRadius: 18,
        padding: 8,
        background: "var(--accent-dim)",
      }}
    >
      <header style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 6px 10px" }}>
        <span
          style={{
            fontFamily: "var(--font-bebas)",
            fontSize: 20,
            lineHeight: 1,
            color: "var(--accent)",
          }}
        >
          {label}
        </span>
        <span style={{ fontSize: 12, color: "var(--muted2)" }}>
          {count} æfingar í röð, hvíld eftir hópinn
        </span>
      </header>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
      {restSec !== null && (
        <p style={{ fontSize: 12, color: "var(--muted2)", padding: "10px 6px 2px" }}>
          Hvíld eftir {label}: {formatDurationLabel(restSec)}
        </p>
      )}
    </section>
  );
}
