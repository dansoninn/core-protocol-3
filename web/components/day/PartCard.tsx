import Link from "next/link";
import { Check, ChevronRight, Play } from "lucide-react";

/** One row on the day overview — tap opens the part page. */
export default function PartCard({
  href,
  index,
  name,
  done,
  exerciseCount,
  hasVideo,
  minutesLabel,
}: {
  href: string;
  index: number;
  name: string;
  done: boolean;
  exerciseCount: number;
  hasVideo: boolean;
  minutesLabel: string | null;
}) {
  const meta = [
    exerciseCount > 0 ? `${exerciseCount} ${exerciseCount === 1 ? "æfing" : "æfingar"}` : null,
    minutesLabel,
  ].filter(Boolean);

  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 16px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        textDecoration: "none",
      }}
    >
      <span
        aria-label={done ? "Lokið" : undefined}
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-bebas)",
          fontSize: 16,
          background: done ? "var(--success-dim)" : "var(--surface2)",
          color: done ? "var(--success)" : "var(--muted2)",
          border: done ? "1px solid var(--success)" : "1px solid var(--border)",
        }}
      >
        {done ? <Check size={16} strokeWidth={2.5} /> : index + 1}
      </span>

      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "var(--text)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {name}
          </span>
          {hasVideo && <Play size={13} style={{ color: "var(--muted2)", flexShrink: 0 }} aria-label="Myndband" />}
        </span>
        {meta.length > 0 && (
          <span style={{ display: "block", fontSize: 12, color: "var(--muted2)", marginTop: 3 }}>
            {meta.join(" · ")}
          </span>
        )}
      </span>

      {done && (
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--success)", flexShrink: 0 }}>Lokið</span>
      )}
      <ChevronRight size={18} style={{ color: "var(--muted2)", flexShrink: 0 }} />
    </Link>
  );
}
