/** Ring + bar + "{done} / {total} liðir". `compact` is the one-line version for the part page. */
export default function DayProgress({
  done,
  total,
  compact = false,
}: {
  done: number;
  total: number;
  compact?: boolean;
}) {
  const pct = total > 0 ? done / total : 0;
  const complete = total > 0 && done === total;
  const color = complete ? "var(--success)" : "var(--accent)";
  const label = `${done} / ${total} liðir`;

  if (compact) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <Ring pct={pct} size={26} stroke={3} color={color} />
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted2)", whiteSpace: "nowrap" }}>{label}</span>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: "16px 18px",
      }}
    >
      <div style={{ position: "relative", flexShrink: 0 }}>
        <Ring pct={pct} size={56} stroke={5} color={color} />
        <span
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 700,
            color: "var(--text)",
          }}
        >
          {Math.round(pct * 100)}%
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>
          {complete ? "Degi lokið" : label}
        </p>
        <div style={{ height: 6, borderRadius: 999, background: "var(--surface3)", overflow: "hidden" }}>
          <div style={{ width: `${pct * 100}%`, height: "100%", background: color, borderRadius: 999, transition: "width 0.3s" }} />
        </div>
        {complete && (
          <p style={{ fontSize: 12, color: "var(--muted2)", marginTop: 6 }}>{label}</p>
        )}
      </div>
    </div>
  );
}

function Ring({ pct, size, stroke, color }: { pct: number; size: number; stroke: number; color: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" style={{ display: "block" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface3)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.3s" }}
      />
    </svg>
  );
}
