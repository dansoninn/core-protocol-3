import type { FormatSummary } from "@/lib/dayLogic";

/**
 * The part's format at a glance: the format name, then one tile per set
 * parameter ("12 mín / Lengd", "8 / Hringir"). Nothing for "sets".
 */
export default function FormatTiles({ summary }: { summary: FormatSummary }) {
  if (!summary.name) return null;

  return (
    <div
      role="group"
      aria-label={`Snið: ${summary.name}`}
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(88px, 1fr))",
        gap: 8,
        marginBottom: 14,
      }}
    >
      <Tile value={summary.name} label="Snið" accent />
      {summary.tiles.map((t) => (
        <Tile key={t.key} value={t.value} label={t.label} />
      ))}
    </div>
  );
}

function Tile({ value, label, accent = false }: { value: string; label: string; accent?: boolean }) {
  return (
    <div
      style={{
        minWidth: 0,
        padding: "10px 12px",
        borderRadius: 12,
        background: accent ? "var(--accent-dim)" : "var(--surface)",
        border: `1px solid ${accent ? "var(--accent-line)" : "var(--border)"}`,
      }}
    >
      <span
        style={{
          display: "block",
          fontFamily: "var(--font-bebas)",
          fontSize: 24,
          lineHeight: 1,
          color: accent ? "var(--accent)" : "var(--text)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </span>
      <span
        style={{
          display: "block",
          marginTop: 5,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--muted2)",
        }}
      >
        {label}
      </span>
    </div>
  );
}
