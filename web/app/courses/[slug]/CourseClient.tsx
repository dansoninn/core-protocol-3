"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { DbCourse, DbWeek } from "@/types";

interface DayProgressData {
  blocksComplete: number;
  blocksTotal: number;
  tasksComplete: number;
  tasksTotal: number;
}

interface Props {
  course: DbCourse;
  weeks: DbWeek[];
  purchased: boolean;
  completedDayIds: string[];
  blocksCompleted: number;
  blocksTotal: number;
  userId: string | null;
  dayProgress: Record<string, DayProgressData>;
}

function DayRing({ blocksComplete, blocksTotal }: { blocksComplete: number; blocksTotal: number }) {
  if (blocksTotal === 0) {
    return (
      <div className="w-5 h-5 rounded-full border-2 border-zinc-200 shrink-0" />
    );
  }
  const r = 8;
  const circ = 2 * Math.PI * r;
  const complete = blocksComplete === blocksTotal;
  if (complete) {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" className="shrink-0" aria-hidden="true">
        <circle cx="10" cy="10" r="10" fill="#18181b" />
        <path d="M6 10.5l3 3 5-5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    );
  }
  const dash = (blocksComplete / blocksTotal) * circ;
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" style={{ transform: "rotate(-90deg)" }} className="shrink-0" aria-hidden="true">
      <circle cx="10" cy="10" r={r} fill="none" stroke="#e4e4e7" strokeWidth="2" />
      {blocksComplete > 0 && (
        <circle cx="10" cy="10" r={r} fill="none" stroke="#18181b" strokeWidth="2"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      )}
    </svg>
  );
}

export default function CourseClient({
  course,
  weeks,
  purchased: initialPurchased,
  completedDayIds,
  blocksCompleted,
  blocksTotal,
  userId,
  dayProgress,
}: Props) {
  const [purchased, setPurchased] = useState(initialPurchased);
  const [buying, setBuying] = useState(false);
  const router = useRouter();

  const progressPct =
    blocksTotal > 0 ? Math.round((blocksCompleted / blocksTotal) * 100) : 0;

  const handlePurchase = async () => {
    if (!userId) {
      router.push(`/auth/login?next=/courses/${course.slug}`);
      return;
    }
    setBuying(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("purchases")
      .insert({ user_id: userId, course_id: course.id });
    if (!error) {
      setPurchased(true);
      router.refresh();
    }
    setBuying(false);
  };

  return (
    <main>
      {/* Hero */}
      <div className="relative w-full h-64 sm:h-96 bg-zinc-800 overflow-hidden">
        {course.cover_image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.cover_image}
            alt={course.title}
            className="absolute inset-0 w-full h-full object-cover opacity-60"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-8 pb-8">
          <span className="inline-block text-xs font-semibold bg-white/20 text-white px-3 py-1 rounded-full mb-3 backdrop-blur">
            {course.category}
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight mb-1">
            {course.title}
          </h1>
          {course.instructor && (
            <p className="text-zinc-300 text-sm sm:text-base">
              Leiðbeinandi: {course.instructor}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        {/* Purchase / progress card */}
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            {course.description && (
              <p className="text-zinc-600 text-sm">{course.description}</p>
            )}
            {purchased && blocksTotal > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
                  <span>Framvinda</span>
                  <span>
                    {blocksCompleted}/{blocksTotal} · {progressPct}%
                  </span>
                </div>
                <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-zinc-900 rounded-full transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <p className="text-2xl font-bold text-zinc-900">
              {course.price.toLocaleString("is-IS")} kr.
            </p>
            {purchased ? (
              <span className="text-sm font-semibold text-green-600 flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Námskeið keypt
              </span>
            ) : (
              <button
                onClick={handlePurchase}
                disabled={buying}
                className="bg-zinc-900 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-zinc-700 transition-colors disabled:opacity-50"
              >
                {buying ? "Hinkraðu…" : "Kaupa námskeið"}
              </button>
            )}
          </div>
        </div>

        {/* Curriculum */}
        {weeks.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-zinc-900 mb-4">
              Námskeið — yfirlit
            </h2>
            <div className="space-y-4">
              {weeks.map((week) => (
                <div
                  key={week.id}
                  className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden"
                >
                  <div className="bg-zinc-50 px-5 py-3 border-b border-zinc-100">
                    <h3 className="font-semibold text-zinc-800 text-sm">
                      {week.title}
                    </h3>
                  </div>
                  <ul className="divide-y divide-zinc-50">
                    {week.days.map((day) => {
                      const isComplete = completedDayIds.includes(day.id);
                      const dp = dayProgress[day.id];

                      return (
                        <li key={day.id}>
                          {purchased ? (
                            <Link
                              href={`/courses/${course.slug}/weeks/${week.id}/days/${day.id}`}
                              className="flex items-center gap-3 px-5 py-3.5 hover:bg-zinc-50 transition-colors group"
                            >
                              <DayRing
                                blocksComplete={dp?.blocksComplete ?? 0}
                                blocksTotal={dp?.blocksTotal ?? 0}
                              />
                              <span
                                className={`text-sm flex-1 ${
                                  isComplete
                                    ? "text-zinc-500 line-through"
                                    : "text-zinc-800"
                                }`}
                              >
                                {day.title}
                              </span>
                              {dp && dp.tasksTotal > 0 && (
                                <span className="text-xs text-zinc-400 tabular-nums shrink-0">
                                  {dp.tasksComplete}/{dp.tasksTotal}
                                </span>
                              )}
                              <svg
                                className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 shrink-0"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            </Link>
                          ) : (
                            <div className="flex items-center gap-3 px-5 py-3.5 opacity-50">
                              <svg
                                className="w-5 h-5 text-zinc-400 shrink-0"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                />
                              </svg>
                              <span className="text-sm text-zinc-500">
                                {day.title}
                              </span>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
