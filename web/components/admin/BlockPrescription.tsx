"use client";

import type { BlockIntensity, BlockSide } from "@/types";
import {
  DurationInput,
  TextArea,
  TextInput,
  inputStyle,
  labelStyle,
} from "@/components/admin/fields";

export interface BlockPrescriptionValue {
  sets: string | null;
  reps: string | null;
  load: string | null;
  duration_sec: number | null;
  rest_sec: number | null;
  side: BlockSide | null;
  intensity: BlockIntensity | null;
  group_label: string | null;
  content: string | null;
}

export type BlockPrescriptionPatch = Partial<BlockPrescriptionValue>;

/** The tagged exercise as it exists in the exercise bank. */
export interface BankExercise {
  description: string | null;
  video_url: string | null;
  mux_playback_id: string | null;
}

const SIDE_OPTIONS: { value: BlockSide; label: string }[] = [
  { value: "each_side", label: "Báðar hliðar" },
  { value: "alternating", label: "Til skiptis" },
];

const INTENSITY_OPTIONS: { value: BlockIntensity; label: string }[] = [
  { value: "light", label: "Létt" },
  { value: "moderate", label: "Miðlungs" },
  { value: "hard", label: "Mikil" },
];

// Same look as the SET / REPS / LOAD inputs.
const bigInputStyle = {
  width: 64,
  background: "var(--surface2)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  textAlign: "center" as const,
  fontFamily: "var(--font-bebas)",
  fontSize: 20,
  color: "var(--text)",
  outline: "none",
  padding: "4px 4px",
};

const bigLabelStyle = {
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: "0.1em",
  color: "var(--muted2)",
  textTransform: "uppercase" as const,
};

export default function BlockPrescription({
  block,
  exercise,
  onSave,
}: {
  block: BlockPrescriptionValue;
  /** The tagged exercise from the bank, or null when none is tagged yet. */
  exercise: BankExercise | null;
  onSave: (patch: BlockPrescriptionPatch) => void;
}) {
  // Only Mux counts: the user-side player and thumbnail play Mux only, so a
  // legacy video_url is not a video the user can watch.
  const hasMux = Boolean(exercise?.mux_playback_id?.trim());
  const hasLegacyOnly = !hasMux && Boolean(exercise?.video_url?.trim());

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Explanation video in the bank — so a missing one is caught here, not by a user */}
      {exercise && (
        <span style={{ fontSize: 11, color: hasMux ? "var(--success)" : "var(--muted2)" }}>
          {hasMux
            ? "Myndband ✓"
            : hasLegacyOnly
              ? "Gamalt myndband — hlaða upp í Mux"
              : "Vantar útskýringarmyndband"}
        </span>
      )}

      {/* Sets / Reps / Load (unchanged) + Tími / Hvíld */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {([
          { key: "sets", label: "SET", val: block.sets, save: (v: string | null) => onSave({ sets: v }) },
          { key: "reps", label: "REPS", val: block.reps, save: (v: string | null) => onSave({ reps: v }) },
          { key: "load", label: "LOAD", val: block.load, save: (v: string | null) => onSave({ load: v }) },
        ] as const).map(({ key, label, val, save }) => (
          <div key={key} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <input
              defaultValue={val ?? ""}
              onBlur={(e) => { const v = e.target.value.trim() || null; if (v !== (val ?? null)) save(v); }}
              style={bigInputStyle}
              placeholder="—"
            />
            <span style={bigLabelStyle}>{label}</span>
          </div>
        ))}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <DurationInput
            value={block.duration_sec}
            onSave={(duration_sec) => onSave({ duration_sec })}
            placeholder="—"
            style={bigInputStyle}
          />
          <span style={bigLabelStyle}>Tími</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <DurationInput
            value={block.rest_sec}
            onSave={(rest_sec) => onSave({ rest_sec })}
            placeholder="—"
            style={bigInputStyle}
          />
          <span style={bigLabelStyle}>Hvíld</span>
        </div>
      </div>

      {/* Side / Intensity / Group */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 8 }}>
        <label>
          <span style={labelStyle}>Hlið</span>
          <select
            value={block.side ?? ""}
            onChange={(e) => onSave({ side: (e.target.value || null) as BlockSide | null })}
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            <option value="">—</option>
            {SIDE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span style={labelStyle}>Ákefð</span>
          <select
            value={block.intensity ?? ""}
            onChange={(e) => onSave({ intensity: (e.target.value || null) as BlockIntensity | null })}
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            <option value="">—</option>
            {INTENSITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span style={labelStyle}>Hópur</span>
          <TextInput
            value={block.group_label}
            onSave={(group_label) => onSave({ group_label })}
            normalize={(s) => s.toUpperCase()}
            maxLength={4}
            placeholder="A"
            title="Æfingar með sama staf mynda ofursett / samsett"
            style={{
              width: 52,
              textAlign: "center",
              fontWeight: 700,
              border: block.group_label
                ? "1px solid var(--accent-line)"
                : "1px solid var(--border)",
              color: block.group_label ? "var(--accent)" : "var(--text)",
            }}
          />
        </label>
      </div>

      {/* Coach note */}
      <div>
        <span style={labelStyle}>Athugasemd þjálfara</span>
        <TextArea
          value={block.content}
          onSave={(content) => onSave({ content })}
          placeholder={
            exercise?.description?.trim() ||
            "Engin lýsing í æfingabankanum — ekkert birtist ef þetta er tómt."
          }
        />
      </div>
    </div>
  );
}
