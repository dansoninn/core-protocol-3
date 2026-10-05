import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { DbTask } from "@/types";
import {
  exerciseBlocks,
  formatApproxMinutes,
  isPartDone,
  partProgress,
  partTotalSeconds,
  type DayView,
} from "@/lib/dayLogic";
import DayStrip from "@/components/day/DayStrip";
import DayProgress from "@/components/day/DayProgress";
import PartCard from "@/components/day/PartCard";
import PrevNextNav from "@/components/day/PrevNextNav";

/** Day overview: strip, progress, one card per part, prev/next day. Server-rendered. */
export default function DayOverview({
  view,
  parts,
  completedBlockIds,
}: {
  view: DayView;
  parts: DbTask[];
  completedBlockIds: string[];
}) {
  const completed = new Set(completedBlockIds);
  const { done, total } = partProgress(parts, completed);

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "16px 16px 96px" }}>
        <Link
          href={`/courses/${view.course.slug}`}
          style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--muted2)", textDecoration: "none" }}
        >
          <ChevronLeft size={16} />
          {view.course.title}
        </Link>

        <header style={{ marginTop: 14, marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)" }}>
            Vika {view.week.number} af {view.week.total}
          </p>
          <h1 style={{ fontFamily: "var(--font-bebas)", fontSize: 36, lineHeight: 1.05, color: "var(--text)", marginTop: 4 }}>
            {view.day.title}
          </h1>
          {view.day.description && (
            <p style={{ fontSize: 14, lineHeight: 1.55, color: "var(--muted2)", marginTop: 6 }}>{view.day.description}</p>
          )}
        </header>

        <DayStrip days={view.weekDays} />

        <div style={{ marginTop: 16 }}>
          <DayProgress done={done} total={total} />
        </div>

        <section style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted2)", marginBottom: 10 }}>
            Liðir dagsins
          </h2>
          {parts.length === 0 ? (
            <p style={{ fontSize: 14, color: "var(--muted2)" }}>Engir liðir á þessum degi.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {parts.map((part, i) => {
                const seconds = partTotalSeconds(part);
                return (
                  <PartCard
                    key={part.id}
                    href={`${view.dayHref}/tasks/${part.id}`}
                    index={i}
                    name={part.name}
                    done={isPartDone(part, completed)}
                    exerciseCount={exerciseBlocks(part).length}
                    hasVideo={Boolean(part.video_url)}
                    minutesLabel={seconds !== null ? formatApproxMinutes(seconds) : null}
                  />
                );
              })}
            </div>
          )}
        </section>

        <PrevNextNav
          prev={view.prevDay ? { href: view.prevDay.href, label: "Fyrri dagur", title: view.prevDay.title } : null}
          next={
            view.nextDay
              ? {
                  href: view.nextDay.locked && !view.isAdmin ? null : view.nextDay.href,
                  locked: view.nextDay.locked,
                  label: "Næsti dagur",
                  title: view.nextDay.title,
                }
              : null
          }
        />
      </main>
    </div>
  );
}
