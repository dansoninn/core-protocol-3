"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSaveStatus } from "@/components/admin/SaveStatus";
import { REFERENCE_DEFAULT_MIN_SEC, type UploadStatus } from "@/components/admin/builder/VideoSection";
import type { BBlock, BCourse, BDay, BExercise, BTask, BWeek, Selection } from "@/components/admin/builder/types";

// All course-builder state and every write. Components read it through
// useBuilder(); nothing else talks to Supabase.

type DbBlock = BBlock;
type DbTask = BTask;
type DbDay = BDay;
type DbWeek = BWeek;
type DbCourse = BCourse;
type DbExercise = BExercise;

export function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const show = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);
  return { toast, show };
}

export function useBuilderState() {
  const supabase = createClient();
  const { toast, show } = useToast();
  const builderRef = useRef<HTMLDivElement>(null);
  const { track, status: saveStatus } = useSaveStatus(builderRef);
  const [courses, setCourses] = useState<DbCourse[]>([]);
  const [exercises, setExercises] = useState<DbExercise[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [weeks, setWeeks] = useState<DbWeek[]>([]);
  const [loadingWeeks, setLoadingWeeks] = useState(false);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  // What the middle pane edits; the tree highlights it
  const [sel, setSel] = useState<Selection>(null);
  const [showPreview, setShowPreview] = useState(true);
  // Narrow screens start without the preview pane
  useEffect(() => {
    if (window.innerWidth < 1400) setShowPreview(false);
  }, []);
  const [taskVideoStatus, setTaskVideoStatus] = useState<Record<string, UploadStatus>>({});

  // Load courses and exercises on mount
  useEffect(() => {
    Promise.all([
      supabase.from("courses").select("id, title").order("title"),
      supabase.from("exercises").select("id, name, category, description, video_url, mux_playback_id").order("name"),
    ]).then(([courseRes, exRes]) => {
      setCourses((courseRes.data as DbCourse[]) ?? []);
      setExercises((exRes.data as DbExercise[]) ?? []);
    });
  }, [supabase]);

  const loadWeeks = useCallback(
    async (courseId: string) => {
      if (!courseId) return;
      setLoadingWeeks(true);
      const { data } = await supabase
        .from("weeks")
        .select("*, days(*, tasks(*, blocks(*)))")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true });
      const raw = (data as DbWeek[]) ?? [];
      const sorted = raw.map((w) => ({
        ...w,
        days: [...(w.days ?? [])].sort((a, b) => a.order_index - b.order_index).map((d) => ({
          ...d,
          tasks: [...(d.tasks ?? [])].sort((a, b) => a.order_index - b.order_index).map((t) => ({
            ...t,
            blocks: [...(t.blocks ?? [])].sort((a, b) => a.order_index - b.order_index),
          })),
        })),
      }));
      setWeeks(sorted);
      setLoadingWeeks(false);
    },
    [supabase]
  );

  const handleCourseChange = (id: string) => {
    setSelectedCourseId(id);
    setWeeks([]);
    setExpandedWeeks(new Set());
    setExpandedDays(new Set());
    setSel(null);
    if (id) loadWeeks(id);
  };

  const toggleWeek = (weekId: string) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(weekId)) { next.delete(weekId); } else { next.add(weekId); }
      return next;
    });
  };

  const toggleDay = (dayId: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayId)) { next.delete(dayId); } else { next.add(dayId); }
      return next;
    });
  };


  // ── Week operations ──────────────────────────────────────────────────────────

  const moveWeek = async (weekId: string, direction: "up" | "down") => {
    const idx = weeks.findIndex((w) => w.id === weekId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= weeks.length) return;
    const a = weeks[idx];
    const b = weeks[swapIdx];
    await Promise.all([
      supabase.from("weeks").update({ order_index: b.order_index }).eq("id", a.id),
      supabase.from("weeks").update({ order_index: a.order_index }).eq("id", b.id),
    ]);
    setWeeks((prev) =>
      prev
        .map((w) => {
          if (w.id === a.id) return { ...w, order_index: b.order_index };
          if (w.id === b.id) return { ...w, order_index: a.order_index };
          return w;
        })
        .sort((x, y) => x.order_index - y.order_index)
    );
  };

  const addWeek = async () => {
    const order = weeks.length;
    const { error } = await supabase.from("weeks").insert({
      course_id: selectedCourseId,
      title: `Vika ${order + 1}`,
      order_index: order,
    });
    if (error) show(error.message, "error");
    else loadWeeks(selectedCourseId);
  };

  const updateWeekTitle = async (weekId: string, title: string) => {
    const { error } = await track(supabase
      .from("weeks")
      .update({ title })
      .eq("id", weekId));
    if (error) show(error.message, "error");
    else setWeekInState(weekId, { title });
  };

  const deleteWeek = async (weekId: string) => {
    const { error } = await supabase.from("weeks").delete().eq("id", weekId);
    if (error) show(error.message, "error");
    else {
      setSel(null);
      loadWeeks(selectedCourseId);
    }
  };

  // ── Day operations ───────────────────────────────────────────────────────────

  const moveDay = async (dayId: string, direction: "up" | "down") => {
    const week = weeks.find((w) => w.days.some((d) => d.id === dayId));
    if (!week) return;
    const sortedDays = [...week.days].sort((a, b) => a.order_index - b.order_index);
    const idx = sortedDays.findIndex((d) => d.id === dayId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sortedDays.length) return;
    const a = sortedDays[idx];
    const b = sortedDays[swapIdx];
    await Promise.all([
      supabase.from("days").update({ order_index: b.order_index }).eq("id", a.id),
      supabase.from("days").update({ order_index: a.order_index }).eq("id", b.id),
    ]);
    setWeeks((prev) =>
      prev.map((w) => {
        if (!w.days.some((d) => d.id === dayId)) return w;
        return {
          ...w,
          days: w.days
            .map((d) => {
              if (d.id === a.id) return { ...d, order_index: b.order_index };
              if (d.id === b.id) return { ...d, order_index: a.order_index };
              return d;
            })
            .sort((x, y) => x.order_index - y.order_index),
        };
      })
    );
  };

  const addDay = async (weekId: string, weekDaysCount: number) => {
    const { error } = await supabase.from("days").insert({
      week_id: weekId,
      title: `Dagur ${weekDaysCount + 1}`,
      description: "",
      order_index: weekDaysCount,
    });
    if (error) show(error.message, "error");
    else {
      setExpandedWeeks((prev) => {
        const next = new Set(prev);
        next.add(weekId);
        return next;
      });
      loadWeeks(selectedCourseId);
    }
  };

  const updateDayField = async (dayId: string, patch: Partial<Pick<DbDay, "title" | "description">>) => {
    const { error } = await track(supabase.from("days").update(patch).eq("id", dayId));
    if (error) show(error.message, "error");
    else
      setWeeks((prev) =>
        prev.map((w) => ({ ...w, days: w.days.map((d) => (d.id === dayId ? { ...d, ...patch } : d)) }))
      );
  };

  const deleteDay = async (dayId: string) => {
    const weekId = weeks.find((w) => w.days.some((d) => d.id === dayId))?.id;
    const { error } = await supabase.from("days").delete().eq("id", dayId);
    if (error) show(error.message, "error");
    else {
      setSel(weekId ? { kind: "week", id: weekId } : null);
      loadWeeks(selectedCourseId);
    }
  };


  // ── Task operations ──────────────────────────────────────────────────────────

  const addTask = async (dayId: string, taskCount: number) => {
    const { data: newTask, error } = await supabase
      .from("tasks")
      .insert({
        day_id: dayId,
        name: `Liður ${taskCount + 1}`,
        color: "#F5A623",
        order_index: taskCount,
      })
      .select()
      .single();
    if (error) show(error.message, "error");
    else {
      const task = { ...(newTask as DbTask), blocks: [] };
      setWeeks((prev) =>
        prev.map((w) => ({
          ...w,
          days: w.days.map((d) =>
            d.id === dayId ? { ...d, tasks: [...d.tasks, task] } : d
          ),
        }))
      );
      setExpandedDays((prev) => new Set(prev).add(dayId));
      setSel({ kind: "part", id: (newTask as DbTask).id });
    }
  };

  const deleteTask = async (taskId: string) => {
    const dayId = weeks.flatMap((w) => w.days).find((d) => d.tasks.some((t) => t.id === taskId))?.id;
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) show(error.message, "error");
    else {
      setSel(dayId ? { kind: "day", id: dayId } : null);
      loadWeeks(selectedCourseId);
    }
  };

  const moveTask = async (taskId: string, direction: "up" | "down") => {
    const day = weeks.flatMap((w) => w.days).find((d) => d.tasks.some((t) => t.id === taskId));
    if (!day) return;
    const sorted = [...day.tasks].sort((a, b) => a.order_index - b.order_index);
    const idx = sorted.findIndex((t) => t.id === taskId);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[idx];
    const b = sorted[swapIdx];
    // Equal order_index values (older data) would make a swap a no-op
    const aIdx = a.order_index === b.order_index ? swapIdx : b.order_index;
    const bIdx = a.order_index === b.order_index ? idx : a.order_index;
    const [ra, rb] = await Promise.all([
      track(supabase.from("tasks").update({ order_index: aIdx }).eq("id", a.id)),
      track(supabase.from("tasks").update({ order_index: bIdx }).eq("id", b.id)),
    ]);
    if (ra.error || rb.error) {
      show((ra.error ?? rb.error)!.message, "error");
      loadWeeks(selectedCourseId);
      return;
    }
    setWeeks((prev) =>
      prev.map((w) => ({
        ...w,
        days: w.days.map((d) =>
          d.id !== day.id
            ? d
            : {
                ...d,
                tasks: d.tasks
                  .map((t) => (t.id === a.id ? { ...t, order_index: aIdx } : t.id === b.id ? { ...t, order_index: bIdx } : t))
                  .sort((x, y) => x.order_index - y.order_index),
              }
        ),
      }))
    );
  };

  /** Copy a part (and its blocks) to just after itself. */
  const duplicateTask = async (task: DbTask) => {
    const day = weeks.flatMap((w) => w.days).find((d) => d.tasks.some((t) => t.id === task.id));
    if (!day) return;
    const later = day.tasks.filter((t) => t.order_index > task.order_index);
    await Promise.all(
      later.map((t) => supabase.from("tasks").update({ order_index: t.order_index + 1 }).eq("id", t.id))
    );
    const { data: newTask, error } = await supabase
      .from("tasks")
      .insert({
        day_id: day.id,
        name: `${task.name} (afrit)`,
        color: task.color,
        order_index: task.order_index + 1,
        video_url: task.video_url ?? null,
        video_duration_sec: task.video_duration_sec ?? null,
        // Only sent when it differs from the column default, so a copy also
        // works before migration-task-reference.sql has run
        ...(task.exercises_are_reference === false ? { exercises_are_reference: false } : {}),
        ...(task.icon ? { icon: task.icon } : {}),
        instructions: task.instructions ?? null,
        format: task.format ?? "sets",
        work_sec: task.work_sec ?? null,
        rest_sec: task.rest_sec ?? null,
        rounds: task.rounds ?? null,
        time_cap_sec: task.time_cap_sec ?? null,
        rep_scheme: task.rep_scheme ?? null,
      })
      .select()
      .single();
    if (error || !newTask) {
      show(error?.message ?? "Afritun mistókst", "error");
      loadWeeks(selectedCourseId);
      return;
    }
    const newBlocks: DbBlock[] = [];
    for (const block of task.blocks ?? []) {
      const { data: nb } = await supabase
        .from("blocks")
        .insert({
          task_id: (newTask as DbTask).id,
          type: block.type,
          order_index: block.order_index,
          exercise_id: block.exercise_id ?? null,
          content: block.content ?? null,
          sets: block.sets ?? null,
          reps: block.reps ?? null,
          load: block.load ?? null,
          duration_sec: block.duration_sec ?? null,
          rest_sec: block.rest_sec ?? null,
          side: block.side ?? null,
          intensity: block.intensity ?? null,
          group_label: block.group_label ?? null,
        })
        .select()
        .single();
      if (nb) newBlocks.push(nb as DbBlock);
    }
    const copy: DbTask = {
      ...(newTask as DbTask),
      exercises_are_reference: task.exercises_are_reference !== false,
      blocks: newBlocks,
    };
    setWeeks((prev) =>
      prev.map((w) => ({
        ...w,
        days: w.days.map((d) =>
          d.id !== day.id
            ? d
            : {
                ...d,
                tasks: d.tasks
                  .map((t) => (t.order_index > task.order_index ? { ...t, order_index: t.order_index + 1 } : t))
                  .concat(copy)
                  .sort((x, y) => x.order_index - y.order_index),
              }
        ),
      }))
    );
    setSel({ kind: "part", id: copy.id });
    show("Lið afritað");
  };

  /** Attach a Mux video. Longer than a minute (or unknown) → its exercises default to reference. */
  const attachTaskVideo = (taskId: string, playbackId: string, durationSec: number | null) =>
    updateTaskField(taskId, {
      video_url: playbackId,
      video_duration_sec: durationSec,
      exercises_are_reference: durationSec === null || durationSec > REFERENCE_DEFAULT_MIN_SEC,
    });

  const removeTaskVideo = (taskId: string) =>
    updateTaskField(taskId, { video_url: null, video_duration_sec: null });

  /** Where a Mux playback ID is already used — exercise bank and this course's parts. */
  const videoUsedBy = (playbackId: string): string[] => {
    const uses = exercises.filter((e) => e.mux_playback_id === playbackId).map((e) => `æfing ${e.name}`);
    weeks.forEach((w) =>
      w.days.forEach((d) =>
        d.tasks.forEach((t) => {
          if (t.video_url === playbackId) uses.push(`${w.title} · ${d.title} · ${t.name}`);
        })
      )
    );
    return uses;
  };

  const expandAll = () => {
    setExpandedWeeks(new Set(weeks.map((w) => w.id)));
    setExpandedDays(new Set(weeks.flatMap((w) => w.days.map((d) => d.id))));
  };
  const collapseAll = () => {
    setExpandedWeeks(new Set());
    setExpandedDays(new Set());
  };

  const updateTaskField = async (taskId: string, patch: Partial<Pick<DbTask, "name" | "color" | "icon" | "video_url" | "video_duration_sec" | "exercises_are_reference" | "instructions" | "format" | "work_sec" | "rest_sec" | "rounds" | "time_cap_sec" | "rep_scheme">>) => {
    const { error } = await track(supabase.from("tasks").update(patch).eq("id", taskId));
    if (error) show(error.message, "error");
    else setTaskInState(taskId, patch);
  };

  // ── Block operations ─────────────────────────────────────────────────────────

  const addBlock = async (
    taskId: string,
    blockCount: number,
    type: "exercise" | "text",
    exerciseId?: string
  ) => {
    const { data: newBlock, error } = await supabase
      .from("blocks")
      .insert({
        task_id: taskId,
        type,
        order_index: blockCount,
        exercise_id: exerciseId ?? null,
        content: type === "text" ? "" : null,
      })
      .select()
      .single();
    if (error) show(error.message, "error");
    else {
      const block = newBlock as DbBlock;
      setWeeks((prev) =>
        prev.map((w) => ({
          ...w,
          days: w.days.map((d) => ({
            ...d,
            tasks: d.tasks.map((t) =>
              t.id === taskId ? { ...t, blocks: [...t.blocks, block] } : t
            ),
          })),
        }))
      );
    }
  };

  const deleteBlock = async (blockId: string) => {
    const { error } = await supabase.from("blocks").delete().eq("id", blockId);
    if (error) show(error.message, "error");
    else loadWeeks(selectedCourseId);
  };

  /** Copy a block to just after itself. */
  const duplicateBlock = async (block: DbBlock) => {
    const task = weeks.flatMap((w) => w.days.flatMap((d) => d.tasks)).find((t) => t.blocks.some((x) => x.id === block.id));
    if (!task) return;
    const later = task.blocks.filter((x) => x.order_index > block.order_index);
    await Promise.all(
      later.map((x) => supabase.from("blocks").update({ order_index: x.order_index + 1 }).eq("id", x.id))
    );
    const { id: _id, ...rest } = block;
    void _id;
    const { data, error } = await supabase
      .from("blocks")
      .insert({ ...rest, order_index: block.order_index + 1 })
      .select()
      .single();
    if (error || !data) {
      show(error?.message ?? "Afritun mistókst", "error");
      loadWeeks(selectedCourseId);
      return;
    }
    setWeeks((prev) =>
      prev.map((w) => ({
        ...w,
        days: w.days.map((d) => ({
          ...d,
          tasks: d.tasks.map((t) =>
            t.id !== task.id
              ? t
              : {
                  ...t,
                  blocks: t.blocks
                    .map((x) => (x.order_index > block.order_index ? { ...x, order_index: x.order_index + 1 } : x))
                    .concat(data as DbBlock)
                    .sort((x, y) => x.order_index - y.order_index),
                }
          ),
        })),
      }))
    );
  };

  const updateBlockContent = async (blockId: string, content: string) => {
    const { error } = await track(supabase
      .from("blocks")
      .update({ content })
      .eq("id", blockId));
    if (error) show(error.message, "error");
    else setBlockInState(blockId, { content });
  };

  const updateBlockExercise = async (blockId: string, exerciseId: string) => {
    const { error } = await track(supabase
      .from("blocks")
      .update({ exercise_id: exerciseId })
      .eq("id", blockId));
    if (error) show(error.message, "error");
    else setBlockInState(blockId, { exercise_id: exerciseId });
  };

  const clearBlockExercise = async (blockId: string) => {
    const { error } = await track(supabase
      .from("blocks")
      .update({ exercise_id: null })
      .eq("id", blockId));
    if (error) show(error.message, "error");
    else setBlockInState(blockId, { exercise_id: null });
  };

  const duplicateDay = async (day: DbDay) => {
    // Shift all days after this one up by 1
    const week = weeks.find((w) => w.days.some((d) => d.id === day.id));
    if (!week) return;
    const laterDays = week.days.filter((d) => d.order_index > day.order_index);
    await Promise.all(
      laterDays.map((d) =>
        supabase.from("days").update({ order_index: d.order_index + 1 }).eq("id", d.id)
      )
    );

    // Insert new day
    const { data: newDay, error: dayErr } = await supabase
      .from("days")
      .insert({
        week_id: week.id,
        title: `${day.title} (afrit)`,
        description: day.description ?? "",
        order_index: day.order_index + 1,
      })
      .select()
      .single();
    if (dayErr || !newDay) { show(dayErr?.message ?? "Duplicate failed", "error"); return; }

    // Copy tasks and blocks sequentially to preserve order
    const newTasks: DbTask[] = [];
    for (const task of (day.tasks ?? [])) {
      const { data: newTask, error: taskErr } = await supabase
        .from("tasks")
        .insert({
          day_id: (newDay as DbDay).id,
          name: task.name,
          color: task.color,
          order_index: task.order_index,
          video_url: task.video_url ?? null,
          video_duration_sec: task.video_duration_sec ?? null,
          ...(task.exercises_are_reference === false ? { exercises_are_reference: false } : {}),
          ...(task.icon ? { icon: task.icon } : {}),
          instructions: task.instructions ?? null,
          format: task.format ?? "sets",
          work_sec: task.work_sec ?? null,
          rest_sec: task.rest_sec ?? null,
          rounds: task.rounds ?? null,
          time_cap_sec: task.time_cap_sec ?? null,
          rep_scheme: task.rep_scheme ?? null,
        })
        .select()
        .single();
      if (taskErr || !newTask) continue;

      const newBlocks: DbBlock[] = [];
      for (const block of (task.blocks ?? [])) {
        const { data: newBlock } = await supabase
          .from("blocks")
          .insert({
            task_id: (newTask as DbTask).id,
            type: block.type,
            order_index: block.order_index,
            exercise_id: block.exercise_id ?? null,
            content: block.content ?? null,
            sets: block.sets ?? null,
            reps: block.reps ?? null,
            load: block.load ?? null,
            duration_sec: block.duration_sec ?? null,
            rest_sec: block.rest_sec ?? null,
            side: block.side ?? null,
            intensity: block.intensity ?? null,
            group_label: block.group_label ?? null,
          })
          .select()
          .single();
        if (newBlock) newBlocks.push(newBlock as DbBlock);
      }
      newTasks.push({ ...(newTask as DbTask), blocks: newBlocks });
    }

    // Update local state: shift later days, insert duplicated day, re-sort
    const duplicated: DbDay = { ...(newDay as DbDay), tasks: newTasks };
    setWeeks((prev) =>
      prev.map((w) => {
        if (!w.days.some((d) => d.id === day.id)) return w;
        return {
          ...w,
          days: w.days
            .map((d) => (d.order_index > day.order_index ? { ...d, order_index: d.order_index + 1 } : d))
            .concat(duplicated)
            .sort((a, b) => a.order_index - b.order_index),
        };
      })
    );
    setSel({ kind: "day", id: (newDay as DbDay).id });
    show("Degi afritað");
  };

  const updateBlockFields = async (
    blockId: string,
    patch: Partial<Pick<DbBlock, "sets" | "reps" | "load" | "duration_sec" | "rest_sec" | "side" | "intensity" | "group_label" | "content">>
  ) => {
    const { error } = await track(supabase.from("blocks").update(patch).eq("id", blockId));
    if (error) show(error.message, "error");
    else setBlockInState(blockId, patch);
  };

  const uploadTaskVideoMux = async (taskId: string, file: File) => {
    const set = (s: UploadStatus) =>
      setTaskVideoStatus((prev) => ({ ...prev, [taskId]: s }));
    set("requesting");
    try {
      const slotRes = await fetch("/api/mux/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Names the asset in Mux, so the video library can show it
        body: JSON.stringify({ title: file.name.replace(/\.[^.]+$/, "") }),
      });
      if (!slotRes.ok) throw new Error("Failed to create upload slot");
      const { uploadId, uploadUrl } = await slotRes.json();

      set("uploading");
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        // No Content-Type — Mux detects format from the raw bytes
      });
      if (!putRes.ok) throw new Error(`Upload to Mux failed (${putRes.status})`);

      set("processing");
      // Mux assigns the playback ID while the asset is still preparing; the
      // duration only exists once it is ready, so wait for that. One update
      // for both, so the duration can never belong to a previous video.
      let pendingPlaybackId: string | null = null;
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const pollRes = await fetch(`/api/mux/upload?uploadId=${uploadId}`);
        const data = await pollRes.json();
        if (data.status === "errored") {
          throw new Error(data.error ?? "Mux asset processing failed");
        }
        if (data.playbackId) pendingPlaybackId = data.playbackId;
        if (data.playbackId && data.status === "ready") {
          await attachTaskVideo(taskId, data.playbackId, data.durationSec ?? null);
          set("done");
          return;
        }
      }
      // Still preparing after a minute: keep the upload, leave the duration
      // empty — scripts/backfill-video-duration.mjs fills it later.
      if (pendingPlaybackId) {
        await attachTaskVideo(taskId, pendingPlaybackId, null);
        set("done");
        return;
      }
      throw new Error("Timed out waiting for Mux to process the video");
    } catch (err) {
      show(err instanceof Error ? err.message : "Upload failed", "error");
      set("error");
    }
  };

  // ── Local state updaters (no reload) ────────────────────────────────────────

  const setWeekInState = (weekId: string, patch: Partial<DbWeek>) => {
    setWeeks((prev) =>
      prev.map((w) => (w.id === weekId ? { ...w, ...patch } : w))
    );
  };

  const setTaskInState = (taskId: string, patch: Partial<DbTask>) => {
    setWeeks((prev) =>
      prev.map((w) => ({
        ...w,
        days: w.days.map((d) => ({
          ...d,
          tasks: d.tasks.map((t) =>
            t.id === taskId ? { ...t, ...patch } : t
          ),
        })),
      }))
    );
  };

  const setBlockInState = (blockId: string, patch: Partial<DbBlock>) => {
    setWeeks((prev) =>
      prev.map((w) => ({
        ...w,
        days: w.days.map((d) => ({
          ...d,
          tasks: d.tasks.map((t) => ({
            ...t,
            blocks: t.blocks.map((b) =>
              b.id === blockId ? { ...b, ...patch } : b
            ),
          })),
        })),
      }))
    );
  };

  const moveBlock = async (
    blockId: string,
    direction: "up" | "down",
    sortedBlocks: DbBlock[]
  ) => {
    const idx = sortedBlocks.findIndex((b) => b.id === blockId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sortedBlocks.length) return;
    const block = sortedBlocks[idx];
    const other = sortedBlocks[swapIdx];
    await Promise.all([
      supabase.from("blocks").update({ order_index: other.order_index }).eq("id", block.id),
      supabase.from("blocks").update({ order_index: block.order_index }).eq("id", other.id),
    ]);
    // Swap order_index values in local state
    setWeeks((prev) =>
      prev.map((w) => ({
        ...w,
        days: w.days.map((d) => ({
          ...d,
          tasks: d.tasks.map((t) => {
            if (!t.blocks.find((b) => b.id === blockId)) return t;
            const newBlocks = t.blocks
              .map((b) => {
                if (b.id === block.id) return { ...b, order_index: other.order_index };
                if (b.id === other.id) return { ...b, order_index: block.order_index };
                return b;
              })
              .sort((a, b) => a.order_index - b.order_index);
            return { ...t, blocks: newBlocks };
          }),
        })),
      }))
    );
  };

  // ── Drag-to-reorder ──────────────────────────────────────────────────────────

  /**
   * Put a parent's children in `orderedIds` order: order_index becomes the
   * position (0, 1, 2…), which also repairs duplicate indexes in older data.
   * Local state first, then only the rows whose index changed; any failure
   * reloads the course so the screen matches the database.
   */
  const reorder = async (level: "weeks" | "days" | "tasks" | "blocks", parentId: string | null, orderedIds: string[]) => {
    const pos = new Map(orderedIds.map((id, i) => [id, i]));
    const current: { id: string; order_index: number }[] =
      level === "weeks"
        ? weeks
        : level === "days"
        ? weeks.find((w) => w.id === parentId)?.days ?? []
        : level === "tasks"
        ? weeks.flatMap((w) => w.days).find((d) => d.id === parentId)?.tasks ?? []
        : weeks.flatMap((w) => w.days.flatMap((d) => d.tasks)).find((t) => t.id === parentId)?.blocks ?? [];
    const changed = current.filter((x) => pos.has(x.id) && pos.get(x.id) !== x.order_index);
    if (changed.length === 0) return;

    const sortBy = <T extends { id: string; order_index: number }>(list: T[]): T[] =>
      list
        .map((x) => (pos.has(x.id) ? { ...x, order_index: pos.get(x.id)! } : x))
        .sort((a, c) => a.order_index - c.order_index);

    setWeeks((prev) => {
      if (level === "weeks") return sortBy(prev);
      return prev.map((w) => {
        if (level === "days") return w.id === parentId ? { ...w, days: sortBy(w.days) } : w;
        return {
          ...w,
          days: w.days.map((d) => {
            if (level === "tasks") return d.id === parentId ? { ...d, tasks: sortBy(d.tasks) } : d;
            return { ...d, tasks: d.tasks.map((t) => (t.id === parentId ? { ...t, blocks: sortBy(t.blocks) } : t)) };
          }),
        };
      });
    });

    const results = await Promise.all(
      changed.map((x) => track(supabase.from(level).update({ order_index: pos.get(x.id)! }).eq("id", x.id)))
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      show(failed.error.message, "error");
      loadWeeks(selectedCourseId);
    }
  };

  // ── Lookups ──────────────────────────────────────────────────────────────────
  const findWeek = (id: string) => weeks.find((w) => w.id === id) ?? null;
  const findDay = (id: string) => {
    for (const w of weeks) for (const d of w.days) if (d.id === id) return { week: w, day: d };
    return null;
  };
  const findPart = (id: string) => {
    for (const w of weeks)
      for (const d of w.days)
        for (const t of d.tasks) if (t.id === id) return { week: w, day: d, task: t };
    return null;
  };

  /** Select something and open its ancestors in the tree. */
  const select = (next: Selection) => {
    setSel(next);
    if (!next) return;
    if (next.kind === "week") setExpandedWeeks((p) => new Set(p).add(next.id));
    if (next.kind === "day") {
      const f = findDay(next.id);
      if (f) {
        setExpandedWeeks((p) => new Set(p).add(f.week.id));
        setExpandedDays((p) => new Set(p).add(next.id));
      }
    }
    if (next.kind === "part") {
      const f = findPart(next.id);
      if (f) {
        setExpandedWeeks((p) => new Set(p).add(f.week.id));
        setExpandedDays((p) => new Set(p).add(f.day.id));
      }
    }
  };

  return {
    builderRef, toast, show, saveStatus,
    courses, exercises, selectedCourseId, weeks, loadingWeeks,
    expandedWeeks, expandedDays, toggleWeek, toggleDay, expandAll, collapseAll,
    sel, select, showPreview, setShowPreview,
    findWeek, findDay, findPart,
    handleCourseChange,
    moveWeek, addWeek, updateWeekTitle, deleteWeek,
    moveDay, addDay, updateDayField, deleteDay, duplicateDay,
    addTask, deleteTask, moveTask, duplicateTask, updateTaskField,
    attachTaskVideo, removeTaskVideo, videoUsedBy, uploadTaskVideoMux, taskVideoStatus,
    addBlock, deleteBlock, duplicateBlock, moveBlock, reorder,
    updateBlockContent, updateBlockExercise, clearBlockExercise, updateBlockFields,
  };
}

export type BuilderCtx = ReturnType<typeof useBuilderState>;

const Ctx = createContext<BuilderCtx | null>(null);
export const BuilderProvider = Ctx.Provider;

export function useBuilder(): BuilderCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useBuilder outside BuilderProvider");
  return v;
}
