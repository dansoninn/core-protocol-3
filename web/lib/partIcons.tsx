import {
  Activity,
  Armchair,
  Bike,
  BookOpen,
  Brain,
  Dumbbell,
  Flame,
  Footprints,
  HeartPulse,
  Leaf,
  Medal,
  Mountain,
  PersonStanding,
  Play,
  Repeat,
  Sun,
  Target,
  Timer,
  Waves,
  Wind,
  Zap,
  type LucideIcon,
} from "lucide-react";

// A part's icon (tasks.icon) and colour (tasks.color). Fixed list: the coach
// picks one, the key is stored. Unknown or null keys fall back to Dumbbell, so
// adding or removing an entry here never breaks a stored part.

export const PART_ICONS: { key: string; label: string; Icon: LucideIcon }[] = [
  { key: "dumbbell", label: "Lóð", Icon: Dumbbell },
  { key: "flame", label: "Upphitun", Icon: Flame },
  { key: "leaf", label: "Liðleiki", Icon: Leaf },
  { key: "heart-pulse", label: "Þol", Icon: HeartPulse },
  { key: "timer", label: "Tími", Icon: Timer },
  { key: "repeat", label: "Hringir", Icon: Repeat },
  { key: "zap", label: "Kraftur", Icon: Zap },
  { key: "target", label: "Tækni", Icon: Target },
  { key: "person-standing", label: "Jafnvægi", Icon: PersonStanding },
  { key: "footprints", label: "Ganga", Icon: Footprints },
  { key: "bike", label: "Hjól", Icon: Bike },
  { key: "waves", label: "Sund", Icon: Waves },
  { key: "mountain", label: "Úti", Icon: Mountain },
  { key: "wind", label: "Öndun", Icon: Wind },
  { key: "brain", label: "Hugur", Icon: Brain },
  { key: "armchair", label: "Sitjandi", Icon: Armchair },
  { key: "sun", label: "Morgun", Icon: Sun },
  { key: "activity", label: "Hreyfing", Icon: Activity },
  { key: "book-open", label: "Fræðsla", Icon: BookOpen },
  { key: "play", label: "Myndband", Icon: Play },
  { key: "medal", label: "Áskorun", Icon: Medal },
];

/** Background colours for the icon bubble. Content data (stored in tasks.color), not theme tokens. */
export const PART_COLORS: { value: string; label: string }[] = [
  { value: "#F5A623", label: "Gull" },
  { value: "#E5534B", label: "Rauður" },
  { value: "#F08C3A", label: "Appelsínugulur" },
  { value: "#3FBF8F", label: "Grænn" },
  { value: "#2BB3A8", label: "Blágrænn" },
  { value: "#4A90E2", label: "Blár" },
  { value: "#8B6CF0", label: "Fjólublár" },
  { value: "#E05AA0", label: "Bleikur" },
  { value: "#708893", label: "Grár" },
];

export const DEFAULT_PART_COLOR = PART_COLORS[0].value;

export function partIcon(key: string | null | undefined): LucideIcon {
  return PART_ICONS.find((i) => i.key === key)?.Icon ?? Dumbbell;
}

const HEX = /^#[0-9a-fA-F]{6}$/;

/** A safe colour for inline styles — anything that isn't #rrggbb falls back to gold. */
export function partColor(color: string | null | undefined): string {
  return color && HEX.test(color) ? color : DEFAULT_PART_COLOR;
}

/**
 * The part's icon on a tinted bubble of its colour. The tint is the colour at
 * ~18% (hex alpha), the icon the colour itself — readable on dark and light.
 */
export function PartIconBubble({
  icon,
  color,
  size = 44,
}: {
  icon: string | null | undefined;
  color: string | null | undefined;
  size?: number;
}) {
  const Icon = partIcon(icon);
  const c = partColor(color);
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: Math.round(size * 0.3),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `${c}2E`,
        border: `1px solid ${c}66`,
        color: c,
      }}
    >
      <Icon size={Math.round(size * 0.5)} strokeWidth={2.2} />
    </span>
  );
}
