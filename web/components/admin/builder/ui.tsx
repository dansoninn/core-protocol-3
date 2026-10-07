"use client";

import { useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { ChevronDown, ChevronUp, ChevronRight, Copy, Trash2 } from "lucide-react";

// Small shared pieces of the course builder. Every button calls
// preventDefault (CLAUDE.md: no scroll jump) and stopPropagation, so a
// button inside a clickable header never toggles it.

const stop = (e: MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
};

/** Up/down, stacked, on the left of a row. */
export function MoveButtons({
  canUp,
  canDown,
  onUp,
  onDown,
  label,
}: {
  canUp: boolean;
  canDown: boolean;
  onUp: () => void;
  onDown: () => void;
  /** "viku", "dag", "lið", "blokk" — for the aria labels */
  label: string;
}) {
  const btn = (enabled: boolean): CSSProperties => ({
    width: 26,
    height: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    borderRadius: 6,
    border: "1px solid var(--border)",
    background: "var(--surface2)",
    color: "var(--text)",
    cursor: enabled ? "pointer" : "default",
    opacity: enabled ? 1 : 0.25,
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, flexShrink: 0 }}>
      <button
        type="button"
        aria-label={`Færa ${label} upp`}
        disabled={!canUp}
        onClick={(e) => {
          stop(e);
          if (canUp) onUp();
        }}
        style={btn(canUp)}
      >
        <ChevronUp size={15} strokeWidth={2.5} />
      </button>
      <button
        type="button"
        aria-label={`Færa ${label} niður`}
        disabled={!canDown}
        onClick={(e) => {
          stop(e);
          if (canDown) onDown();
        }}
        style={btn(canDown)}
      >
        <ChevronDown size={15} strokeWidth={2.5} />
      </button>
    </div>
  );
}

export function ActionButton({
  onClick,
  children,
  icon,
  title,
}: {
  onClick: () => void;
  children: ReactNode;
  icon?: ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => {
        stop(e);
        onClick();
      }}
      style={actionStyle}
    >
      {icon}
      {children}
    </button>
  );
}

export function DuplicateButton({ onClick }: { onClick: () => void }) {
  return (
    <ActionButton onClick={onClick} icon={<Copy size={13} />}>
      Afrita
    </ActionButton>
  );
}

/** "Eyða" → "Eyða {label}?" with Já / Nei, so one click never deletes. */
export function DeleteButton({ label, onConfirm }: { label: string; onConfirm: () => void }) {
  const [confirming, setConfirming] = useState(false);
  if (confirming) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }} onClick={(e) => e.stopPropagation()}>
        <span style={{ fontSize: 12, color: "var(--muted2)", whiteSpace: "nowrap" }}>Eyða {label}?</span>
        <button
          type="button"
          onClick={(e) => {
            stop(e);
            setConfirming(false);
            onConfirm();
          }}
          style={{ ...actionStyle, color: "var(--danger)", borderColor: "var(--danger)", background: "var(--danger-dim)" }}
        >
          Já, eyða
        </button>
        <button
          type="button"
          onClick={(e) => {
            stop(e);
            setConfirming(false);
          }}
          style={actionStyle}
        >
          Nei
        </button>
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={(e) => {
        stop(e);
        setConfirming(true);
      }}
      style={{ ...actionStyle, color: "var(--danger)" }}
    >
      <Trash2 size={13} />
      Eyða
    </button>
  );
}

export const actionStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 30,
  padding: "0 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text)",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
  flexShrink: 0,
};

/** Rotating chevron for a collapsible header. */
export function Chevron({ open, size = 18 }: { open: boolean; size?: number }) {
  return (
    <ChevronRight
      size={size}
      aria-hidden="true"
      style={{
        flexShrink: 0,
        color: "var(--muted2)",
        transform: open ? "rotate(90deg)" : "none",
        transition: "transform 0.15s",
      }}
    />
  );
}

/** A small summary pill in a collapsed header — "4 liðir", "AMRAP", "▶ 12:34". */
export function Chip({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "accent" | "success" }) {
  const tones = {
    muted: { color: "var(--muted2)", background: "var(--surface2)", border: "var(--border)" },
    accent: { color: "var(--accent)", background: "var(--accent-dim)", border: "var(--accent-line)" },
    success: { color: "var(--success)", background: "var(--success-dim)", border: "var(--success)" },
  }[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 999,
        whiteSpace: "nowrap",
        color: tones.color,
        background: tones.background,
        border: `1px solid ${tones.border}`,
      }}
    >
      {children}
    </span>
  );
}

/** Section heading inside an open part: MYNDBAND, SNIÐ OG LEIÐBEININGAR, ÆFINGAR. */
export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--accent)",
        }}
      >
        {children}
      </span>
      {right}
    </div>
  );
}

/** A clickable header row: click anywhere (outside inputs/buttons) toggles. */
export function HeaderRow({
  onToggle,
  open,
  children,
  style,
}: {
  onToggle: () => void;
  open: boolean;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={open}
      onClick={(e) => {
        // Inputs inside the header (a title being edited) don't toggle
        const t = e.target as HTMLElement;
        if (t.closest("input, textarea, select, button, label, a")) return;
        onToggle();
      }}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
          e.preventDefault();
          onToggle();
        }
      }}
      style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", userSelect: "none", ...style }}
    >
      {children}
    </div>
  );
}

/** "1:30" from seconds — the builder's compact duration. */
export function clock(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}
