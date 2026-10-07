"use client";

import type { ReactNode } from "react";
import { AlertCircle, ArrowDown, ArrowUp, CheckCircle2, ChevronsDownUp, ChevronsUpDown, Circle, Copy, Plus, Trash2 } from "lucide-react";
import { useBuilder } from "@/components/admin/builder/state";
import RowMenu, { type MenuItem } from "@/components/admin/builder/RowMenu";
import { Chevron, clock } from "@/components/admin/builder/ui";
import { dayReadiness, partReadiness, weekReadiness, type Readiness } from "@/components/admin/builder/types";
import { PartIconBubble } from "@/lib/partIcons";
import { SortableList } from "@/components/admin/builder/Sortable";

function Status({ state, title }: { state: Readiness; title?: string }) {
  const t =
    title ??
    (state === "ready" ? "Tilbúið" : state === "warn" ? "Vantar efni" : "Tómt");
  if (state === "ready") return <CheckCircle2 size={18} aria-label={t} style={{ color: "var(--success)", flexShrink: 0 }} />;
  if (state === "warn") return <AlertCircle size={18} aria-label={t} style={{ color: "var(--accent)", flexShrink: 0 }} />;
  return <Circle size={18} aria-label={t} style={{ color: "var(--muted)", flexShrink: 0 }} />;
}

/** One row of the tree. Click selects; the chevron (when given) also opens/closes. */
function Row({
  depth,
  selected,
  onSelect,
  chevron,
  children,
  menu,
  handle,
}: {
  handle?: ReactNode;
  depth: number;
  selected: boolean;
  onSelect: () => void;
  chevron?: { open: boolean; onToggle: () => void };
  children: ReactNode;
  menu?: ReactNode;
}) {
  return (
    <div
      role="treeitem"
      aria-selected={selected}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        // Only the row itself — not the grip (Space picks it up) or the menu
        if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
          e.preventDefault();
          onSelect();
        }
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginLeft: depth * 14,
        padding: "8px 6px 8px 2px",
        borderRadius: 10,
        cursor: "pointer",
        background: selected ? "var(--accent-dim)" : "transparent",
        border: `1px solid ${selected ? "var(--accent-line)" : "transparent"}`,
      }}
      onMouseEnter={(e) => !selected && (e.currentTarget.style.background = "var(--surface2)")}
      onMouseLeave={(e) => !selected && (e.currentTarget.style.background = "transparent")}
    >
      {handle}
      {chevron ? (
        <button
          type="button"
          aria-label={chevron.open ? "Loka" : "Opna"}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            chevron.onToggle();
          }}
          style={{ width: 22, height: 22, padding: 0, border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <Chevron open={chevron.open} size={16} />
        </button>
      ) : (
        <span style={{ width: 22, flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10 }}>{children}</div>
      {menu}
    </div>
  );
}

const sub = { fontSize: 12, color: "var(--muted2)", marginTop: 1 } as const;
const ellipsis = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } as const;

function AddLink({ depth, onClick, children }: { depth: number; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginLeft: depth * 14 + 34,
        padding: "6px 8px",
        border: "none",
        background: "none",
        fontSize: 12,
        fontWeight: 600,
        color: "var(--muted2)",
        cursor: "pointer",
      }}
    >
      <Plus size={13} /> {children}
    </button>
  );
}

/** Left pane: course → weeks → days → parts, with content status. */
export default function Tree() {
  const b = useBuilder();
  const totalDays = b.weeks.reduce((n, w) => n + w.days.length, 0);
  const totalParts = b.weeks.reduce((n, w) => n + w.days.reduce((m, d) => m + d.tasks.length, 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
          <h2 style={{ minWidth: 0, fontFamily: "var(--font-bebas)", fontSize: 22, letterSpacing: "0.03em", color: "var(--text)", lineHeight: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            Námskeiðsuppbygging
          </h2>
          {b.selectedCourseId && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                b.addWeek();
              }}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 30, padding: "0 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text)", fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}
            >
              <Plus size={14} /> Vika
            </button>
          )}
        </div>
        <select
          value={b.selectedCourseId}
          onChange={(e) => b.handleCourseChange(e.target.value)}
          aria-label="Námskeið"
          style={{ width: "100%", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 10, padding: "9px 12px", fontSize: 14, fontWeight: 600, color: "var(--text)", outline: "none", cursor: "pointer" }}
        >
          <option value="">— Veldu námskeið —</option>
          {b.courses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
        {b.selectedCourseId && !b.loadingWeeks && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
            <span style={{ flex: 1, fontSize: 12, color: "var(--muted2)" }}>
              {b.weeks.length} {b.weeks.length === 1 ? "vika" : "vikur"} · {totalDays} dagar · {totalParts} liðir
            </span>
            <button type="button" title="Opna allt" aria-label="Opna allt" onClick={b.expandAll} style={iconBtn}>
              <ChevronsUpDown size={15} />
            </button>
            <button type="button" title="Loka öllu" aria-label="Loka öllu" onClick={b.collapseAll} style={iconBtn}>
              <ChevronsDownUp size={15} />
            </button>
          </div>
        )}
      </div>

      <div role="tree" aria-label="Uppbygging námskeiðs" style={{ flex: 1, overflowY: "auto", padding: 8 }}>
        {b.loadingWeeks && <p style={{ padding: 16, fontSize: 13, color: "var(--muted2)" }}>Sæki…</p>}
        {!b.selectedCourseId && <p style={{ padding: 16, fontSize: 13, color: "var(--muted2)" }}>Veldu námskeið til að byrja.</p>}
        {b.selectedCourseId && !b.loadingWeeks && b.weeks.length === 0 && (
          <p style={{ padding: 16, fontSize: 13, color: "var(--muted2)" }}>Engar vikur enn — „+ Vika“ efst.</p>
        )}

        <SortableList items={b.weeks} gap={2} onReorder={(ids) => b.reorder("weeks", null, ids)}>
        {(week, weekHandle, wi) => {
          const wOpen = b.expandedWeeks.has(week.id);
          const weekMenu: MenuItem[] = [
            { label: "Færa upp", icon: <ArrowUp size={14} />, disabled: wi === 0, onSelect: () => b.moveWeek(week.id, "up") },
            { label: "Færa niður", icon: <ArrowDown size={14} />, disabled: wi === b.weeks.length - 1, onSelect: () => b.moveWeek(week.id, "down") },
            { label: "Eyða viku", icon: <Trash2 size={14} />, danger: true, confirm: "Eyða viku og öllu í henni?", onSelect: () => b.deleteWeek(week.id) },
          ];
          return (
            <div key={week.id} style={{ marginBottom: 2 }}>
              <Row
                depth={0}
                handle={weekHandle}
                selected={b.sel?.kind === "week" && b.sel.id === week.id}
                onSelect={() => {
                  b.select({ kind: "week", id: week.id });
                }}
                chevron={{ open: wOpen, onToggle: () => b.toggleWeek(week.id) }}
                menu={<RowMenu label={week.title} items={weekMenu} />}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "var(--font-bebas)", fontSize: 18, letterSpacing: "0.03em", color: "var(--text)", lineHeight: 1.1, ...ellipsis }}>
                    Vika {wi + 1}{week.title && week.title !== `Vika ${wi + 1}` ? ` – ${week.title}` : ""}
                  </p>
                </div>
                <span style={{ fontSize: 12, color: "var(--muted2)", flexShrink: 0 }}>{week.days.length} dagar</span>
                <Status state={weekReadiness(week)} />
              </Row>

              {wOpen && (
                <div style={{ position: "relative" }}>
                  <SortableList items={week.days} gap={0} onReorder={(ids) => b.reorder("days", week.id, ids)}>
                  {(day, dayHandle, di) => {
                    const dOpen = b.expandedDays.has(day.id);
                    const dayMenu: MenuItem[] = [
                      { label: "Færa upp", icon: <ArrowUp size={14} />, disabled: di === 0, onSelect: () => b.moveDay(day.id, "up") },
                      { label: "Færa niður", icon: <ArrowDown size={14} />, disabled: di === week.days.length - 1, onSelect: () => b.moveDay(day.id, "down") },
                      { label: "Afrita dag", icon: <Copy size={14} />, onSelect: () => b.duplicateDay(day) },
                      { label: "Eyða degi", icon: <Trash2 size={14} />, danger: true, confirm: "Eyða degi og liðum hans?", onSelect: () => b.deleteDay(day.id) },
                    ];
                    return (
                      <div key={day.id}>
                        <Row
                          depth={1}
                          handle={dayHandle}
                          selected={b.sel?.kind === "day" && b.sel.id === day.id}
                          onSelect={() => b.select({ kind: "day", id: day.id })}
                          chevron={{ open: dOpen, onToggle: () => b.toggleDay(day.id) }}
                          menu={<RowMenu label={day.title} items={dayMenu} />}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", ...ellipsis }}>{day.title}</p>
                            <p style={sub}>{day.tasks.length} {day.tasks.length === 1 ? "liður" : "liðir"}</p>
                          </div>
                          <Status state={dayReadiness(day)} />
                        </Row>

                        {dOpen && (
                          <div style={{ marginLeft: 22, borderLeft: "1px solid var(--border)", paddingLeft: 4 }}>
                            <SortableList items={day.tasks} gap={0} onReorder={(ids) => b.reorder("tasks", day.id, ids)}>
                            {(task, partHandle, ti) => {
                              const exCount = task.blocks.filter((x) => x.type === "exercise").length;
                              const partMenu: MenuItem[] = [
                                { label: "Færa upp", icon: <ArrowUp size={14} />, disabled: ti === 0, onSelect: () => b.moveTask(task.id, "up") },
                                { label: "Færa niður", icon: <ArrowDown size={14} />, disabled: ti === day.tasks.length - 1, onSelect: () => b.moveTask(task.id, "down") },
                                { label: "Afrita lið", icon: <Copy size={14} />, onSelect: () => b.duplicateTask(task) },
                                { label: "Eyða lið", icon: <Trash2 size={14} />, danger: true, confirm: "Eyða lið?", onSelect: () => b.deleteTask(task.id) },
                              ];
                              return (
                                <Row
                                  key={task.id}
                                  depth={0}
                                  handle={partHandle}
                                  selected={b.sel?.kind === "part" && b.sel.id === task.id}
                                  onSelect={() => b.select({ kind: "part", id: task.id })}
                                  menu={<RowMenu label={task.name} items={partMenu} />}
                                >
                                  <PartIconBubble icon={task.icon} color={task.color} size={32} />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", ...ellipsis }}>{task.name}</p>
                                    <p style={{ ...sub, ...ellipsis }}>
                                      {exCount} {exCount === 1 ? "æfing" : "æfingar"}
                                      {task.video_url ? ` · ▶ ${task.video_duration_sec ? clock(task.video_duration_sec) : "myndband"}` : ""}
                                    </p>
                                  </div>
                                  <Status state={partReadiness(task)} />
                                </Row>
                              );
                            }}
                            </SortableList>
                            <AddLink depth={0} onClick={() => b.addTask(day.id, day.tasks.length)}>Liður</AddLink>
                          </div>
                        )}
                      </div>
                    );
                  }}
                  </SortableList>
                  <AddLink depth={1} onClick={() => b.addDay(week.id, week.days.length)}>Dagur</AddLink>
                </div>
              )}
            </div>
          );
        }}
        </SortableList>
      </div>
    </div>
  );
}

const iconBtn = {
  width: 28,
  height: 28,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--surface2)",
  color: "var(--text)",
  cursor: "pointer",
} as const;
