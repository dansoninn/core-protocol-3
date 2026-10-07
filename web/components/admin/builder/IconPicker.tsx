"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { PART_COLORS, PART_ICONS, PartIconBubble, partColor } from "@/lib/partIcons";

/** The part's icon bubble; click opens a picker of icons and background colours. */
export default function IconPicker({
  icon,
  color,
  onIcon,
  onColor,
  size = 56,
}: {
  icon: string | null | undefined;
  color: string | null | undefined;
  onIcon: (key: string) => void;
  onColor: (hex: string) => void;
  size?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = partColor(color);

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
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        title="Velja tákn og lit"
        aria-label="Velja tákn og lit"
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        style={{ padding: 0, border: "none", background: "none", cursor: "pointer", display: "block" }}
      >
        <PartIconBubble icon={icon} color={color} size={size} />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: size + 8,
            zIndex: 30,
            width: 300,
            padding: 14,
            borderRadius: 12,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
          }}
        >
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "var(--accent)", marginBottom: 8 }}>TÁKN</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 14 }}>
            {PART_ICONS.map(({ key, label, Icon }) => {
              const active = (icon ?? "dumbbell") === key;
              return (
                <button
                  key={key}
                  type="button"
                  title={label}
                  aria-label={label}
                  aria-pressed={active}
                  onClick={(e) => {
                    e.preventDefault();
                    onIcon(key);
                  }}
                  style={{
                    height: 34,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 8,
                    cursor: "pointer",
                    color: active ? current : "var(--text)",
                    background: active ? "var(--surface3)" : "var(--surface2)",
                    border: `1px solid ${active ? current : "var(--border)"}`,
                  }}
                >
                  <Icon size={17} />
                </button>
              );
            })}
          </div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "var(--accent)", marginBottom: 8 }}>LITUR</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {PART_COLORS.map(({ value, label }) => {
              const active = current.toLowerCase() === value.toLowerCase();
              return (
                <button
                  key={value}
                  type="button"
                  title={label}
                  aria-label={label}
                  aria-pressed={active}
                  onClick={(e) => {
                    e.preventDefault();
                    onColor(value);
                  }}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    cursor: "pointer",
                    background: value,
                    border: active ? "2px solid var(--text)" : "2px solid transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                  }}
                >
                  {active && <Check size={14} strokeWidth={3} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
