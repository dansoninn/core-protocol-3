import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";

export interface NavItem {
  /** null renders a disabled button. */
  href: string | null;
  /** Locked look (muted, padlock). With an href it still opens — the admin case. */
  locked?: boolean;
  label: string;
  title?: string;
}

/** "Fyrri … / Næsti …" footer. The forward action is the gold one. */
export default function PrevNextNav({ prev, next }: { prev: NavItem | null; next: NavItem | null }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 28 }}>
      {prev ? <NavButton item={prev} direction="prev" /> : <span />}
      {next ? <NavButton item={next} direction="next" /> : <span />}
    </div>
  );
}

function NavButton({ item, direction }: { item: NavItem; direction: "prev" | "next" }) {
  const isNext = direction === "next";
  const disabled = item.href === null;
  const looksLocked = disabled || item.locked === true;
  const style: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: isNext ? "flex-end" : "flex-start",
    gap: 8,
    minWidth: 0,
    padding: "12px 14px",
    borderRadius: 14,
    textDecoration: "none",
    textAlign: isNext ? "right" : "left",
    ...(isNext && !looksLocked
      ? { background: "var(--accent)", color: "var(--bg)", border: "1px solid var(--accent)" }
      : { background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }),
    ...(looksLocked ? { opacity: 0.4 } : {}),
    ...(disabled ? { cursor: "default" } : {}),
  };

  const body: ReactNode = (
    <>
      {!isNext && <ChevronLeft size={18} style={{ flexShrink: 0 }} />}
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 13, fontWeight: 700 }}>{item.label}</span>
        {item.title && (
          <span
            style={{
              display: "block",
              fontSize: 11,
              opacity: 0.75,
              marginTop: 2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {item.title}
          </span>
        )}
      </span>
      {isNext && (looksLocked ? <Lock size={15} style={{ flexShrink: 0 }} /> : <ChevronRight size={18} style={{ flexShrink: 0 }} />)}
    </>
  );

  return disabled ? (
    <span style={style} aria-disabled="true">{body}</span>
  ) : (
    <Link href={item.href!} style={style}>{body}</Link>
  );
}
