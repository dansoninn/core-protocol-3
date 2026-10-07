import { ChevronDown } from "lucide-react";
import { Markdown } from "@/lib/markdown";

/** Collapsible "Leiðbeiningar". Native <details>, so it needs no client JS. */
export default function InstructionsBox({ text }: { text: string }) {
  return (
    <details
      open
      className="group"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      <summary
        className="[&::-webkit-details-marker]:hidden"
        style={{
          listStyle: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--accent)",
        }}
      >
        Leiðbeiningar
        <ChevronDown size={16} className="transition-transform group-open:rotate-180" />
      </summary>
      <Markdown
        text={text}
        style={{
          padding: "0 16px 14px",
          fontSize: 14,
          lineHeight: 1.6,
          color: "var(--text)",
        }}
      />
    </details>
  );
}
