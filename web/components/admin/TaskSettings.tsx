"use client";

import type { TaskFormat } from "@/types";
import {
  DurationInput,
  IntInput,
  TextArea,
  TextInput,
  inputStyle,
  labelStyle,
} from "@/components/admin/fields";

export interface TaskSettingsValue {
  instructions: string | null;
  format: TaskFormat;
  work_sec: number | null;
  rest_sec: number | null;
  rounds: number | null;
  time_cap_sec: number | null;
  rep_scheme: string | null;
}

export type TaskSettingsPatch = Partial<TaskSettingsValue>;

type ParamKey = "work_sec" | "rest_sec" | "rounds" | "time_cap_sec" | "rep_scheme";

const PARAM_KEYS: ParamKey[] = ["work_sec", "rest_sec", "rounds", "time_cap_sec", "rep_scheme"];

const FORMAT_LABELS: Record<TaskFormat, string> = {
  sets: "Sett & endurtekningar",
  amrap: "AMRAP",
  emom: "EMOM",
  tabata: "Tabata",
  for_time: "Á tíma",
  rounds: "Hringir",
  interval: "Interval",
  ladder: "Stigi",
  chipper: "Chipper",
};

/** The parameters each format uses, in display order. Everything else is nulled. */
const FORMAT_PARAMS: Record<TaskFormat, ParamKey[]> = {
  sets: [],
  amrap: ["time_cap_sec"],
  emom: ["work_sec", "rounds"],
  tabata: ["work_sec", "rest_sec", "rounds"],
  for_time: ["rounds", "time_cap_sec"],
  rounds: ["rounds", "rest_sec"],
  interval: ["work_sec", "rest_sec", "rounds"],
  ladder: ["rep_scheme", "time_cap_sec"],
  chipper: ["time_cap_sec"],
};

const TABATA_DEFAULTS = { work_sec: 20, rest_sec: 10, rounds: 8 } as const;

function paramLabel(key: ParamKey, format: TaskFormat): string {
  switch (key) {
    case "work_sec":
      return format === "emom" ? "Bil" : "Vinna";
    case "rest_sec":
      return "Hvíld";
    case "rounds":
      return "Hringir";
    case "time_cap_sec":
      if (format === "amrap") return "Lengd";
      return format === "ladder" ? "Tímamörk (valfrjálst)" : "Tímamörk";
    case "rep_scheme":
      return "Endurtekningar";
  }
}

/** Build the patch for a format change: null every unused parameter, prefill Tabata. */
function formatChangePatch(task: TaskSettingsValue, next: TaskFormat): TaskSettingsPatch {
  const used = FORMAT_PARAMS[next];
  const patch: TaskSettingsPatch = { format: next };
  for (const key of PARAM_KEYS) {
    if (!used.includes(key)) patch[key] = null;
  }
  if (next === "tabata") {
    if (task.work_sec == null) patch.work_sec = TABATA_DEFAULTS.work_sec;
    if (task.rest_sec == null) patch.rest_sec = TABATA_DEFAULTS.rest_sec;
    if (task.rounds == null) patch.rounds = TABATA_DEFAULTS.rounds;
  }
  return patch;
}

export default function TaskSettings({
  task,
  onSave,
}: {
  task: TaskSettingsValue;
  onSave: (patch: TaskSettingsPatch) => void;
}) {
  const params = FORMAT_PARAMS[task.format] ?? [];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: "0 16px 16px",
      }}
    >
      <div>
        <span style={labelStyle}>Leiðbeiningar</span>
        <TextArea
          value={task.instructions}
          onSave={(instructions) => onSave({ instructions })}
          placeholder="Leiðbeiningar fyrir þennan lið…"
        />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 10 }}>
        <label>
          <span style={labelStyle}>Snið</span>
          <select
            value={task.format}
            onChange={(e) => onSave(formatChangePatch(task, e.target.value as TaskFormat))}
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            {(Object.keys(FORMAT_LABELS) as TaskFormat[]).map((f) => (
              <option key={f} value={f}>
                {FORMAT_LABELS[f]}
              </option>
            ))}
          </select>
        </label>

        {params.map((key) => (
          <label key={key}>
            <span style={labelStyle}>{paramLabel(key, task.format)}</span>
            {key === "rounds" ? (
              <IntInput
                value={task.rounds}
                onSave={(rounds) => onSave({ rounds })}
                style={{ width: 64, textAlign: "center" }}
              />
            ) : key === "rep_scheme" ? (
              <TextInput
                value={task.rep_scheme}
                onSave={(rep_scheme) => onSave({ rep_scheme })}
                placeholder="2-4-6-8-10 eða 21-15-9"
                style={{ width: 170 }}
              />
            ) : (
              <DurationInput
                value={task[key]}
                onSave={(sec) => onSave({ [key]: sec })}
                style={{ width: 72, textAlign: "center" }}
              />
            )}
          </label>
        ))}
      </div>
    </div>
  );
}

/** One-line hint above a video part's exercise blocks. */
export function VideoPartHint() {
  return (
    <div
      style={{
        padding: "8px 12px",
        fontSize: 12,
        color: "var(--muted2)",
        background: "var(--accent-dim)",
        border: "1px solid var(--accent-line)",
        borderRadius: 8,
      }}
    >
      Æfingarnar sýnast undir myndbandinu til viðmiðunar — notandinn hakar ekki við þær.
    </div>
  );
}
