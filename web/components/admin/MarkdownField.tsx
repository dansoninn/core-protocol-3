"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Bold, Italic, Link2, List, ListOrdered } from "lucide-react";
import { inputStyle } from "@/components/admin/fields";

/**
 * Multi-line text with a small toolbar — bold, italic, bullet list, numbered
 * list, link — writing the markdown subset lib/markdown.tsx renders. Saves on
 * blur like the other builder fields (blank → null). Toolbar buttons keep the
 * textarea's focus and selection (mousedown is prevented), so a click does
 * not count as leaving the field.
 */
export default function MarkdownField({
  value,
  onSave,
  placeholder,
  minHeight = 96,
}: {
  value: string | null | undefined;
  onSave: (s: string | null) => void;
  placeholder?: string;
  minHeight?: number;
}) {
  const [draft, setDraft] = useState(value ?? "");
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  const commit = (text: string) => {
    const next = text.trim() ? text.replace(/\s+$/, "") : null;
    if (next !== (value ?? null)) onSave(next);
  };

  /** Replace the selection via fn(selected) → [text, cursorStart, cursorEnd] relative to the insert. */
  const edit = (fn: (sel: string) => [string, number, number]) => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const [ins, cs, ce] = fn(draft.slice(s, e));
    const next = draft.slice(0, s) + ins + draft.slice(e);
    setDraft(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + cs, s + ce);
    });
  };

  const wrap = (mark: string, fallback: string) =>
    edit((sel) => {
      const inner = sel || fallback;
      return [`${mark}${inner}${mark}`, mark.length, mark.length + inner.length];
    });

  /** Prefix every selected line (or the current line) with a list marker. */
  const list = (numbered: boolean) => {
    const el = ref.current;
    if (!el) return;
    const lineStart = draft.lastIndexOf("\n", el.selectionStart - 1) + 1;
    const nl = draft.indexOf("\n", el.selectionEnd);
    const lineEnd = nl === -1 ? draft.length : nl;
    const lines = draft.slice(lineStart, lineEnd).split("\n");
    const out = lines
      .map((l, i) => {
        const bare = l.replace(/^\s*([-*•]|\d+[.)])\s+/, "");
        return numbered ? `${i + 1}. ${bare}` : `- ${bare}`;
      })
      .join("\n");
    const next = draft.slice(0, lineStart) + out + draft.slice(lineEnd);
    setDraft(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(lineStart + out.length, lineStart + out.length);
    });
  };

  const link = () => {
    const url = window.prompt("Slóð (https://…)", "https://");
    if (!url || !/^https?:\/\/\S+$/.test(url.trim())) return;
    edit((sel) => {
      const label = sel || "tengill";
      return [`[${label}](${url.trim()})`, 1, 1 + label.length];
    });
  };

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface2)", overflow: "hidden" }}>
      <div role="toolbar" aria-label="Snið texta" style={{ display: "flex", gap: 2, padding: 4, borderBottom: "1px solid var(--border)" }}>
        <Tool label="Feitletrað (Ctrl+B)" onClick={() => wrap("**", "feitletrað")}><Bold size={15} /></Tool>
        <Tool label="Skáletrað (Ctrl+I)" onClick={() => wrap("*", "skáletrað")}><Italic size={15} /></Tool>
        <Tool label="Punktalisti" onClick={() => list(false)}><List size={15} /></Tool>
        <Tool label="Númeraður listi" onClick={() => list(true)}><ListOrdered size={15} /></Tool>
        <Tool label="Tengill" onClick={link}><Link2 size={15} /></Tool>
      </div>
      <textarea
        ref={ref}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (!(e.metaKey || e.ctrlKey)) return;
          if (e.key === "b") {
            e.preventDefault();
            wrap("**", "feitletrað");
          } else if (e.key === "i") {
            e.preventDefault();
            wrap("*", "skáletrað");
          }
        }}
        style={{
          ...inputStyle,
          width: "100%",
          minHeight,
          resize: "vertical",
          lineHeight: 1.55,
          fontSize: 13,
          border: "none",
          borderRadius: 0,
          background: "transparent",
        } as CSSProperties}
      />
    </div>
  );
}

function Tool({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      style={{
        width: 30,
        height: 28,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 6,
        border: "none",
        background: "transparent",
        color: "var(--text)",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface3)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {children}
    </button>
  );
}
