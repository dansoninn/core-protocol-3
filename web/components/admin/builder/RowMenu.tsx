"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { MoreVertical } from "lucide-react";

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  danger?: boolean;
  /** Ask "Ertu viss?" inside the menu before running. */
  confirm?: string;
}

/** ⋮ on a tree row: move, duplicate, delete. Closes on outside click and Escape. */
export default function RowMenu({ items, label }: { items: MenuItem[]; label: string }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label={`Valmynd: ${label}`}
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
          setConfirming(null);
        }}
        style={{
          width: 28,
          height: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 8,
          border: "1px solid transparent",
          background: open ? "var(--surface3)" : "transparent",
          color: "var(--muted2)",
          cursor: "pointer",
        }}
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            right: 0,
            top: 32,
            zIndex: 30,
            minWidth: 190,
            padding: 6,
            borderRadius: 10,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
          }}
        >
          {items.map((it, i) =>
            confirming === i ? (
              <div key={i} style={{ padding: "6px 8px", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ flex: 1, fontSize: 12, color: "var(--muted2)" }}>{it.confirm}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setOpen(false);
                    it.onSelect();
                  }}
                  style={{ fontSize: 12, fontWeight: 700, color: "var(--danger)", background: "var(--danger-dim)", border: "1px solid var(--danger)", borderRadius: 6, padding: "3px 8px", cursor: "pointer" }}
                >
                  Já
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setConfirming(null);
                  }}
                  style={{ fontSize: 12, color: "var(--text)", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 8px", cursor: "pointer" }}
                >
                  Nei
                </button>
              </div>
            ) : (
              <button
                key={i}
                type="button"
                role="menuitem"
                disabled={it.disabled}
                onClick={(e) => {
                  e.preventDefault();
                  if (it.confirm) {
                    setConfirming(i);
                    return;
                  }
                  setOpen(false);
                  it.onSelect();
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: "none",
                  background: "transparent",
                  textAlign: "left",
                  fontSize: 13,
                  color: it.danger ? "var(--danger)" : "var(--text)",
                  opacity: it.disabled ? 0.35 : 1,
                  cursor: it.disabled ? "default" : "pointer",
                }}
                onMouseEnter={(e) => !it.disabled && (e.currentTarget.style.background = "var(--surface2)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {it.icon}
                {it.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
