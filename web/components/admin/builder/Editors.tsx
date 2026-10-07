"use client";

import { useState, type ReactNode } from "react";
import { ChevronRight, Copy, Dumbbell, Pencil, Plus, Type, X } from "lucide-react";
import { useBuilder } from "@/components/admin/builder/state";
import { ActionButton, Chip, DeleteButton, DuplicateButton, MoveButtons, SectionLabel, actionStyle, clock } from "@/components/admin/builder/ui";
import VideoSection from "@/components/admin/builder/VideoSection";
import IconPicker from "@/components/admin/builder/IconPicker";
import TaskSettings, { VideoPartHint } from "@/components/admin/TaskSettings";
import BlockPrescription from "@/components/admin/BlockPrescription";
import QuickTag from "@/components/admin/QuickTag";
import PrescriptionList from "@/components/day/PrescriptionList";
import { TextArea, inputStyle } from "@/components/admin/fields";
import { formatDurationLabel, formatSummary } from "@/lib/dayLogic";
import { PartIconBubble } from "@/lib/partIcons";
import { partReadiness, type BBlock, type BDay, type BTask, type BWeek } from "@/components/admin/builder/types";

const card = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 14,
} as const;

const titleInput = {
  width: "100%",
  background: "transparent",
  border: "1px solid transparent",
  borderRadius: 8,
  padding: "2px 6px",
  marginLeft: -6,
  fontSize: 26,
  fontWeight: 700,
  color: "var(--text)",
  outline: "none",
} as const;

// ─── Breadcrumb ─────────────────────────────────────────────────────────────

function Crumbs({ items }: { items: { label: string; onClick?: () => void }[] }) {
  return (
    <nav aria-label="Staðsetning" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontSize: 13, marginBottom: 16 }}>
      {items.map((it, i) => (
        <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {i > 0 && <ChevronRight size={14} style={{ color: "var(--muted)" }} />}
          {it.onClick ? (
            <button type="button" onClick={it.onClick} style={{ border: "none", background: "none", padding: 0, cursor: "pointer", color: "var(--accent)", fontSize: 13 }}>
              {it.label}
            </button>
          ) : (
            <span style={{ color: "var(--text)", fontWeight: 600 }}>{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

function weekLabel(week: BWeek, weeks: BWeek[]) {
  return `Vika ${weeks.findIndex((w) => w.id === week.id) + 1}`;
}

// ─── Middle pane ────────────────────────────────────────────────────────────

export default function EditorPane() {
  const b = useBuilder();
  if (!b.selectedCourseId) return <Empty>Veldu námskeið vinstra megin.</Empty>;
  if (b.loadingWeeks) return <Empty>Sæki námskeið…</Empty>;
  if (!b.sel) {
    return <Empty>Veldu viku, dag eða lið í trénu vinstra megin — eða „+ Vika“ til að byrja.</Empty>;
  }
  if (b.sel.kind === "week") {
    const week = b.findWeek(b.sel.id);
    return week ? <WeekEditor week={week} /> : <Empty>Vikan fannst ekki.</Empty>;
  }
  if (b.sel.kind === "day") {
    const f = b.findDay(b.sel.id);
    return f ? <DayEditor week={f.week} day={f.day} /> : <Empty>Dagurinn fannst ekki.</Empty>;
  }
  const f = b.findPart(b.sel.id);
  return f ? <PartEditor week={f.week} day={f.day} task={f.task} /> : <Empty>Liðurinn fannst ekki.</Empty>;
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
      <p style={{ maxWidth: 340, textAlign: "center", fontSize: 14, lineHeight: 1.6, color: "var(--muted2)" }}>{children}</p>
    </div>
  );
}

/** A clickable child row (a day in a week, a part in a day). */
function ChildRow({
  index,
  count,
  onMove,
  onOpen,
  lead,
  title,
  meta,
  status,
  moveLabel,
}: {
  moveLabel: string;
  index: number;
  count: number;
  onMove: (dir: "up" | "down") => void;
  onOpen: () => void;
  lead?: ReactNode;
  title: string;
  meta: ReactNode;
  status?: ReactNode;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button")) return;
        onOpen();
      }}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
          e.preventDefault();
          onOpen();
        }
      }}
      style={{ ...card, display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", cursor: "pointer" }}
    >
      <MoveButtons label={moveLabel} canUp={index > 0} canDown={index < count - 1} onUp={() => onMove("up")} onDown={() => onMove("down")} />
      {lead}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{title}</p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>{meta}</div>
      </div>
      {status}
      <ChevronRight size={18} style={{ color: "var(--muted2)", flexShrink: 0 }} />
    </div>
  );
}

function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 12, borderRadius: 12, border: "1px dashed var(--border)", background: "transparent", color: "var(--muted2)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
    >
      <Plus size={15} /> {children}
    </button>
  );
}

// ─── Week ───────────────────────────────────────────────────────────────────

function WeekEditor({ week }: { week: BWeek }) {
  const b = useBuilder();
  const label = weekLabel(week, b.weeks);
  return (
    <div style={{ padding: 24 }}>
      <Crumbs items={[{ label }]} />
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 24 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "var(--accent)" }}>{label.toUpperCase()}</p>
          <input
            key={week.id + week.title}
            defaultValue={week.title}
            aria-label="Heiti viku"
            onBlur={(e) => e.target.value !== week.title && b.updateWeekTitle(week.id, e.target.value)}
            style={{ ...titleInput, fontFamily: "var(--font-bebas)", fontSize: 34, fontWeight: 400, letterSpacing: "0.03em" }}
          />
        </div>
        <DeleteButton label="viku" onConfirm={() => b.deleteWeek(week.id)} />
      </div>

      <SectionLabel>Dagar ({week.days.length})</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {week.days.map((day, i) => (
          <ChildRow
            key={day.id}
            moveLabel="dag"
            index={i}
            count={week.days.length}
            onMove={(dir) => b.moveDay(day.id, dir)}
            onOpen={() => b.select({ kind: "day", id: day.id })}
            title={day.title}
            meta={
              <>
                <Chip>{day.tasks.length} {day.tasks.length === 1 ? "liður" : "liðir"}</Chip>
                {day.description && <span style={{ fontSize: 12, color: "var(--muted2)" }}>{day.description}</span>}
              </>
            }
          />
        ))}
        <AddButton onClick={() => b.addDay(week.id, week.days.length)}>Bæta við degi</AddButton>
      </div>
    </div>
  );
}

// ─── Day ────────────────────────────────────────────────────────────────────

function DayEditor({ week, day }: { week: BWeek; day: BDay }) {
  const b = useBuilder();
  const label = weekLabel(week, b.weeks);
  return (
    <div style={{ padding: 24 }}>
      <Crumbs items={[{ label, onClick: () => b.select({ kind: "week", id: week.id }) }, { label: day.title }]} />
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <input
            key={day.id + day.title}
            defaultValue={day.title}
            aria-label="Heiti dags"
            onBlur={(e) => e.target.value.trim() && e.target.value !== day.title && b.updateDayField(day.id, { title: e.target.value })}
            style={titleInput}
          />
          <div style={{ marginTop: 8 }}>
            <TextArea
              key={day.id}
              value={day.description}
              onSave={(description) => b.updateDayField(day.id, { description: description ?? "" })}
              placeholder="Lýsing — inngangstexti sem birtist efst á deginum…"
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <DuplicateButton onClick={() => b.duplicateDay(day)} />
          <DeleteButton label="degi" onConfirm={() => b.deleteDay(day.id)} />
        </div>
      </div>

      <SectionLabel>Liðir dagsins ({day.tasks.length})</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {day.tasks.map((task, i) => {
          const exCount = task.blocks.filter((x) => x.type === "exercise").length;
          const fmt = formatSummary({ ...task, blocks: [] }).name;
          return (
            <ChildRow
              key={task.id}
              moveLabel="lið"
              index={i}
              count={day.tasks.length}
              onMove={(dir) => b.moveTask(task.id, dir)}
              onOpen={() => b.select({ kind: "part", id: task.id })}
              lead={<PartIconBubble icon={task.icon} color={task.color} size={40} />}
              title={task.name}
              meta={
                <>
                  {fmt && <Chip tone="accent">{fmt}</Chip>}
                  {task.video_url && <Chip>▶ {task.video_duration_sec ? clock(task.video_duration_sec) : "myndband"}</Chip>}
                  <Chip>{exCount} {exCount === 1 ? "æfing" : "æfingar"}</Chip>
                  {partReadiness(task) === "warn" && <Chip tone="accent">Vantar efni</Chip>}
                </>
              }
            />
          );
        })}
        <AddButton onClick={() => b.addTask(day.id, day.tasks.length)}>Bæta við lið</AddButton>
      </div>
    </div>
  );
}

// ─── Part ───────────────────────────────────────────────────────────────────

function PartEditor({ week, day, task }: { week: BWeek; day: BDay; task: BTask }) {
  const b = useBuilder();
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState("");
  const index = day.tasks.findIndex((t) => t.id === task.id);
  const reference = Boolean(task.video_url) && task.exercises_are_reference !== false;
  const exCount = task.blocks.filter((x) => x.type === "exercise").length;
  const fmt = formatSummary({ ...task, blocks: [] }).name;

  const q = query.trim().toLowerCase();
  const results = b.exercises
    .filter((ex) => !q || ex.name.toLowerCase().includes(q) || ex.category.toLowerCase().includes(q))
    .slice(0, 12);

  return (
    <div style={{ padding: 24 }}>
      <Crumbs
        items={[
          { label: weekLabel(week, b.weeks), onClick: () => b.select({ kind: "week", id: week.id }) },
          { label: day.title, onClick: () => b.select({ kind: "day", id: day.id }) },
          { label: task.name },
        ]}
      />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
        <MoveButtons
          label="lið"
          canUp={index > 0}
          canDown={index < day.tasks.length - 1}
          onUp={() => b.moveTask(task.id, "up")}
          onDown={() => b.moveTask(task.id, "down")}
        />
        <IconPicker
          icon={task.icon}
          color={task.color}
          onIcon={(icon) => b.updateTaskField(task.id, { icon })}
          onColor={(color) => b.updateTaskField(task.id, { color })}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <input
            key={task.id + task.name}
            defaultValue={task.name}
            aria-label="Heiti liðar"
            onBlur={(e) => e.target.value.trim() && e.target.value !== task.name && b.updateTaskField(task.id, { name: e.target.value })}
            style={titleInput}
          />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
            {fmt && <Chip tone="accent">{fmt}</Chip>}
            {task.video_url && <Chip>▶ {task.video_duration_sec ? clock(task.video_duration_sec) : "myndband"}</Chip>}
            <Chip>
              {exCount} {exCount === 1 ? "æfing" : "æfingar"}
              {reference && exCount > 0 ? " · viðmið" : ""}
            </Chip>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <DuplicateButton onClick={() => b.duplicateTask(task)} />
          <DeleteButton label="lið" onConfirm={() => b.deleteTask(task.id)} />
        </div>
      </div>

      {/* Video + format/instructions side by side */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 24 }}>
        <div style={{ ...card, flex: "1 1 300px", padding: 16, minWidth: 0 }}>
          <SectionLabel>Myndband (valfrjálst)</SectionLabel>
          <VideoSection
            playbackId={task.video_url}
            durationSec={task.video_duration_sec}
            exercisesAreReference={task.exercises_are_reference !== false}
            uploadStatus={b.taskVideoStatus[task.id] ?? "idle"}
            usedBy={b.videoUsedBy}
            onUpload={(file) => b.uploadTaskVideoMux(task.id, file)}
            onPick={(asset) => b.attachTaskVideo(task.id, asset.playbackId, asset.durationSec)}
            onRemove={() => b.removeTaskVideo(task.id)}
            onReferenceChange={(value) => b.updateTaskField(task.id, { exercises_are_reference: value })}
          />
        </div>
        <div style={{ ...card, flex: "1 1 300px", paddingTop: 16, minWidth: 0 }}>
          <div style={{ padding: "0 16px" }}>
            <SectionLabel>Snið og leiðbeiningar</SectionLabel>
          </div>
          <TaskSettings key={task.id} task={task} onSave={(patch) => b.updateTaskField(task.id, patch)} />
        </div>
      </div>

      {/* Blocks */}
      <SectionLabel
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setPicking((v) => !v);
              }}
              style={{ ...actionStyle, background: "var(--accent)", color: "var(--bg)", borderColor: "var(--accent)" }}
            >
              <Plus size={14} /> Æfing
            </button>
            <ActionButton onClick={() => b.addBlock(task.id, task.blocks.length, "text")} icon={<Type size={13} />}>
              Texti
            </ActionButton>
          </div>
        }
      >
        {reference ? `Æfingar í myndbandinu (${exCount})` : `Æfingar í þessum lið (${task.blocks.length})`}
      </SectionLabel>

      {picking && (
        <div style={{ ...card, padding: 12, marginBottom: 12, borderColor: "var(--accent-line)" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && results[0]) {
                  e.preventDefault();
                  b.addBlock(task.id, task.blocks.length, "exercise", results[0].id);
                  setQuery("");
                } else if (e.key === "Escape") setPicking(false);
              }}
              placeholder="Leita eftir nafni eða flokki — Enter bætir við efstu…"
              style={{ ...inputStyle, flex: 1, height: 34 }}
            />
            <ActionButton onClick={() => setPicking(false)} icon={<X size={13} />}>Loka</ActionButton>
          </div>
          {b.exercises.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--muted2)" }}>Bættu við æfingum í Æfingabanka fyrst.</p>
          ) : results.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--muted2)" }}>Engar æfingar passa.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 6 }}>
              {results.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    b.addBlock(task.id, task.blocks.length, "exercise", ex.id);
                  }}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: 6, borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text)", cursor: "pointer", textAlign: "left" }}
                >
                  <Thumb playbackId={ex.mux_playback_id} size={40} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ex.name}</span>
                    <span style={{ display: "block", fontSize: 11, color: "var(--muted2)" }}>{ex.category}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {reference && (
        <div style={{ marginBottom: 10 }}>
          <VideoPartHint />
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {task.blocks.length === 0 && !picking && (
          <p style={{ ...card, padding: 20, textAlign: "center", fontSize: 13, color: "var(--muted2)" }}>
            Engar æfingar enn — „+ Æfing“ eða „Texti“ hér að ofan.
          </p>
        )}
        {task.blocks.map((block, i) => (
          <BlockCard key={block.id} block={block} index={i} count={task.blocks.length} siblings={task.blocks} />
        ))}
      </div>

      {reference && (
        <div style={{ ...card, marginTop: 12, overflow: "hidden" }}>
          <QuickTag
            exercises={b.exercises}
            taggedExerciseIds={new Set(task.blocks.flatMap((x) => (x.type === "exercise" && x.exercise_id ? [x.exercise_id] : [])))}
            onAdd={(exerciseId) => b.addBlock(task.id, task.blocks.length, "exercise", exerciseId)}
          />
        </div>
      )}
    </div>
  );
}

// ─── Block ──────────────────────────────────────────────────────────────────

function Thumb({ playbackId, size = 64 }: { playbackId: string | null | undefined; size?: number }) {
  const w = Math.round(size * 1.5);
  const box = { width: w, height: size, flexShrink: 0, borderRadius: 10, overflow: "hidden", background: "var(--surface3)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" } as const;
  if (!playbackId?.trim()) {
    return (
      <span style={box} aria-hidden="true">
        <Dumbbell size={Math.round(size * 0.35)} style={{ color: "var(--muted2)" }} />
      </span>
    );
  }
  return (
    <span style={box}>
      {/* eslint-disable-next-line @next/next/no-img-element -- Mux thumbnail */}
      <img src={`https://image.mux.com/${playbackId}/thumbnail.jpg?width=${w * 2}&height=${size * 2}&fit_mode=smartcrop`} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </span>
  );
}

function blockBadge(blocks: BBlock[], index: number): string {
  const key = (x: BBlock | undefined) => (x && x.type === "exercise" ? x.group_label?.trim().toUpperCase() || null : null);
  const label = key(blocks[index]);
  if (label) {
    let start = index;
    while (start > 0 && key(blocks[start - 1]) === label) start--;
    let end = index;
    while (end < blocks.length - 1 && key(blocks[end + 1]) === label) end++;
    if (end > start) return `${label}${index - start + 1}`;
  }
  // Ungrouped: count ungrouped exercises up to here (runs of a label count as grouped)
  let n = 0;
  for (let i = 0; i <= index; i++) {
    const k = key(blocks[i]);
    if (blocks[i].type !== "exercise") continue;
    const grouped = k !== null && (key(blocks[i - 1]) === k || key(blocks[i + 1]) === k);
    if (!grouped) n++;
  }
  return String(n);
}

function BlockCard({ block, index, count, siblings }: { block: BBlock; index: number; count: number; siblings: BBlock[] }) {
  const b = useBuilder();
  const [editing, setEditing] = useState(false);
  const [swapQuery, setSwapQuery] = useState<string | null>(null);
  const ex = b.exercises.find((e) => e.id === block.exercise_id) ?? null;
  // Same labels as the user page (lib/dayLogic.ts → layoutPartBlocks): a run
  // of ≥2 consecutive exercise blocks with one group_label is A1, A2…;
  // everything else is numbered among the ungrouped exercises.
  const badge = blockBadge(siblings, index);
  const note = block.content?.trim() || ex?.description?.trim() || null;

  const actions = (
    <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "flex-start" }}>
      {block.type === "exercise" && (
        <ActionButton onClick={() => setEditing((v) => !v)} icon={<Pencil size={13} />}>
          {editing ? "Loka" : "Breyta"}
        </ActionButton>
      )}
      <ActionButton onClick={() => b.duplicateBlock(block)} icon={<Copy size={13} />}>Afrita</ActionButton>
      <DeleteButton label={block.type === "exercise" ? "æfingu" : "texta"} onConfirm={() => b.deleteBlock(block.id)} />
    </div>
  );

  if (block.type === "text") {
    return (
      <div style={{ ...card, display: "flex", gap: 12, padding: 12, background: "var(--surface2)" }}>
        <MoveButtons label="texta" canUp={index > 0} canDown={index < count - 1} onUp={() => b.moveBlock(block.id, "up", siblings)} onDown={() => b.moveBlock(block.id, "down", siblings)} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "var(--muted2)", marginBottom: 6 }}>TEXTI</p>
          <textarea
            key={block.id}
            defaultValue={block.content ?? ""}
            aria-label="Texti"
            onBlur={(e) => e.target.value !== (block.content ?? "") && b.updateBlockContent(block.id, e.target.value)}
            placeholder="Texti…"
            style={{ ...inputStyle, width: "100%", minHeight: 64, resize: "vertical", lineHeight: 1.5 }}
          />
        </div>
        {actions}
      </div>
    );
  }

  const q = (swapQuery ?? "").trim().toLowerCase();
  return (
    <div style={{ ...card, borderColor: editing ? "var(--accent-line)" : "var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12 }}>
        <MoveButtons label="æfingu" canUp={index > 0} canDown={index < count - 1} onUp={() => b.moveBlock(block.id, "up", siblings)} onDown={() => b.moveBlock(block.id, "down", siblings)} />
        <div style={{ position: "relative" }}>
          <Thumb playbackId={ex?.mux_playback_id} />
          <span style={{ position: "absolute", left: -6, top: -6, minWidth: 22, height: 22, padding: "0 5px", borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--bg)", background: "var(--accent)" }}>
            {badge}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: ex ? "var(--text)" : "var(--accent)" }}>{ex?.name ?? "Engin æfing valin"}</span>
            {ex?.category && <Chip tone="accent">{ex.category}</Chip>}
            {!ex?.mux_playback_id && ex && <Chip>Vantar myndband</Chip>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <PrescriptionList block={block} />
            {block.rest_sec ? <span style={{ fontSize: 12, color: "var(--muted2)", marginTop: 6 }}>Hvíld {formatDurationLabel(block.rest_sec)}</span> : null}
          </div>
          {note && (
            <p style={{ fontSize: 12, color: "var(--muted2)", marginTop: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{note}</p>
          )}
        </div>
        {actions}
      </div>

      {(editing || !ex) && (
        <div style={{ padding: "12px 16px 16px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            {swapQuery === null && ex ? (
              <ActionButton onClick={() => setSwapQuery("")} icon={<Dumbbell size={13} />}>Skipta um æfingu</ActionButton>
            ) : (
              <>
                <input
                  type="search"
                  autoFocus
                  value={swapQuery ?? ""}
                  onChange={(e) => setSwapQuery(e.target.value)}
                  placeholder="Leita að æfingu…"
                  style={{ ...inputStyle, width: "100%", height: 32 }}
                />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6, maxHeight: 90, overflowY: "auto" }}>
                  {b.exercises
                    .filter((e) => !q || e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q))
                    .slice(0, 16)
                    .map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={(ev) => {
                          ev.preventDefault();
                          b.updateBlockExercise(block.id, e.id);
                          setSwapQuery(null);
                        }}
                        style={{ fontSize: 12, padding: "4px 10px", borderRadius: 20, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", cursor: "pointer" }}
                      >
                        {e.name}
                      </button>
                    ))}
                </div>
              </>
            )}
          </div>
          <BlockPrescription block={block} exercise={ex} onSave={(patch) => b.updateBlockFields(block.id, patch)} />
        </div>
      )}
    </div>
  );
}

