"use client";

import { useEffect, useState, type CSSProperties } from "react";

// Shared inputs for the course builder. Each keeps a local draft while typing,
// saves on blur, and re-syncs when its value changes from outside (e.g. a
// format change clearing a field). Invalid input reverts instead of saving.

export const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--muted2)",
  marginBottom: 4,
};

export const inputStyle: CSSProperties = {
  background: "var(--surface2)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "6px 10px",
  fontSize: 12,
  color: "var(--text)",
  outline: "none",
  boxSizing: "border-box",
};

/** "30" → 30, "1:30" → 90, "12:00" → 720, "" → null, anything else → undefined (invalid). */
export function parseDuration(input: string): number | null | undefined {
  const s = input.trim();
  if (s === "") return null;
  if (/^\d+$/.test(s)) return Number(s);
  const m = /^(\d+):([0-5]\d)$/.exec(s);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  return undefined;
}

/** 30 → "0:30", 90 → "1:30", 720 → "12:00", null → "". */
export function formatDuration(sec: number | null | undefined): string {
  if (sec == null) return "";
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

/** Positive whole number; "" → null, anything else → undefined (invalid). */
function parsePositiveInt(input: string): number | null | undefined {
  const s = input.trim();
  if (s === "") return null;
  if (/^\d+$/.test(s) && Number(s) > 0) return Number(s);
  return undefined;
}

/** Seconds stored, m:ss shown. Accepts "30" or "1:30". */
export function DurationInput({
  value,
  onSave,
  style,
  placeholder = "m:ss",
}: {
  value: number | null | undefined;
  onSave: (sec: number | null) => void;
  style?: CSSProperties;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(formatDuration(value));
  useEffect(() => {
    setDraft(formatDuration(value));
  }, [value]);

  return (
    <input
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const parsed = parseDuration(draft);
        if (parsed === undefined) {
          setDraft(formatDuration(value));
          return;
        }
        setDraft(formatDuration(parsed));
        if (parsed !== (value ?? null)) onSave(parsed);
      }}
      style={{ ...inputStyle, ...style }}
    />
  );
}

export function IntInput({
  value,
  onSave,
  style,
  placeholder = "—",
}: {
  value: number | null | undefined;
  onSave: (n: number | null) => void;
  style?: CSSProperties;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(value == null ? "" : String(value));
  useEffect(() => {
    setDraft(value == null ? "" : String(value));
  }, [value]);

  return (
    <input
      value={draft}
      inputMode="numeric"
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const parsed = parsePositiveInt(draft);
        if (parsed === undefined) {
          setDraft(value == null ? "" : String(value));
          return;
        }
        if (parsed !== (value ?? null)) onSave(parsed);
      }}
      style={{ ...inputStyle, ...style }}
    />
  );
}

/** Single-line text; blank saves as null. `normalize` runs before saving. */
export function TextInput({
  value,
  onSave,
  normalize = (s) => s,
  style,
  placeholder,
  maxLength,
  title,
}: {
  value: string | null | undefined;
  onSave: (s: string | null) => void;
  normalize?: (s: string) => string;
  style?: CSSProperties;
  placeholder?: string;
  maxLength?: number;
  title?: string;
}) {
  const [draft, setDraft] = useState(value ?? "");
  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  return (
    <input
      value={draft}
      placeholder={placeholder}
      maxLength={maxLength}
      title={title}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const next = normalize(draft.trim()) || null;
        setDraft(next ?? "");
        if (next !== (value ?? null)) onSave(next);
      }}
      style={{ ...inputStyle, ...style }}
    />
  );
}

/** Multi-line text; blank saves as null. */
export function TextArea({
  value,
  onSave,
  style,
  placeholder,
}: {
  value: string | null | undefined;
  onSave: (s: string | null) => void;
  style?: CSSProperties;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(value ?? "");
  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  return (
    <textarea
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const next = draft.trim() ? draft.trim() : null;
        if (next !== (value ?? null)) onSave(next);
      }}
      style={{
        ...inputStyle,
        width: "100%",
        minHeight: 56,
        resize: "vertical",
        lineHeight: 1.5,
        ...style,
      }}
    />
  );
}
