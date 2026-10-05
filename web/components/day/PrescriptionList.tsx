import { ArrowLeftRight, Clock, Dumbbell, Gauge, Repeat, Weight, type LucideIcon } from "lucide-react";
import type { BlockIntensity, BlockSide, DbBlock } from "@/types";
import { formatDurationLabel } from "@/lib/dayLogic";

const SIDE_LABELS: Record<BlockSide, string> = {
  each_side: "Báðar hliðar",
  alternating: "Til skiptis",
};

const INTENSITY_LABELS: Record<BlockIntensity, string> = {
  light: "Létt ákefð",
  moderate: "Miðlungs ákefð",
  hard: "Mikil ákefð",
};

type Item = { key: string; Icon: LucideIcon; text: string };

/** Only the prescription fields that are set, each with its icon. */
export default function PrescriptionList({
  block,
}: {
  block: Pick<DbBlock, "duration_sec" | "reps" | "sets" | "load" | "side" | "intensity">;
}) {
  const items: Item[] = [];
  if (block.duration_sec) items.push({ key: "duration", Icon: Clock, text: formatDurationLabel(block.duration_sec) });
  if (block.reps?.trim()) items.push({ key: "reps", Icon: Repeat, text: `${block.reps.trim()} endurtekningar` });
  if (block.sets?.trim()) items.push({ key: "sets", Icon: Dumbbell, text: `${block.sets.trim()} sett` });
  if (block.load?.trim()) items.push({ key: "load", Icon: Weight, text: block.load.trim() });
  if (block.side) items.push({ key: "side", Icon: ArrowLeftRight, text: SIDE_LABELS[block.side] });
  if (block.intensity) items.push({ key: "intensity", Icon: Gauge, text: INTENSITY_LABELS[block.intensity] });

  if (items.length === 0) return null;

  return (
    <ul style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", marginTop: 6, listStyle: "none", padding: 0 }}>
      {items.map(({ key, Icon, text }) => (
        <li key={key} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--muted2)" }}>
          <Icon size={13} style={{ flexShrink: 0 }} />
          {text}
        </li>
      ))}
    </ul>
  );
}
