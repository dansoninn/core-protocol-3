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
        // Tiles size to their content and share the row; they wrap rather
        // than truncate ("Interval", "1:30 mín" must stay readable).
        display: "flex",
        flexWrap: "wrap",
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
        flex: "1 1 auto",
        minWidth: 64,
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
          fontSize: 22,
          lineHeight: 1,
          color: accent ? "var(--accent)" : "var(--text)",
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
