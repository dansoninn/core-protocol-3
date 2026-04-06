"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Course } from "@/types";
import { hasPurchased, purchaseCourse, getCompletedDays } from "@/lib/storage";
import VideoPlayer from "@/components/VideoPlayer";

interface Props {
  course: Course;
}

export default function CourseClient({ course }: Props) {
  const [purchased, setPurchased] = useState(false);
  const [completedDays, setCompletedDays] = useState<string[]>([]);

  useEffect(() => {
    setPurchased(hasPurchased(course.id));
    setCompletedDays(getCompletedDays());
  }, [course.id]);

  const handlePurchase = () => {
    purchaseCourse(course.id);
    setPurchased(true);
  };

  const allDays = course.weeks.flatMap((w) => w.days);
  const totalDays = allDays.length;
  const completedCount = allDays.filter((d) => completedDays.includes(d.id)).length;
  const progressPct = totalDays > 0 ? Math.round((completedCount / totalDays) * 100) : 0;

  const freePreviews = allDays.filter((d) => d.isFreePreview);

  return (
    <main>
      {/* Hero */}
      <div className="relative w-full h-64 sm:h-96 bg-zinc-800 overflow-hidden">
        <Image
          src={course.coverImage}
          alt={course.title}
          fill
          className="object-cover opacity-60"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-8 pb-8">
          <span className="inline-block text-xs font-semibold bg-white/20 text-white px-3 py-1 rounded-full mb-3 backdrop-blur">
            {course.category}
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight mb-1">
            {course.title}
          </h1>
          <p className="text-zinc-300 text-sm sm:text-base">
            Leiðbeinandi: {course.instructor}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        {/* Purchase card */}
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-zinc-600 text-sm mb-1">{course.description}</p>
            {purchased && totalDays > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
                  <span>Framvinda</span>
                  <span>
                    {completedCount}/{totalDays} dagar
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
                className="bg-zinc-900 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-zinc-700 transition-colors"
              >
                Kaupa námskeið
              </button>
            )}
          </div>
        </div>

        {/* Free previews */}
        {freePreviews.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-zinc-900 mb-4">
              Ókeypis forskoðun
            </h2>
            <div className="space-y-6">
              {freePreviews.map((day) => (
                <div key={day.id} className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-zinc-100">
                    <span className="text-xs font-semibold bg-green-100 text-green-800 px-2.5 py-1 rounded-full">
                      Ókeypis forskoðun
                    </span>
                    <h3 className="font-semibold text-zinc-900 mt-2">{day.title}</h3>
                  </div>
                  <div className="p-4">
                    <VideoPlayer url={day.videoUrl} title={day.title} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Curriculum */}
        <section>
          <h2 className="text-xl font-bold text-zinc-900 mb-4">
            Námskeið — yfirlit
          </h2>
          <div className="space-y-4">
            {course.weeks.map((week) => (
              <div
                key={week.id}
                className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden"
              >
                <div className="bg-zinc-50 px-5 py-3 border-b border-zinc-100">
                  <h3 className="font-semibold text-zinc-800 text-sm">{week.title}</h3>
                </div>
                <ul className="divide-y divide-zinc-50">
                  {week.days.map((day) => {
                    const isFree = day.isFreePreview;
                    const isComplete = completedDays.includes(day.id);
                    const accessible = purchased || isFree;

                    return (
                      <li key={day.id}>
                        {accessible ? (
                          <Link
                            href={`/courses/${course.slug}/day/${day.id}`}
                            className="flex items-center gap-3 px-5 py-3.5 hover:bg-zinc-50 transition-colors group"
                          >
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border-2 ${
                                isComplete
                                  ? "bg-zinc-900 border-zinc-900"
                                  : "border-zinc-300 group-hover:border-zinc-500"
                              }`}
                            >
                              {isComplete && (
                                <svg
                                  className="w-3 h-3 text-white"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                            </div>
                            <span
                              className={`text-sm flex-1 ${
                                isComplete ? "text-zinc-500 line-through" : "text-zinc-800"
                              }`}
                            >
                              {day.title}
                            </span>
                            {isFree && (
                              <span className="text-xs text-green-700 font-medium bg-green-50 px-2 py-0.5 rounded-full">
                                Ókeypis
                              </span>
                            )}
                            <svg
                              className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600"
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
                            <span className="text-sm text-zinc-500">{day.title}</span>
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
      </div>
    </main>
  );
}
