"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

type Result = { error: unknown };

/**
 * Autosave status for the course builder. Fields save on blur, one by one;
 * this makes those saves visible and guards against leaving with work unsaved.
 *
 * - track(write): wrap a Supabase write. Counts it as pending until it settles.
 * - status: "Vistar…" while any write is pending, "Vistað ✓" for 2 s after the
 *   last one succeeds, "Vistun mistókst" until a later write succeeds.
 * - Unsaved drafts: any input/textarea inside `containerRef` that was typed in
 *   and not yet blurred (a blur is what saves it).
 * - beforeunload warns while there is a pending write, a failed one, or an
 *   unsaved draft. In-app navigation is not intercepted — the builder is one
 *   page; leaving it means closing or reloading the tab.
 */
export function useSaveStatus(containerRef: RefObject<HTMLElement>) {
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(new Set<EventTarget>());

  const track = useCallback(async <T extends Result>(write: PromiseLike<T>): Promise<T> => {
    setPending((n) => n + 1);
    try {
      const result = await write;
      if (result.error) {
        setFailed(true);
      } else {
        setFailed(false);
        setJustSaved(true);
        if (savedTimer.current) clearTimeout(savedTimer.current);
        savedTimer.current = setTimeout(() => setJustSaved(false), 2000);
      }
      return result;
    } catch (err) {
      setFailed(true);
      throw err;
    } finally {
      setPending((n) => n - 1);
    }
  }, []);

  // Drafts: typed-in fields that have not been blurred yet
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const isField = (t: EventTarget | null) =>
      t instanceof HTMLTextAreaElement ||
      (t instanceof HTMLInputElement && !["file", "search", "checkbox", "radio"].includes(t.type));
    const onInput = (e: Event) => {
      if (isField(e.target)) dirty.current.add(e.target as EventTarget);
    };
    const onBlur = (e: Event) => {
      dirty.current.delete(e.target as EventTarget);
    };
    el.addEventListener("input", onInput);
    el.addEventListener("focusout", onBlur);
    return () => {
      el.removeEventListener("input", onInput);
      el.removeEventListener("focusout", onBlur);
    };
  }, [containerRef]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pending > 0 || failed || dirty.current.size > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [pending, failed]);

  useEffect(() => () => {
    if (savedTimer.current) clearTimeout(savedTimer.current);
  }, []);

  const status: "saving" | "failed" | "saved" | null =
    pending > 0 ? "saving" : failed ? "failed" : justSaved ? "saved" : null;

  return { track, status };
}

/** Fixed pill, bottom right. Nothing when idle. */
export function SaveStatusPill({ status }: { status: "saving" | "failed" | "saved" | null }) {
  if (!status) return null;
  const text = status === "saving" ? "Vistar…" : status === "saved" ? "Vistað ✓" : "Vistun mistókst — breyttu reitnum aftur";
  const color = status === "saved" ? "var(--success)" : status === "failed" ? "var(--warm)" : "var(--muted2)";
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        right: 24,
        bottom: 24,
        zIndex: 40,
        padding: "8px 14px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        color,
        background: "var(--surface)",
        border: `1px solid ${status === "saved" ? "var(--success)" : "var(--border)"}`,
        boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
      }}
    >
      {text}
    </div>
  );
}
