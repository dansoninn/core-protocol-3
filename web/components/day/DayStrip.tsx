import Link from "next/link";
import type { CSSProperties } from "react";
import { dayAbbrev, type StripDay, type StripDayState } from "@/lib/dayLogic";

const STATE_STYLE: Record<StripDayState, { box: CSSProperties; color: string }> = {
  current: {
    box: { background: "var(--accent-dim)", border: "1px solid var(--accent-line)" },
    color: "var(--accent)",
  },
  done: {
    box: { background: "var(--success-dim)", border: "1px solid var(--border)" },
    color: "var(--success)",
  },
  open: {
    box: { background: "var(--surface)", border: "1px solid var(--border)" },
    color: "var(--muted2)",
  },
  locked: {
    box: { background: "var(--surface)", border: "1px solid var(--border)", opacity: 0.35 },
    color: "var(--muted2)",
  },
};

/**
 * The week's days — MÁN 1 / ÞRI 2 / … Locked days are not links, except for
 * admins: theirs keep the locked look (so they see what users see) but open.
 */
export default function DayStrip({ days, compact = false }: { days: StripDay[]; compact?: boolean }) {
  return (
    <nav
      aria-label="Dagar vikunnar"
      className="[&::-webkit-scrollbar]:hidden"
      style={{ display: "flex", gap: compact ? 6 : 8, overflowX: "auto", scrollbarWidth: "none" }}
    >
      {days.map((d) => {
        const { box, color } = STATE_STYLE[d.state];
        const style: CSSProperties = {
          ...box,
          borderRadius: compact ? 10 : 12,
          padding: compact ? "6px 4px" : "10px 6px",
          minWidth: compact ? 36 : 44,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          flexShrink: 0,
          textDecoration: "none",
        };
        const label = (
          <>
            <span style={{ fontSize: compact ? 8 : 9, fontWeight: 700, letterSpacing: "0.08em", color, lineHeight: 1 }}>
              {dayAbbrev(d.order_index)}
            </span>
            <span style={{ fontFamily: "var(--font-bebas)", fontSize: compact ? 16 : 20, color, marginTop: 3, lineHeight: 1 }}>
              {d.order_index + 1}
            </span>
          </>
        );
        return d.href ? (
          <Link
            key={d.id}
            href={d.href}
            style={style}
            aria-current={d.state === "current" ? "page" : undefined}
            title={d.state === "locked" ? "Læst notendum — opið stjórnanda" : undefined}
          >
            {label}
          </Link>
        ) : (
          <span key={d.id} style={{ ...style, cursor: "default" }} aria-disabled="true" title="Læst">
            {label}
          </span>
        );
      })}
    </nav>
  );
}
