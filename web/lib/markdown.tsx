import { Fragment, type ReactNode } from "react";

// A deliberately small markdown subset for coach-written text (part
// instructions, text blocks): **bold**, *italic* / _italic_, links
// [text](https://…), "- " / "* " bullet lists, "1. " numbered lists,
// paragraphs on blank lines, line breaks kept. Output is React elements —
// never HTML strings — so nothing a coach types can inject markup.
// Plain text without any markers renders exactly as before.

type Block =
  | { kind: "p"; lines: string[] }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[]; start: number };

const BULLET = /^\s*[-*•]\s+(.*)$/;
const NUMBER = /^\s*(\d+)[.)]\s+(.*)$/;

export function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.replace(/\s+$/, "");
    const last = blocks[blocks.length - 1];
    if (line.trim() === "") {
      blocks.push({ kind: "p", lines: [] }); // paragraph break marker
      continue;
    }
    const b = BULLET.exec(line);
    const n = NUMBER.exec(line);
    if (b) {
      if (last?.kind === "ul") last.items.push(b[1]);
      else blocks.push({ kind: "ul", items: [b[1]] });
    } else if (n) {
      if (last?.kind === "ol") last.items.push(n[2]);
      else blocks.push({ kind: "ol", items: [n[2]], start: Number(n[1]) });
    } else if (last?.kind === "p" && last.lines.length > 0) {
      last.lines.push(line);
    } else {
      blocks.push({ kind: "p", lines: [line] });
    }
  }
  return blocks.filter((b) => b.kind !== "p" || b.lines.length > 0);
}

// [text](url) | **bold** | *italic* | _italic_. Italic markers only count at
// word edges, so "2*3*4", "10/hlið * 2" and "a_b_c" stay plain text.
const INLINE = new RegExp(
  "\\[([^\\]]+)\\]\\((https?:\\/\\/[^\\s)]+)\\)|\\*\\*(?!\\s)([^*\\n]+?)(?<!\\s)\\*\\*|(?<![\\p{L}\\p{N}*])\\*(?![\\s*])([^*\\n]+?)(?<!\\s)\\*(?![\\p{L}\\p{N}*])|(?<![\\p{L}\\p{N}_])_(?![\\s_])([^_\\n]+?)(?<!\\s)_(?![\\p{L}\\p{N}_])",
  "gu"
);

export function renderInline(text: string, keyPrefix = "i"): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let k = 0;
  for (const m of Array.from(text.matchAll(INLINE))) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const key = `${keyPrefix}${k++}`;
    if (m[1] && m[2]) {
      out.push(
        <a key={key} href={m[2]} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "underline" }}>
          {m[1]}
        </a>
      );
    } else if (m[3]) {
      out.push(<strong key={key}>{renderInline(m[3], `${key}b`)}</strong>);
    } else {
      out.push(<em key={key}>{m[4] ?? m[5]}</em>);
    }
    last = at + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Renders coach text. `style` applies to the wrapper; paragraphs and lists get even spacing. */
export function Markdown({ text, style }: { text: string; style?: React.CSSProperties }) {
  const blocks = parseBlocks(text);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, ...style }}>
      {blocks.map((b, i) => {
        if (b.kind === "p") {
          return (
            <p key={i} style={{ margin: 0 }}>
              {b.lines.map((l, j) => (
                <Fragment key={j}>
                  {j > 0 && <br />}
                  {renderInline(l, `${i}-${j}-`)}
                </Fragment>
              ))}
            </p>
          );
        }
        const items = b.items.map((it, j) => (
          <li key={j} style={{ marginTop: j > 0 ? 4 : 0 }}>
            {renderInline(it, `${i}-${j}-`)}
          </li>
        ));
        return b.kind === "ul" ? (
          <ul key={i} style={{ margin: 0, paddingLeft: 20, listStyle: "disc" }}>{items}</ul>
        ) : (
          <ol key={i} start={b.start} style={{ margin: 0, paddingLeft: 22, listStyle: "decimal" }}>{items}</ol>
        );
      })}
    </div>
  );
}
