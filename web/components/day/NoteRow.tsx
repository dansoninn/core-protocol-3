/** A text block shown inline among the exercises (when the part has its own instructions). */
export default function NoteRow({ text }: { text: string }) {
  return (
    <p
      style={{
        padding: "10px 14px",
        fontSize: 13,
        lineHeight: 1.55,
        color: "var(--muted2)",
        background: "var(--surface2)",
        borderLeft: "2px solid var(--accent-line)",
        borderRadius: 10,
        whiteSpace: "pre-wrap",
      }}
    >
      {text}
    </p>
  );
}
