"use client";

import { useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Block-level progress, moved unchanged from the old DayClient: a done block
 * is un-marked by deleting its progress row, an open one is marked by
 * upserting it; local state changes only when the write succeeds; one write
 * at a time.
 *
 * One addition: router.refresh() after a successful write. Next 14 keeps
 * visited dynamic pages in the client router cache for 30s, so without it
 * "Til baka í dagsyfirlit" could show the overview's progress from before
 * this change. refresh() empties that cache; it does not remount this page or
 * reset its state.
 */
export function useBlockProgress(userId: string, initialCompletedBlockIds: string[]) {
  const router = useRouter();
  const [completedIds, setCompletedIds] = useState<Set<string>>(
    new Set(initialCompletedBlockIds)
  );
  const [saving, setSaving] = useState<string | null>(null);

  const toggle = async (e: MouseEvent, blockId: string) => {
    e.preventDefault();
    if (saving) return;
    setSaving(blockId);
    const supabase = createClient();
    const isDone = completedIds.has(blockId);
    let changed = false;

    if (isDone) {
      const { error } = await supabase
        .from("progress")
        .delete()
        .eq("user_id", userId)
        .eq("block_id", blockId);
      if (!error) {
        changed = true;
        setCompletedIds((prev) => {
          const next = new Set(prev);
          next.delete(blockId);
          return next;
        });
      }
    } else {
      const { error } = await supabase
        .from("progress")
        .upsert(
          { user_id: userId, block_id: blockId },
          { onConflict: "user_id,block_id" }
        );
      if (!error) {
        changed = true;
        setCompletedIds((prev) => {
          const next = new Set(prev);
          next.add(blockId);
          return next;
        });
      }
    }
    setSaving(null);
    if (changed) router.refresh();
  };

  /**
   * Un-mark several blocks in one write. Used by a whole part (a video part)
   * whose tagged exercises were ticked one by one before step 3b.2: its
   * "afmerkja" has to clear those rows, as there is no task_progress row.
   */
  const clear = async (e: MouseEvent, blockIds: string[]) => {
    e.preventDefault();
    const ids = blockIds.filter((id) => completedIds.has(id));
    if (saving || ids.length === 0) return;
    setSaving(ids[0]);
    const supabase = createClient();
    const { error } = await supabase
      .from("progress")
      .delete()
      .eq("user_id", userId)
      .in("block_id", ids);
    if (!error) {
      setCompletedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    }
    setSaving(null);
    if (!error) router.refresh();
  };

  return { completedIds, saving, toggle, clear };
}
