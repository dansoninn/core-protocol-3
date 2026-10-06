"use client";

import { useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Part-level progress (task_progress) — the twin of useBlockProgress, for
 * parts completed as a whole (lib/dayLogic.ts → isWholePart). Un-marking
 * deletes the row, marking upserts it; local state changes only when the
 * write succeeds; one write at a time; router.refresh() afterwards so the day
 * overview is not served from Next's 30s client router cache.
 */
export function useTaskProgress(userId: string, initialCompletedTaskIds: string[]) {
  const router = useRouter();
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(
    new Set(initialCompletedTaskIds)
  );
  const [savingTask, setSavingTask] = useState<string | null>(null);
  const [failedTask, setFailedTask] = useState<string | null>(null);

  const toggleTask = async (e: MouseEvent, taskId: string) => {
    e.preventDefault();
    if (savingTask) return;
    setSavingTask(taskId);
    setFailedTask(null);
    const supabase = createClient();
    const isDone = completedTaskIds.has(taskId);

    const { error } = isDone
      ? await supabase.from("task_progress").delete().eq("user_id", userId).eq("task_id", taskId)
      : await supabase
          .from("task_progress")
          .upsert({ user_id: userId, task_id: taskId }, { onConflict: "user_id,task_id" });

    if (error) {
      setFailedTask(taskId);
    } else {
      setCompletedTaskIds((prev) => {
        const next = new Set(prev);
        if (isDone) next.delete(taskId);
        else next.add(taskId);
        return next;
      });
    }
    setSavingTask(null);
    if (!error) router.refresh();
  };

  return { completedTaskIds, savingTask, failedTask, toggleTask };
}
