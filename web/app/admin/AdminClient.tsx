"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import MuxPlayer from "@mux/mux-player-react";
import type { BlockIntensity, BlockSide, TaskFormat } from "@/types";
import TaskSettings, { VideoPartHint } from "@/components/admin/TaskSettings";
import QuickTag from "@/components/admin/QuickTag";
import VideoSection, { REFERENCE_DEFAULT_MIN_SEC } from "@/components/admin/builder/VideoSection";
import { Chevron, Chip, DeleteButton, DuplicateButton, ActionButton, HeaderRow, MoveButtons, SectionLabel, clock } from "@/components/admin/builder/ui";
import { formatSummary } from "@/lib/dayLogic";
import { ChevronsDownUp, ChevronsUpDown, Pencil } from "lucide-react";
import BlockPrescription from "@/components/admin/BlockPrescription";
import { formatPrice } from "@/lib/formatPrice";
import { formatNumericDate } from "@/lib/formatDate";
import { SaveStatusPill, useSaveStatus } from "@/components/admin/SaveStatus";

// ─── DB types ─────────────────────────────────────────────────────────────────

interface DbExercise {
  id: string;
  name: string;
  category: string;
  description: string;
  video_url: string | null;
  mux_asset_id: string | null;
  mux_playback_id: string | null;
  created_at: string;
}

interface DbCourse {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  price: number;
  cover_image: string;
  instructor: string;
  created_at: string;
}

interface DbProfile {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

interface DbBlock {
  id: string;
  task_id: string;
  type: "exercise" | "text";
  order_index: number;
  exercise_id: string | null;
  content: string | null;
  sets: string | null;
  reps: string | null;
  load: string | null;
  duration_sec: number | null;
  rest_sec: number | null;
  side: BlockSide | null;
  intensity: BlockIntensity | null;
  group_label: string | null;
}

interface DbTask {
  id: string;
  day_id: string;
  name: string;
  color: string;
  order_index: number;
  video_url: string | null;
  instructions: string | null;
  format: TaskFormat;
  work_sec: number | null;
  rest_sec: number | null;
  rounds: number | null;
  time_cap_sec: number | null;
  rep_scheme: string | null;
  video_duration_sec: number | null;
  /** Absent until migration-task-reference.sql runs — treat anything but false as true. */
  exercises_are_reference?: boolean;
  blocks: DbBlock[];
}

interface DbDay {
  id: string;
  week_id: string;
  title: string;
  description: string;
  order_index: number;
  tasks: DbTask[];
}

interface DbWeek {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
  days: DbDay[];
}

// ─── Style constants ───────────────────────────────────────────────────────────

const inp =
  "w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 transition-colors";

const btnPrimary =
  "text-zinc-900 text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-40 hover:opacity-90";

const btnGhost =
  "bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm font-medium px-4 py-2 rounded-xl hover:bg-zinc-700 transition-colors";

// Admin accent colour — applied inline where Tailwind JIT can't pick up dynamic values
const ACCENT = "#F5A623";


const CATEGORIES = [
  "Styrkur",
  "Þyngdartap",
  "Liðleiki & hreyfigeta",
  "Heilsa & endurnæring",
  "Endurhæfing",
  "Óflokkað",
];

// ─── Shared UI helpers ─────────────────────────────────────────────────────────

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-5 h-5 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
    </div>
  );
}

function Toast({
  msg,
  type = "success",
}: {
  msg: string;
  type?: "success" | "error";
}) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-semibold shadow-xl border ${
        type === "success"
          ? "bg-zinc-900 border-zinc-700 text-zinc-100"
          : "bg-red-950 border-red-800 text-red-300"
      }`}
    >
      {msg}
    </div>
  );
}

function useToast() {
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  const show = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  return { toast, show };
}

function ConfirmDelete({
  label,
  onConfirm,
}: {
  label: string;
  onConfirm: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  if (confirming) {
    return (
      <span className="flex items-center gap-2">
        <button
          onClick={onConfirm}
          className="text-xs text-red-400 hover:text-red-300 font-semibold transition-colors"
        >
          Confirm
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Cancel
        </button>
      </span>
    );
  }
  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs text-zinc-500 hover:text-red-400 transition-colors font-medium"
      aria-label={`Delete ${label}`}
    >
      Delete
    </button>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

type Tab = "exercises" | "courses" | "builder" | "users" | "videos" | "settings" | "analytics";

export default function AdminClient({ initialTab }: { initialTab?: string }) {
  const tab = (initialTab ?? "exercises") as Tab;

  return (
    <div className="text-zinc-100">
      {tab === "exercises" && <ExercisesTab />}
      {tab === "courses" && <CoursesTab />}
      {tab === "builder" && <CourseBuilderTab />}
      {tab === "users" && <UsersTab />}
      {(tab === "videos" || tab === "settings" || tab === "analytics") && (
        <PlaceholderTab
          title={
            tab === "videos" ? "Myndbönd" : tab === "settings" ? "Stillingar" : "Greining"
          }
        />
      )}
    </div>
  );
}

function PlaceholderTab({ title }: { title: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 80,
        color: "var(--muted2)",
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-bebas)",
          fontSize: 28,
          letterSpacing: "0.04em",
          color: "var(--text)",
          marginBottom: 8,
        }}
      >
        {title}
      </p>
      <p style={{ fontSize: 14 }}>Koma bráðum</p>
    </div>
  );
}

// ─── Exercise Bank tab ────────────────────────────────────────────────────────

type ExerciseForm = {
  name: string;
  category: string;
  description: string;
  mux_asset_id: string | null;
  mux_playback_id: string | null;
};

const emptyExercise: ExerciseForm = {
  name: "",
  category: "Styrkur",
  description: "",
  mux_asset_id: null,
  mux_playback_id: null,
};

type UploadStatus = "idle" | "requesting" | "uploading" | "processing" | "done" | "error";

type BulkItem = {
  key: string;
  name: string;
  status: "pending" | "uploading" | "processing" | "done" | "error";
  message: string;
};

function ExercisesTab() {
  const supabase = createClient();
  const { toast, show } = useToast();
  const [exercises, setExercises] = useState<DbExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<ExerciseForm>(emptyExercise);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [previewExercise, setPreviewExercise] = useState<DbExercise | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("exercises")
      .select("*")
      .order("created_at", { ascending: false });
    setExercises((data as DbExercise[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const startEdit = (ex: DbExercise) => {
    setEditId(ex.id);
    setForm({
      name: ex.name,
      category: ex.category,
      description: ex.description ?? "",
      mux_asset_id: ex.mux_asset_id ?? null,
      mux_playback_id: ex.mux_playback_id ?? null,
    });
    setUploadStatus(ex.mux_playback_id ? "done" : "idle");
    setUploadFileName(null);
    setShowForm(true);
  };

  const resetForm = () => {
    setForm(emptyExercise);
    setEditId(null);
    setShowForm(false);
    setUploadStatus("idle");
    setUploadFileName(null);
  };

  const handleVideoFile = async (file: File) => {
    setUploadFileName(file.name);
    setUploadStatus("requesting");
    try {
      const slotRes = await fetch("/api/mux/upload", { method: "POST" });
      if (!slotRes.ok) throw new Error("Failed to create upload slot");
      const { uploadId, uploadUrl } = await slotRes.json();

      setUploadStatus("uploading");
      const putRes = await fetch(uploadUrl, { method: "PUT", body: file });
      if (!putRes.ok) throw new Error(`Upload to Mux failed (${putRes.status})`);

      setUploadStatus("processing");
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const pollRes = await fetch(`/api/mux/upload?uploadId=${uploadId}`);
        const data = await pollRes.json();
        if (data.status === "errored") throw new Error(data.error ?? "Mux asset processing failed");
        if (data.playbackId) {
          setForm((prev) => ({ ...prev, mux_asset_id: data.assetId, mux_playback_id: data.playbackId }));
          setUploadStatus("done");
          return;
        }
      }
      throw new Error("Timed out waiting for Mux to process the video");
    } catch (err) {
      show(err instanceof Error ? err.message : "Upload failed", "error");
      setUploadStatus("error");
    }
  };

  const handleBulkFiles = async (files: FileList) => {
    const items: BulkItem[] = Array.from(files).map((f) => ({
      key: f.name,
      name: f.name.replace(/\.mp4$/i, "").replace(/[-_]/g, " ").trim(),
      status: "pending",
      message: "Waiting…",
    }));
    setBulkItems(items);
    setBulkRunning(true);

    const update = (key: string, patch: Partial<BulkItem>) =>
      setBulkItems((prev) =>
        prev.map((it) => (it.key === key ? { ...it, ...patch } : it))
      );

    for (const file of Array.from(files)) {
      const key = file.name;
      const name = file.name.replace(/\.mp4$/i, "").replace(/[-_]/g, " ").trim();
      try {
        update(key, { status: "uploading", message: "Requesting slot…" });
        const slotRes = await fetch("/api/mux/upload", { method: "POST" });
        const slotData = await slotRes.json();
        if (!slotRes.ok) throw new Error(slotData.error ?? "Failed to create upload slot");
        const { uploadId, uploadUrl } = slotData;

        update(key, { message: "Uploading…" });
        const putRes = await fetch(uploadUrl, { method: "PUT", body: file });
        if (!putRes.ok) throw new Error(`Upload failed (${putRes.status})`);

        update(key, { status: "processing", message: "Processing…" });
        let assetId: string | null = null;
        let playbackId: string | null = null;
        for (let i = 0; i < 30; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          const pollRes = await fetch(`/api/mux/upload?uploadId=${uploadId}`);
          const data = await pollRes.json();
          if (data.status === "errored") throw new Error(data.error ?? "Mux error");
          if (data.playbackId) { assetId = data.assetId; playbackId = data.playbackId; break; }
        }
        if (!playbackId) throw new Error("Timed out");

        update(key, { message: "Saving…" });
        const { error } = await supabase.from("exercises").insert({
          name,
          category: "Óflokkað",
          description: "",
          mux_asset_id: assetId,
          mux_playback_id: playbackId,
        });
        if (error) throw new Error(error.message);

        update(key, { status: "done", message: "Done" });
      } catch (err) {
        update(key, {
          status: "error",
          message: err instanceof Error ? err.message : "Failed",
        });
      }
    }

    setBulkRunning(false);
    load();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    if (editId) {
      const { error } = await supabase.from("exercises").update(form).eq("id", editId);
      if (error) show(error.message, "error");
      else { show("Exercise updated"); resetForm(); load(); }
    } else {
      const { error } = await supabase.from("exercises").insert(form);
      if (error) show(error.message, "error");
      else { show("Exercise added"); resetForm(); load(); }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("exercises").delete().eq("id", id);
    if (error) show(error.message, "error");
    else { show("Deleted"); load(); }
  };

  const uploadLabel: Record<UploadStatus, string> = {
    idle: "Choose video file",
    requesting: "Requesting upload slot…",
    uploading: "Uploading to Mux…",
    processing: "Processing video…",
    done: "Upload complete",
    error: "Upload failed — try again",
  };

  const isUploading = ["requesting", "uploading", "processing"].includes(uploadStatus);
  const bulkDone = bulkItems.filter((i) => i.status === "done").length;

  return (
    <>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      <div className="space-y-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-zinc-100">
            Exercises ({exercises.length})
          </h2>
          <div className="flex items-center gap-2">
            <label className={`${btnGhost} cursor-pointer ${bulkRunning ? "opacity-40 pointer-events-none" : ""}`}>
              <span>Upload Multiple</span>
              <input
                type="file"
                accept="video/mp4"
                multiple
                className="sr-only"
                disabled={bulkRunning}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleBulkFiles(e.target.files);
                  }
                  e.target.value = "";
                }}
              />
            </label>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className={btnPrimary}
                style={{ backgroundColor: ACCENT }}
              >
                + Add Exercise
              </button>
            )}
          </div>
        </div>

        {/* Bulk upload progress */}
        {bulkItems.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {bulkRunning && (
                  <div className="w-3 h-3 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin shrink-0" />
                )}
                <span className="text-sm font-semibold text-zinc-100">
                  Bulk Upload — {bulkDone}/{bulkItems.length} done
                </span>
              </div>
              {!bulkRunning && (
                <button
                  onClick={() => setBulkItems([])}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Dismiss
                </button>
              )}
            </div>
            <div className="divide-y divide-zinc-800/60">
              {bulkItems.map((item) => (
                <div key={item.key} className="flex items-center gap-3 px-5 py-2.5">
                  {/* Status icon */}
                  <div className="shrink-0 w-4 flex items-center justify-center">
                    {item.status === "pending" && (
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                    )}
                    {(item.status === "uploading" || item.status === "processing") && (
                      <div className="w-3 h-3 border border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
                    )}
                    {item.status === "done" && (
                      <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    {item.status === "error" && (
                      <svg className="w-3.5 h-3.5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <span className="flex-1 text-sm text-zinc-100 truncate">{item.name}</span>
                  <span className={`text-xs shrink-0 ${
                    item.status === "done" ? "text-green-500" :
                    item.status === "error" ? "text-red-400" :
                    "text-zinc-500"
                  }`}>
                    {item.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Single exercise form */}
        {showForm && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="font-semibold text-zinc-100 mb-5">
              {editId ? "Edit Exercise" : "New Exercise"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Name">
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={inp}
                    placeholder="Air Squat"
                    required
                  />
                </Field>
                <Field label="Category">
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className={inp}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Video (Mux)">
                  <div className="space-y-2">
                    <label className={`flex items-center gap-3 cursor-pointer ${isUploading ? "pointer-events-none opacity-60" : ""}`}>
                      <span
                        className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                        style={{ backgroundColor: ACCENT, color: "#0F1923" }}
                      >
                        {uploadStatus === "done" ? "Replace" : "Choose file"}
                      </span>
                      <span className="text-xs text-zinc-500 truncate">
                        {uploadFileName ?? (form.mux_playback_id ? `ID: ${form.mux_playback_id}` : "No file chosen")}
                      </span>
                      <input
                        type="file"
                        accept="video/*"
                        className="sr-only"
                        disabled={isUploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleVideoFile(file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {uploadStatus !== "idle" && (
                      <div className="flex items-center gap-2">
                        {isUploading && (
                          <div className="w-3 h-3 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin shrink-0" />
                        )}
                        {uploadStatus === "done" && (
                          <svg className="w-3.5 h-3.5 text-green-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                        {uploadStatus === "error" && (
                          <svg className="w-3.5 h-3.5 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        )}
                        <span className={`text-xs ${uploadStatus === "done" ? "text-green-500" : uploadStatus === "error" ? "text-red-400" : "text-zinc-400"}`}>
                          {uploadLabel[uploadStatus]}
                        </span>
                      </div>
                    )}
                  </div>
                </Field>
              </div>
              <Field label="Description">
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className={`${inp} h-20 resize-none`}
                  placeholder="Short description of the movement..."
                />
              </Field>
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saving || isUploading}
                  className={btnPrimary}
                  style={{ backgroundColor: ACCENT }}
                >
                  {saving ? "Saving…" : editId ? "Save Changes" : "Add Exercise"}
                </button>
                <button type="button" onClick={resetForm} className={btnGhost}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          {loading ? (
            <Spinner />
          ) : exercises.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-12">
              No exercises yet. Add one above.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider hidden sm:table-cell">
                    Category
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider hidden md:table-cell">
                    Video
                  </th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {exercises.map((ex) => (
                  <tr key={ex.id} className="hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-3 font-medium text-zinc-100">{ex.name}</td>
                    <td className="px-6 py-3 text-zinc-400 hidden sm:table-cell">{ex.category}</td>
                    <td className="px-6 py-3 hidden md:table-cell">
                      {ex.mux_playback_id ? (
                        <button
                          onClick={() => setPreviewExercise(ex)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-300 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full hover:border-zinc-500 hover:text-white transition-colors"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                          Mux
                        </button>
                      ) : (
                        <span className="text-xs text-zinc-700">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-4">
                        <button
                          onClick={() => startEdit(ex)}
                          className="text-xs text-zinc-400 hover:text-zinc-100 transition-colors font-medium"
                        >
                          Edit
                        </button>
                        <ConfirmDelete
                          label={ex.name}
                          onConfirm={() => handleDelete(ex.id)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Video preview modal */}
      {previewExercise && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreviewExercise(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl overflow-hidden bg-zinc-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <span className="text-sm font-semibold text-zinc-100 truncate pr-4">
                {previewExercise.name}
              </span>
              <button
                onClick={() => setPreviewExercise(null)}
                className="text-zinc-400 hover:text-white transition-colors shrink-0"
                aria-label="Close preview"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <MuxPlayer
              playbackId={previewExercise.mux_playback_id!}
              streamType="on-demand"
              autoPlay
              style={{ width: "100%", aspectRatio: "16/9" }}
            />
          </div>
        </div>
      )}
    </>
  );
}

// ─── Courses tab ──────────────────────────────────────────────────────────────

type CourseForm = Omit<DbCourse, "id" | "created_at">;

const emptyCourse: CourseForm = {
  title: "",
  slug: "",
  description: "",
  category: "Styrkur",
  price: 0,
  cover_image: "",
  instructor: "",
};

function CoursesTab() {
  const supabase = createClient();
  const { toast, show } = useToast();
  const [courses, setCourses] = useState<DbCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<CourseForm>(emptyCourse);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("courses")
      .select("*")
      .order("created_at", { ascending: false });
    setCourses((data as DbCourse[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const startEdit = (c: DbCourse) => {
    setEditId(c.id);
    setForm({
      title: c.title,
      slug: c.slug,
      description: c.description ?? "",
      category: c.category,
      price: c.price,
      cover_image: c.cover_image ?? "",
      instructor: c.instructor ?? "",
    });
    setImageFile(null);
    setImagePreview(null);
    setShowForm(true);
  };

  const resetForm = () => {
    setForm(emptyCourse);
    setEditId(null);
    setShowForm(false);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;
    setUploading(true);
    const ext = imageFile.name.split(".").pop();
    const path = `${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("course-images")
      .upload(path, imageFile, { upsert: true });
    setUploading(false);
    if (error) { show("Image upload failed: " + error.message, "error"); return null; }
    const { data } = supabase.storage.from("course-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    // Upload image first if a file was selected
    const uploadedUrl = await uploadImage();
    const payload = uploadedUrl ? { ...form, cover_image: uploadedUrl } : form;

    if (editId) {
      const { error } = await supabase.from("courses").update(payload).eq("id", editId);
      if (error) show(error.message, "error");
      else { show("Course updated"); resetForm(); load(); }
    } else {
      const { error } = await supabase.from("courses").insert(payload);
      if (error) show(error.message, "error");
      else { show("Course added"); resetForm(); load(); }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) show(error.message, "error");
    else { show("Deleted"); load(); }
  };

  return (
    <>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-100">
            Courses ({courses.length})
          </h2>
          {!showForm && (
            <button onClick={() => setShowForm(true)} className={btnPrimary} style={{ backgroundColor: ACCENT }}>
              + Add Course
            </button>
          )}
        </div>

        {showForm && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="font-semibold text-zinc-100 mb-5">
              {editId ? "Edit Course" : "New Course"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Title">
                  <input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className={inp}
                    placeholder="Strength in 12 Weeks"
                    required
                  />
                </Field>
                <Field label="Slug">
                  <input
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    className={inp}
                    placeholder="strength-in-12-weeks"
                    required
                  />
                </Field>
                <Field label="Instructor">
                  <input
                    value={form.instructor}
                    onChange={(e) =>
                      setForm({ ...form, instructor: e.target.value })
                    }
                    className={inp}
                    placeholder="Coach Name"
                  />
                </Field>
                <Field label="Price (ISK)">
                  <input
                    type="number"
                    min={0}
                    value={form.price}
                    onChange={(e) =>
                      setForm({ ...form, price: Number(e.target.value) })
                    }
                    className={inp}
                  />
                </Field>
                <Field label="Category">
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                    className={inp}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Cover Image">
                  <div className="space-y-3">
                    {/* File upload */}
                    <label className="flex items-center gap-3 cursor-pointer">
                      <span
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                        style={{ backgroundColor: ACCENT, color: "#0F1923" }}
                      >
                        {uploading ? "Uploading…" : "Choose file"}
                      </span>
                      <span className="text-xs text-zinc-500 truncate">
                        {imageFile ? imageFile.name : "No file chosen"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="sr-only"
                      />
                    </label>
                    {/* Preview */}
                    {(imagePreview ?? form.cover_image) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imagePreview ?? form.cover_image}
                        alt="Preview"
                        className="w-full h-32 object-cover rounded-xl border border-zinc-700"
                      />
                    )}
                    {/* URL fallback */}
                    <input
                      value={form.cover_image}
                      onChange={(e) =>
                        setForm({ ...form, cover_image: e.target.value })
                      }
                      className={inp}
                      placeholder="Or paste image URL…"
                    />
                  </div>
                </Field>
              </div>
              <Field label="Description">
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className={`${inp} h-20 resize-none`}
                  placeholder="What students will achieve..."
                />
              </Field>
              <div className="flex items-center gap-3 pt-1">
                <button type="submit" disabled={saving} className={btnPrimary} style={{ backgroundColor: ACCENT }}>
                  {saving ? "Saving…" : editId ? "Save Changes" : "Add Course"}
                </button>
                <button type="button" onClick={resetForm} className={btnGhost}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          {loading ? (
            <Spinner />
          ) : courses.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-12">
              No courses yet. Add one above.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider hidden sm:table-cell">
                    Slug
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider hidden md:table-cell">
                    Category
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider hidden md:table-cell">
                    Price
                  </th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {courses.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-zinc-800/50 transition-colors"
                  >
                    <td className="px-6 py-3 font-medium text-zinc-100">
                      {c.title}
                    </td>
                    <td className="px-6 py-3 text-zinc-400 font-mono text-xs hidden sm:table-cell">
                      /{c.slug}
                    </td>
                    <td className="px-6 py-3 text-zinc-400 hidden md:table-cell">
                      {c.category}
                    </td>
                    <td className="px-6 py-3 text-zinc-400 hidden md:table-cell">
                      {formatPrice(c.price)} kr.
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-4">
                        <button
                          onClick={() => startEdit(c)}
                          className="text-xs text-zinc-400 hover:text-zinc-100 transition-colors font-medium"
                        >
                          Edit
                        </button>
                        <ConfirmDelete
                          label={c.title}
                          onConfirm={() => handleDelete(c.id)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Course Builder tab ────────────────────────────────────────────────────────

function CourseBuilderTab() {
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
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [dayForms, setDayForms] = useState<Record<string, Partial<DbDay>>>({});
  const [showExSelectForTask, setShowExSelectForTask] = useState<string | null>(null);
  const [exSearchForTask, setExSearchForTask] = useState<Record<string, string>>({});
  const [exBlockSearch, setExBlockSearch] = useState<Record<string, string>>({});
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
    setExpandedTasks(new Set());
    setEditingDay(null);
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

  const toggleTask = (taskId: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) { next.delete(taskId); } else { next.add(taskId); }
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
    else loadWeeks(selectedCourseId);
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

  const saveDay = async (dayId: string) => {
    const patch = dayForms[dayId];
    if (!patch) return;
    const { error } = await supabase.from("days").update(patch).eq("id", dayId);
    if (error) show(error.message, "error");
    else {
      show("Day saved");
      setEditingDay(null);
      loadWeeks(selectedCourseId);
    }
  };

  const deleteDay = async (dayId: string) => {
    const { error } = await supabase.from("days").delete().eq("id", dayId);
    if (error) show(error.message, "error");
    else loadWeeks(selectedCourseId);
  };

  const startEditDay = (day: DbDay) => {
    setEditingDay(day.id);
    setDayForms((prev) => ({
      ...prev,
      [day.id]: {
        title: day.title,
        description: day.description ?? "",
      },
    }));
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
      setExpandedTasks((prev) => {
        const next = new Set(prev);
        next.add((newTask as DbTask).id);
        return next;
      });
    }
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) show(error.message, "error");
    else loadWeeks(selectedCourseId);
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
    setExpandedTasks(new Set());
  };

  const updateTaskField = async (taskId: string, patch: Partial<Pick<DbTask, "name" | "color" | "video_url" | "video_duration_sec" | "exercises_are_reference" | "instructions" | "format" | "work_sec" | "rest_sec" | "rounds" | "time_cap_sec" | "rep_scheme">>) => {
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
        title: `${day.title} (copy)`,
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
    show("Day duplicated");
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

  // ── Shared inline style helpers ───────────────────────────────────────────────
  const dashedAddBtn = {
    width: "100%",
    background: "transparent",
    border: "1px dashed var(--border)",
    borderRadius: 10,
    padding: 12,
    color: "var(--muted2)",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  } as const;

  const addBlockBtn = {
    flex: 1,
    background: "var(--surface)",
    border: "1px dashed var(--border)",
    borderRadius: 10,
    padding: "10px 16px",
    color: "var(--muted2)",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  } as const;

  const totalParts = weeks.reduce((n, w) => n + w.days.reduce((m, d) => m + d.tasks.length, 0), 0);

  return (
    <div ref={builderRef}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      <SaveStatusPill status={saveStatus} />

      {/* Toolbar — stays in view while scrolling a long course */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 5,
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          padding: "12px 0",
          marginBottom: 12,
          background: "var(--bg)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <select
          value={selectedCourseId}
          onChange={(e) => handleCourseChange(e.target.value)}
          style={{
            flex: "1 1 280px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text)",
            outline: "none",
            cursor: "pointer",
          }}
        >
          <option value="">— Veldu námskeið —</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
        {selectedCourseId && !loadingWeeks && weeks.length > 0 && (
          <>
            <span style={{ fontSize: 12, color: "var(--muted2)" }}>
              {weeks.length} {weeks.length === 1 ? "vika" : "vikur"} · {totalParts} liðir
            </span>
            <ActionButton onClick={expandAll} icon={<ChevronsUpDown size={13} />}>Opna allt</ActionButton>
            <ActionButton onClick={collapseAll} icon={<ChevronsDownUp size={13} />}>Loka öllu</ActionButton>
          </>
        )}
      </div>

      {selectedCourseId && (
        <div>
          {loadingWeeks ? (
            <Spinner />
          ) : (
            <>
              {weeks.length === 0 && (
                <p style={{ color: "var(--muted2)", textAlign: "center", padding: "32px 0", fontSize: 14 }}>
                  Engar vikur enn. Bættu við fyrstu vikunni hér að neðan.
                </p>
              )}

              {weeks.map((week, weekIdx) => {
                const weekExpanded = expandedWeeks.has(week.id);
                const weekParts = week.days.reduce((n, d) => n + d.tasks.length, 0);
                return (
                  <section
                    key={week.id}
                    style={{
                      background: "var(--surface)",
                      border: `1px solid ${weekExpanded ? "var(--accent-line)" : "var(--border)"}`,
                      borderRadius: 16,
                      marginBottom: 14,
                    }}
                  >
                    {/* ── Week header ── */}
                    <HeaderRow open={weekExpanded} onToggle={() => toggleWeek(week.id)} style={{ padding: "14px 16px" }}>
                      <MoveButtons
                        label="viku"
                        canUp={weekIdx > 0}
                        canDown={weekIdx < weeks.length - 1}
                        onUp={() => moveWeek(week.id, "up")}
                        onDown={() => moveWeek(week.id, "down")}
                      />
                      <Chevron open={weekExpanded} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "var(--accent)" }}>
                          VIKA {weekIdx + 1}
                        </span>
                        <input
                          key={week.title}
                          defaultValue={week.title}
                          aria-label="Heiti viku"
                          onBlur={(e) => { if (e.target.value !== week.title) updateWeekTitle(week.id, e.target.value); }}
                          style={{ width: "100%", background: "transparent", border: "none", fontFamily: "var(--font-bebas)", fontSize: 24, letterSpacing: "0.03em", color: "var(--text)", outline: "none", cursor: "text", padding: 0 }}
                        />
                      </div>
                      <Chip>{week.days.length} {week.days.length === 1 ? "dagur" : "dagar"}</Chip>
                      <Chip>{weekParts} liðir</Chip>
                      <DeleteButton label="viku" onConfirm={() => deleteWeek(week.id)} />
                    </HeaderRow>

                    {/* ── Days ── */}
                    {weekExpanded && (
                      <div style={{ padding: "4px 16px 16px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 10 }}>
                        {(week.days ?? []).map((day, dayIdx) => {
                          const isEditing = editingDay === day.id;
                          const f = dayForms[day.id] ?? {};
                          const totalDays = week.days?.length ?? 0;
                          const dayExpanded = expandedDays.has(day.id);
                          const dayVideos = day.tasks.filter((t) => t.video_url).length;

                          return (
                            <div
                              key={day.id}
                              style={{
                                marginTop: 10,
                                background: "var(--surface2)",
                                border: "1px solid var(--border)",
                                borderLeft: `3px solid ${dayExpanded ? "var(--accent)" : "var(--border)"}`,
                                borderRadius: 12,
                              }}
                            >
                              {isEditing ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "14px 16px" }}>
                                  <Field label="Titill">
                                    <input value={f.title ?? ""} onChange={(e) => setDayForms((prev) => ({ ...prev, [day.id]: { ...prev[day.id], title: e.target.value } }))} className={inp} />
                                  </Field>
                                  <Field label="Lýsing">
                                    <textarea value={f.description ?? ""} onChange={(e) => setDayForms((prev) => ({ ...prev, [day.id]: { ...prev[day.id], description: e.target.value } }))} className={`${inp} h-20 resize-none`} placeholder="Inngangstexti sem birtist efst á þessum degi…" />
                                  </Field>
                                  <div style={{ display: "flex", gap: 8 }}>
                                    <button onClick={() => saveDay(day.id)} className={btnPrimary} style={{ backgroundColor: ACCENT }}>Vista dag</button>
                                    <button onClick={() => setEditingDay(null)} className={btnGhost}>Hætta við</button>
                                  </div>
                                </div>
                              ) : (
                                <HeaderRow open={dayExpanded} onToggle={() => toggleDay(day.id)} style={{ padding: "12px 14px" }}>
                                  <MoveButtons
                                    label="dag"
                                    canUp={dayIdx > 0}
                                    canDown={dayIdx < totalDays - 1}
                                    onUp={() => moveDay(day.id, "up")}
                                    onDown={() => moveDay(day.id, "down")}
                                  />
                                  <Chevron open={dayExpanded} size={16} />
                                  <span
                                    style={{
                                      flexShrink: 0,
                                      fontFamily: "var(--font-bebas)",
                                      fontSize: 15,
                                      lineHeight: 1,
                                      padding: "5px 7px",
                                      borderRadius: 6,
                                      color: dayExpanded ? "var(--accent)" : "var(--muted2)",
                                      background: dayExpanded ? "var(--accent-dim)" : "var(--surface3)",
                                    }}
                                  >
                                    D{dayIdx + 1}
                                  </span>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{day.title}</p>
                                    {day.description && (
                                      <p style={{ fontSize: 12, color: "var(--muted2)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{day.description}</p>
                                    )}
                                  </div>
                                  <Chip>{day.tasks.length} {day.tasks.length === 1 ? "liður" : "liðir"}</Chip>
                                  {dayVideos > 0 && <Chip>▶ {dayVideos}</Chip>}
                                  <ActionButton onClick={() => startEditDay(day)} icon={<Pencil size={13} />}>Breyta</ActionButton>
                                  <DuplicateButton onClick={() => duplicateDay(day)} />
                                  <DeleteButton label="degi" onConfirm={() => deleteDay(day.id)} />
                                </HeaderRow>
                              )}

                              {/* ── Parts ── */}
                              {dayExpanded && (
                                <div style={{ padding: "4px 12px 12px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 8 }}>
                                  {(day.tasks ?? []).map((task, taskIdx) => {
                                    const taskExpanded = expandedTasks.has(task.id);
                                    const borderColor = task.color || "var(--accent)";
                                    const exerciseCount = task.blocks.filter((b) => b.type === "exercise").length;
                                    const formatName = formatSummary({ ...task, blocks: [] }).name;
                                    const reference = Boolean(task.video_url) && task.exercises_are_reference !== false;
                                    return (
                                      <div
                                        key={task.id}
                                        style={{
                                          marginTop: 8,
                                          background: "var(--surface)",
                                          border: `1px solid ${taskExpanded ? "var(--accent-line)" : "var(--border)"}`,
                                          borderLeft: `4px solid ${borderColor}`,
                                          borderRadius: 10,
                                          boxShadow: taskExpanded ? "0 6px 20px rgba(0,0,0,0.18)" : "none",
                                        }}
                                      >
                                        {/* Part header — click anywhere to open */}
                                        <HeaderRow open={taskExpanded} onToggle={() => toggleTask(task.id)} style={{ padding: "10px 12px" }}>
                                          <MoveButtons
                                            label="lið"
                                            canUp={taskIdx > 0}
                                            canDown={taskIdx < day.tasks.length - 1}
                                            onUp={() => moveTask(task.id, "up")}
                                            onDown={() => moveTask(task.id, "down")}
                                          />
                                          <Chevron open={taskExpanded} size={16} />
                                          <span style={{ flexShrink: 0, width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "var(--muted2)", background: "var(--surface2)", border: "1px solid var(--border)" }}>
                                            {taskIdx + 1}
                                          </span>
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            {taskExpanded ? (
                                              <input
                                                key={task.name}
                                                defaultValue={task.name}
                                                aria-label="Heiti liðar"
                                                onBlur={(e) => { if (e.target.value !== task.name) updateTaskField(task.id, { name: e.target.value }); }}
                                                style={{ width: "100%", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", fontSize: 15, fontWeight: 700, color: "var(--text)", outline: "none" }}
                                              />
                                            ) : (
                                              <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.name}</p>
                                            )}
                                          </div>
                                          {formatName && <Chip tone="accent">{formatName}</Chip>}
                                          {task.video_url && <Chip>▶ {task.video_duration_sec ? clock(task.video_duration_sec) : "myndband"}</Chip>}
                                          <Chip>{exerciseCount} {exerciseCount === 1 ? "æfing" : "æfingar"}{reference && exerciseCount > 0 ? " · viðmið" : ""}</Chip>
                                          <DuplicateButton onClick={() => duplicateTask(task)} />
                                          <DeleteButton label="lið" onConfirm={() => deleteTask(task.id)} />
                                        </HeaderRow>

                                        {/* Part body — three labelled sections */}
                                        {taskExpanded && (
                                          <div style={{ borderTop: "1px solid var(--border)" }}>
                                            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
                                              <SectionLabel>Myndband</SectionLabel>
                                              <VideoSection
                                                playbackId={task.video_url}
                                                durationSec={task.video_duration_sec}
                                                exercisesAreReference={task.exercises_are_reference !== false}
                                                uploadStatus={taskVideoStatus[task.id] ?? "idle"}
                                                usedBy={videoUsedBy}
                                                onUpload={(file) => uploadTaskVideoMux(task.id, file)}
                                                onPick={(asset) => attachTaskVideo(task.id, asset.playbackId, asset.durationSec)}
                                                onRemove={() => removeTaskVideo(task.id)}
                                                onReferenceChange={(value) => updateTaskField(task.id, { exercises_are_reference: value })}
                                              />
                                            </div>

                                            <div style={{ padding: "14px 16px 4px" }}>
                                              <SectionLabel>Snið og leiðbeiningar</SectionLabel>
                                            </div>
                                            <TaskSettings task={task} onSave={(patch) => updateTaskField(task.id, patch)} />

                                            <div style={{ padding: "14px 16px", borderTop: "1px solid var(--border)" }}>
                                              <SectionLabel>
                                                {reference ? `Æfingar í myndbandinu (${exerciseCount})` : `Æfingar og texti (${task.blocks.length})`}
                                              </SectionLabel>
                                              {reference && <VideoPartHint />}

                                              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: reference ? 8 : 0 }}>
                                                {(task.blocks ?? []).map((block, blockIdx) => {
                                                  const isLast = blockIdx === (task.blocks?.length ?? 1) - 1;
                                                  const bankExercise = exercises.find((e) => e.id === block.exercise_id) ?? null;
                                                  return (
                                                    <div
                                                      key={block.id}
                                                      style={{
                                                        display: "flex",
                                                        alignItems: "flex-start",
                                                        gap: 12,
                                                        padding: "12px 12px",
                                                        borderRadius: 10,
                                                        border: "1px solid var(--border)",
                                                        background: block.type === "exercise" ? "var(--surface2)" : "var(--surface3)",
                                                      }}
                                                    >
                                                      <MoveButtons
                                                        label="blokk"
                                                        canUp={blockIdx > 0}
                                                        canDown={!isLast}
                                                        onUp={() => moveBlock(block.id, "up", task.blocks)}
                                                        onDown={() => moveBlock(block.id, "down", task.blocks)}
                                                      />
                                                      <span style={{ flexShrink: 0, minWidth: 22, paddingTop: 5, fontSize: 12, fontWeight: 700, color: "var(--muted2)", textAlign: "right" }}>
                                                        {block.type === "exercise" ? `${blockIdx + 1}.` : "T"}
                                                      </span>
                                                      <div style={{ flex: 1, minWidth: 0 }}>
                                                        {block.type === "exercise" ? (
                                                          <>
                                                            {block.exercise_id && exBlockSearch[block.id] === undefined ? (
                                                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                                                                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: "4px 12px", fontSize: 14, fontWeight: 600, color: "var(--text)", maxWidth: "100%" }}>
                                                                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                                    {bankExercise?.name ?? "Óþekkt"}
                                                                  </span>
                                                                  <span style={{ fontSize: 11, color: "var(--muted2)", flexShrink: 0 }}>{bankExercise?.category}</span>
                                                                  <button
                                                                    type="button"
                                                                    aria-label="Skipta um æfingu"
                                                                    onClick={(e) => { e.preventDefault(); clearBlockExercise(block.id); setExBlockSearch((prev) => ({ ...prev, [block.id]: "" })); }}
                                                                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted2)", flexShrink: 0, lineHeight: 1, fontSize: 16 }}
                                                                  >
                                                                    ×
                                                                  </button>
                                                                </span>
                                                              </div>
                                                            ) : (
                                                              <div style={{ marginBottom: 10 }}>
                                                                <input type="search" value={exBlockSearch[block.id] ?? ""} onChange={(e) => setExBlockSearch((prev) => ({ ...prev, [block.id]: e.target.value }))} style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", fontSize: 12, color: "var(--text)", outline: "none", boxSizing: "border-box" }} placeholder="Leita að æfingu…" />
                                                                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4, maxHeight: 80, overflowY: "auto" }}>
                                                                  {exercises.filter((ex) => { const q = (exBlockSearch[block.id] ?? "").toLowerCase(); return !q || ex.name.toLowerCase().includes(q) || ex.category.toLowerCase().includes(q); }).slice(0, 16).map((ex) => (
                                                                    <button key={ex.id} type="button" onClick={(e) => { e.preventDefault(); updateBlockExercise(block.id, ex.id); setExBlockSearch((prev) => { const next = { ...prev }; delete next[block.id]; return next; }); }} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", cursor: "pointer" }}>
                                                                      {ex.name}
                                                                    </button>
                                                                  ))}
                                                                </div>
                                                              </div>
                                                            )}
                                                            <BlockPrescription
                                                              block={block}
                                                              exercise={bankExercise}
                                                              onSave={(patch) => updateBlockFields(block.id, patch)}
                                                            />
                                                          </>
                                                        ) : (
                                                          <textarea
                                                            defaultValue={block.content ?? ""}
                                                            aria-label="Texti"
                                                            onBlur={(e) => { if (e.target.value !== (block.content ?? "")) updateBlockContent(block.id, e.target.value); }}
                                                            style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 13, minHeight: 64, resize: "vertical", outline: "none", padding: "8px 10px", boxSizing: "border-box" }}
                                                            placeholder="Texti…"
                                                          />
                                                        )}
                                                      </div>
                                                      <DeleteButton label="blokk" onConfirm={() => deleteBlock(block.id)} />
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </div>

                                            {reference && (
                                              <QuickTag
                                                exercises={exercises}
                                                taggedExerciseIds={new Set((task.blocks ?? []).flatMap((b) => (b.type === "exercise" && b.exercise_id ? [b.exercise_id] : [])))}
                                                onAdd={(exerciseId) => addBlock(task.id, task.blocks?.length ?? 0, "exercise", exerciseId)}
                                              />
                                            )}

                                            {/* Add block */}
                                            <div style={{ padding: "12px 16px 16px", borderTop: "1px solid var(--border)" }}>
                                              {showExSelectForTask === task.id ? (
                                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                                  <input
                                                    autoFocus
                                                    type="search"
                                                    value={exSearchForTask[task.id] ?? ""}
                                                    onChange={(e) => setExSearchForTask((prev) => ({ ...prev, [task.id]: e.target.value }))}
                                                    style={{ width: "100%", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "var(--text)", outline: "none", boxSizing: "border-box" }}
                                                    placeholder="Leita eftir nafni eða flokki…"
                                                  />
                                                  <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                                                    {(() => {
                                                      const q = (exSearchForTask[task.id] ?? "").toLowerCase();
                                                      const results = exercises.filter((ex) => !q || ex.name.toLowerCase().includes(q) || ex.category.toLowerCase().includes(q)).slice(0, 10);
                                                      if (exercises.length === 0) return <p style={{ padding: "8px 12px", fontSize: 12, color: "var(--muted2)" }}>Bættu við æfingum í Æfingabanka fyrst.</p>;
                                                      if (results.length === 0) return <p style={{ padding: "8px 12px", fontSize: 12, color: "var(--muted2)" }}>Engar æfingar passa.</p>;
                                                      return results.map((ex) => (
                                                        <button key={ex.id} type="button" onClick={(e) => { e.preventDefault(); addBlock(task.id, task.blocks?.length ?? 0, "exercise", ex.id); setShowExSelectForTask(null); setExSearchForTask((prev) => ({ ...prev, [task.id]: "" })); }} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 12px", textAlign: "left", fontSize: 12, color: "var(--text)", background: "none", border: "none", borderBottom: "1px solid var(--border)", cursor: "pointer" }}>
                                                          <span style={{ fontWeight: 500 }}>{ex.name}</span>
                                                          <span style={{ color: "var(--muted2)", flexShrink: 0 }}>{ex.category}</span>
                                                        </button>
                                                      ));
                                                    })()}
                                                  </div>
                                                  <button type="button" onClick={() => { setShowExSelectForTask(null); setExSearchForTask((prev) => ({ ...prev, [task.id]: "" })); }} style={{ fontSize: 12, color: "var(--muted2)", background: "none", border: "none", cursor: "pointer" }}>Hætta við</button>
                                                </div>
                                              ) : (
                                                <div style={{ display: "flex", gap: 8 }}>
                                                  <button type="button" onClick={(e) => { e.preventDefault(); setShowExSelectForTask(task.id); }} style={addBlockBtn}>
                                                    + Æfing
                                                  </button>
                                                  <button type="button" onClick={(e) => { e.preventDefault(); addBlock(task.id, task.blocks?.length ?? 0, "text"); }} style={addBlockBtn}>
                                                    + Texti
                                                  </button>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}

                                  {/* Add part */}
                                  <button type="button" onClick={() => addTask(day.id, day.tasks?.length ?? 0)} style={{ ...dashedAddBtn, marginTop: 8 }}>
                                    + Liður
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Add day */}
                        <button type="button" onClick={() => addDay(week.id, week.days?.length ?? 0)} style={{ ...dashedAddBtn, marginTop: 10 }}>
                          + Dagur
                        </button>
                      </div>
                    )}
                  </section>
                );
              })}

              {/* Add week */}
              <button type="button" onClick={addWeek} style={dashedAddBtn}>
                + Vika
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Users tab ─────────────────────────────────────────────────────────────────

function UsersTab() {
  const supabase = createClient();
  const { toast, show } = useToast();
  const [profiles, setProfiles] = useState<DbProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, role, created_at")
      .order("created_at", { ascending: false });
    if (error) show(error.message, "error");
    setProfiles((data as DbProfile[]) ?? []);
    setLoading(false);
  }, [supabase, show]);

  useEffect(() => { load(); }, [load]);

  const updateRole = async (id: string, role: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", id);
    if (error) show(error.message, "error");
    else { show(`Role updated to "${role}"`); load(); }
  };

  return (
    <>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-100">
            Users ({profiles.length})
          </h2>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          {loading ? (
            <Spinner />
          ) : profiles.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-12">
              No users found.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider hidden sm:table-cell">
                    Role
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider hidden md:table-cell">
                    Joined
                  </th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {profiles.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-3 font-medium text-zinc-100">
                      {p.email}
                    </td>
                    <td className="px-6 py-3 hidden sm:table-cell">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          p.role === "admin"
                            ? "bg-amber-950 border-amber-800 text-amber-400"
                            : "bg-zinc-800 border-zinc-700 text-zinc-400"
                        }`}
                      >
                        {p.role}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-zinc-500 hidden md:table-cell text-xs">
                      {formatNumericDate(p.created_at)}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <select
                        value={p.role}
                        onChange={(e) => updateRole(p.id, e.target.value)}
                        className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-zinc-500 cursor-pointer"
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
