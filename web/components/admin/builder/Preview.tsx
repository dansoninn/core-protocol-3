"use client";

import type { MouseEvent } from "react";
import { useBuilder } from "@/components/admin/builder/state";
import PartClient from "@/components/day/PartClient";
import DayOverview from "@/components/day/DayOverview";
import { normalizePart } from "@/lib/dayNormalize";
import type { DayView } from "@/lib/dayLogic";
import type { DbTask } from "@/types";
import type { BDay, BWeek } from "@/components/admin/builder/types";

// The real user pages, fed the builder's unsaved-to-screen state. What shows
// here is what a user sees. Nothing is written: PartClient runs with
// preview=true, and every link is caught — a part link selects that part in
// the builder instead of navigating.

const PHONE_W = 390; // the width the user pages are designed for
const SCALE = 0.8;
const SCREEN_H = 690;

const DAY_HREF = "/__preview/day";

export default function Preview() {
  const b = useBuilder();

  let content: React.ReactNode = <Hint>Veldu dag eða lið til að sjá hvernig það lítur út hjá notanda.</Hint>;
  let dayFound: { week: BWeek; day: BDay } | null = null;
  let partId: string | null = null;

  if (b.sel?.kind === "day") dayFound = b.findDay(b.sel.id);
  if (b.sel?.kind === "part") {
    const f = b.findPart(b.sel.id);
    if (f) {
      dayFound = { week: f.week, day: f.day };
      partId = f.task.id;
    }
  }

  if (dayFound) {
    const { week, day } = dayFound;
    const parts: DbTask[] = day.tasks.map((t) =>
      normalizePart({
        ...t,
        blocks: t.blocks.map((blk) => ({
          ...blk,
          exercises: b.exercises.find((e) => e.id === blk.exercise_id) ?? null,
        })),
      })
    );
    const weekIdx = b.weeks.findIndex((w) => w.id === week.id);
    const view: DayView = {
      userId: "preview",
      isAdmin: false,
      course: { id: b.selectedCourseId, title: b.courses.find((c) => c.id === b.selectedCourseId)?.title ?? "", slug: "preview" },
      week: { id: week.id, title: week.title, number: weekIdx + 1, total: b.weeks.length },
      day: { id: day.id, title: day.title, description: day.description || null, order_index: day.order_index },
      dayHref: DAY_HREF,
      weekDays: week.days.map((d, i) => ({
        id: d.id,
        order_index: i,
        href: null,
        state: d.id === day.id ? "current" : "open",
      })),
      prevDay: null,
      nextDay: null,
    };
    const partIndex = partId ? parts.findIndex((p) => p.id === partId) : -1;
    content =
      partIndex >= 0 ? (
        <PartClient
          key={partId}
          view={view}
          parts={parts}
          partIndex={partIndex}
          initialCompletedBlockIds={[]}
          completedTaskIds={[]}
          preview
        />
      ) : (
        <DayOverview view={view} parts={parts} completedBlockIds={[]} completedTaskIds={[]} />
      );
  }

  // Links inside the preview: part → select it here, day → select the day
  const onClickCapture = (e: MouseEvent) => {
    const a = (e.target as HTMLElement).closest("a");
    if (!a) return;
    e.preventDefault();
    e.stopPropagation();
    const href = a.getAttribute("href") ?? "";
    const m = /\/tasks\/([^/?#]+)/.exec(href);
    if (m) b.select({ kind: "part", id: m[1] });
    else if (href === DAY_HREF && dayFound) b.select({ kind: "day", id: dayFound.day.id });
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontFamily: "var(--font-bebas)", fontSize: 24, letterSpacing: "0.03em", color: "var(--text)", lineHeight: 1 }}>Forskoðun</h2>
        <span style={{ fontSize: 11, color: "var(--muted2)" }}>Eins og notandi sér</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", justifyContent: "center" }}>
        {/* Phone frame */}
        <div
          style={{
            width: PHONE_W * SCALE + 20,
            height: SCREEN_H + 20,
            padding: 10,
            borderRadius: 36,
            background: "var(--surface3)",
            border: "1px solid var(--border)",
            boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
            flexShrink: 0,
          }}
        >
          <div style={{ width: PHONE_W * SCALE, height: SCREEN_H, borderRadius: 28, overflow: "hidden", background: "var(--bg)", position: "relative" }}>
            <div
              onClickCapture={onClickCapture}
              style={{
                width: PHONE_W,
                height: SCREEN_H / SCALE,
                transform: `scale(${SCALE})`,
                transformOrigin: "top left",
                overflowY: "auto",
                overflowX: "hidden",
              }}
            >
              {content}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
      <p style={{ textAlign: "center", fontSize: 16, lineHeight: 1.6, color: "var(--muted2)" }}>{children}</p>
    </div>
  );
}
