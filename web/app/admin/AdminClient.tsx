"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import MuxPlayer from "@mux/mux-player-react";

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
}

interface DbTask {
  id: string;
  day_id: string;
  name: string;
  color: string;
  order_index: number;
  video_url: string | null;
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

const TASK_COLOR_PRESETS = [
  "#F5A623", // orange
  "#EF4444", // red
  "#22C55E", // green
  "#3B82F6", // blue
  "#8B5CF6", // purple
  "#14B8A6", // teal
];

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

type Tab = "exercises" | "courses" | "builder" | "users";

export default function AdminClient() {
  const [tab, setTab] = useState<Tab>("exercises");

  const tabs: { id: Tab; label: string }[] = [
    { id: "exercises", label: "Exercise Bank" },
    { id: "courses", label: "Courses" },
    { id: "builder", label: "Course Builder" },
    { id: "users", label: "Users" },
  ];

  return (
    <div className="min-h-screen text-zinc-100" style={{ backgroundColor: "#0F1923" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-zinc-100 tracking-tight">
            Admin Panel
          </h1>
          <p className="text-sm mt-0.5" style={{ color: ACCENT }}>Core Protocol</p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-8 bg-zinc-900 p-1 rounded-xl border border-zinc-800 w-fit">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-5 py-2 rounded-lg text-sm font-medium transition-colors"
              style={
                tab === t.id
                  ? { backgroundColor: ACCENT, color: "#0F1923" }
                  : { color: "#71717a" }
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "exercises" && <ExercisesTab />}
        {tab === "courses" && <CoursesTab />}
        {tab === "builder" && <CourseBuilderTab />}
        {tab === "users" && <UsersTab />}
      </div>
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
                      {c.price.toLocaleString()} kr.
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
      supabase.from("exercises").select("id, name, category").order("name"),
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
      title: `Week ${order + 1}`,
      order_index: order,
    });
    if (error) show(error.message, "error");
    else loadWeeks(selectedCourseId);
  };

  const updateWeekTitle = async (weekId: string, title: string) => {
    const { error } = await supabase
      .from("weeks")
      .update({ title })
      .eq("id", weekId);
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
      title: `Day ${weekDaysCount + 1}`,
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
        name: `Task ${taskCount + 1}`,
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

  const updateTaskField = async (taskId: string, patch: Partial<Pick<DbTask, "name" | "color" | "video_url">>) => {
    const { error } = await supabase.from("tasks").update(patch).eq("id", taskId);
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
    const { error } = await supabase
      .from("blocks")
      .update({ content })
      .eq("id", blockId);
    if (error) show(error.message, "error");
    else setBlockInState(blockId, { content });
  };

  const updateBlockExercise = async (blockId: string, exerciseId: string) => {
    const { error } = await supabase
      .from("blocks")
      .update({ exercise_id: exerciseId })
      .eq("id", blockId);
    if (error) show(error.message, "error");
    else setBlockInState(blockId, { exercise_id: exerciseId });
  };

  const clearBlockExercise = async (blockId: string) => {
    const { error } = await supabase
      .from("blocks")
      .update({ exercise_id: null })
      .eq("id", blockId);
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
    patch: Partial<{ sets: string | null; reps: string | null; load: string | null }>
  ) => {
    const { error } = await supabase.from("blocks").update(patch).eq("id", blockId);
    if (error) show(error.message, "error");
  };

  const uploadTaskVideoMux = async (taskId: string, file: File) => {
    const set = (s: UploadStatus) =>
      setTaskVideoStatus((prev) => ({ ...prev, [taskId]: s }));
    set("requesting");
    try {
      const slotRes = await fetch("/api/mux/upload", { method: "POST" });
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
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const pollRes = await fetch(`/api/mux/upload?uploadId=${uploadId}`);
        const data = await pollRes.json();
        if (data.status === "errored") {
          throw new Error(data.error ?? "Mux asset processing failed");
        }
        if (data.playbackId) {
          await updateTaskField(taskId, { video_url: data.playbackId });
          set("done");
          return;
        }
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

  return (
    <>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-100">Course Builder</h2>
        </div>

        {/* Course selector */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <Field label="Select Course">
            <select
              value={selectedCourseId}
              onChange={(e) => handleCourseChange(e.target.value)}
              className={inp}
            >
              <option value="">— choose a course —</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Weeks */}
        {selectedCourseId && (
          <div className="space-y-3">
            {loadingWeeks ? (
              <Spinner />
            ) : (
              <>
                {weeks.length === 0 && (
                  <p className="text-zinc-500 text-sm text-center py-8">
                    No weeks yet. Add the first week below.
                  </p>
                )}

                {weeks.map((week, weekIdx) => {
                  const expanded = expandedWeeks.has(week.id);
                  return (
                    <div
                      key={week.id}
                      className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden"
                    >
                      {/* Week header */}
                      <div className="flex items-center gap-3 px-5 py-4">
                        <button
                          onClick={() => toggleWeek(week.id)}
                          className="text-zinc-400 hover:text-zinc-200 transition-colors"
                          aria-label={expanded ? "Collapse" : "Expand"}
                        >
                          <svg
                            className={`w-4 h-4 transition-transform ${expanded ? "rotate-90" : ""}`}
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
                        </button>
                        <input
                          defaultValue={week.title}
                          onBlur={(e) => {
                            if (e.target.value !== week.title)
                              updateWeekTitle(week.id, e.target.value);
                          }}
                          className="flex-1 bg-transparent text-sm font-semibold text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-600 rounded px-1"
                        />
                        <span className="text-xs text-zinc-600">
                          {week.days?.length ?? 0} day
                          {(week.days?.length ?? 0) !== 1 ? "s" : ""}
                        </span>
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button
                            onClick={(e) => { e.preventDefault(); moveWeek(week.id, "up"); }}
                            disabled={weekIdx === 0}
                            className="text-zinc-600 hover:text-zinc-300 disabled:opacity-20 transition-colors"
                            aria-label="Move week up"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => { e.preventDefault(); moveWeek(week.id, "down"); }}
                            disabled={weekIdx === weeks.length - 1}
                            className="text-zinc-600 hover:text-zinc-300 disabled:opacity-20 transition-colors"
                            aria-label="Move week down"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                        <ConfirmDelete
                          label={week.title}
                          onConfirm={() => deleteWeek(week.id)}
                        />
                      </div>

                      {/* Days */}
                      {expanded && (
                        <div className="border-t border-zinc-800 divide-y divide-zinc-800">
                          {(week.days ?? []).map((day, dayIdx) => {
                            const isEditing = editingDay === day.id;
                            const f = dayForms[day.id] ?? {};
                            const totalDays = week.days?.length ?? 0;

                            return (
                              <div key={day.id} className="px-6 py-4 space-y-4">
                                {/* Day header row */}
                                {isEditing ? (
                                  <div className="space-y-3">
                                    <Field label="Title">
                                      <input
                                        value={f.title ?? ""}
                                        onChange={(e) =>
                                          setDayForms((prev) => ({
                                            ...prev,
                                            [day.id]: { ...prev[day.id], title: e.target.value },
                                          }))
                                        }
                                        className={inp}
                                      />
                                    </Field>
                                    <Field label="Description">
                                      <textarea
                                        value={f.description ?? ""}
                                        onChange={(e) =>
                                          setDayForms((prev) => ({
                                            ...prev,
                                            [day.id]: { ...prev[day.id], description: e.target.value },
                                          }))
                                        }
                                        className={`${inp} h-20 resize-none`}
                                        placeholder="Intro text shown at the top of this day…"
                                      />
                                    </Field>
                                    <div className="flex items-center gap-3 pt-1">
                                      <button
                                        onClick={() => saveDay(day.id)}
                                        className={btnPrimary}
                                        style={{ backgroundColor: ACCENT }}
                                      >
                                        Save Day
                                      </button>
                                      <button
                                        onClick={() => setEditingDay(null)}
                                        className={btnGhost}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-3">
                                    <button
                                      onClick={(e) => { e.preventDefault(); toggleDay(day.id); }}
                                      className="text-zinc-500 hover:text-zinc-200 transition-colors shrink-0"
                                      aria-label={expandedDays.has(day.id) ? "Collapse day" : "Expand day"}
                                    >
                                      <svg
                                        className={`w-3.5 h-3.5 transition-transform ${expandedDays.has(day.id) ? "rotate-90" : ""}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                    </button>
                                    <div
                                      className="flex-1 min-w-0 cursor-pointer select-none"
                                      onClick={() => toggleDay(day.id)}
                                    >
                                      <p className="text-sm font-semibold text-zinc-100">{day.title}</p>
                                      {day.description && (
                                        <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{day.description}</p>
                                      )}
                                      <p className="text-xs text-zinc-600 mt-0.5">
                                        {day.tasks?.length ?? 0} task{(day.tasks?.length ?? 0) !== 1 ? "s" : ""}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                      <div className="flex flex-col gap-0.5">
                                        <button
                                          onClick={(e) => { e.preventDefault(); moveDay(day.id, "up"); }}
                                          disabled={dayIdx === 0}
                                          className="text-zinc-600 hover:text-zinc-300 disabled:opacity-20 transition-colors"
                                          aria-label="Move day up"
                                        >
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                          </svg>
                                        </button>
                                        <button
                                          onClick={(e) => { e.preventDefault(); moveDay(day.id, "down"); }}
                                          disabled={dayIdx === totalDays - 1}
                                          className="text-zinc-600 hover:text-zinc-300 disabled:opacity-20 transition-colors"
                                          aria-label="Move day down"
                                        >
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                          </svg>
                                        </button>
                                      </div>
                                      <button
                                        onClick={() => startEditDay(day)}
                                        className="text-xs text-zinc-400 hover:text-zinc-100 transition-colors font-medium"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => duplicateDay(day)}
                                        className="text-xs text-zinc-400 hover:text-zinc-100 transition-colors font-medium"
                                      >
                                        Duplicate
                                      </button>
                                      <ConfirmDelete
                                        label={day.title}
                                        onConfirm={() => deleteDay(day.id)}
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* Tasks */}
                                {expandedDays.has(day.id) && (
                                <div className="pl-4 space-y-3">
                                  {(day.tasks ?? []).map((task) => (
                                    <div
                                      key={task.id}
                                      className="bg-zinc-800/60 rounded-xl border border-zinc-700 overflow-hidden"
                                    >
                                      {/* Task color bar */}
                                      <div className="h-1" style={{ backgroundColor: task.color }} />

                                      {/* Task header */}
                                      <div className="flex items-center gap-3 px-4 py-2.5">
                                        <div className="flex items-center gap-1 shrink-0">
                                          {TASK_COLOR_PRESETS.map((c) => (
                                            <button
                                              key={c}
                                              onClick={(e) => { e.preventDefault(); updateTaskField(task.id, { color: c }); }}
                                              className="w-4 h-4 rounded-full transition-transform hover:scale-125 focus:outline-none"
                                              style={{ backgroundColor: c }}
                                              aria-label={`Set color ${c}`}
                                            >
                                              {task.color === c && (
                                                <span className="flex items-center justify-center w-full h-full">
                                                  <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
                                                </span>
                                              )}
                                            </button>
                                          ))}
                                        </div>
                                        <input
                                          defaultValue={task.name}
                                          onBlur={(e) => {
                                            if (e.target.value !== task.name)
                                              updateTaskField(task.id, { name: e.target.value });
                                          }}
                                          className="flex-1 bg-transparent text-sm font-medium text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600 rounded px-1"
                                        />
                                        {!expandedTasks.has(task.id) && (task.blocks?.length ?? 0) > 0 && (
                                          <span className="text-[10px] text-zinc-600 shrink-0 tabular-nums">
                                            {task.blocks.length} block{task.blocks.length !== 1 ? "s" : ""}
                                          </span>
                                        )}
                                        <button
                                          onClick={(e) => { e.preventDefault(); toggleTask(task.id); }}
                                          className="text-zinc-500 hover:text-zinc-200 transition-colors shrink-0"
                                          aria-label={expandedTasks.has(task.id) ? "Collapse task" : "Expand task"}
                                        >
                                          <svg
                                            className={`w-3.5 h-3.5 transition-transform ${expandedTasks.has(task.id) ? "rotate-90" : ""}`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                          </svg>
                                        </button>
                                        <ConfirmDelete
                                          label={task.name}
                                          onConfirm={() => deleteTask(task.id)}
                                        />
                                      </div>

                                      {/* Task body — video, blocks, add block */}
                                      {expandedTasks.has(task.id) && (<>
                                      {/* Task video */}
                                      <div className="flex items-center gap-2 px-4 py-2 border-t border-zinc-700/40">
                                        <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider shrink-0 w-10">
                                          Video
                                        </span>
                                        {(() => {
                                          const status = taskVideoStatus[task.id] ?? "idle";
                                          const isUploading = ["requesting", "uploading", "processing"].includes(status);
                                          return (
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                              <label className={`cursor-pointer shrink-0 ${isUploading ? "pointer-events-none opacity-60" : ""}`}>
                                                <span className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-zinc-700 border border-zinc-600 text-zinc-300 hover:bg-zinc-600 transition-colors whitespace-nowrap">
                                                  {status === "done" || task.video_url ? "Replace" : "Choose file"}
                                                </span>
                                                <input
                                                  type="file"
                                                  accept="video/*"
                                                  className="sr-only"
                                                  disabled={isUploading}
                                                  onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) uploadTaskVideoMux(task.id, file);
                                                    e.target.value = "";
                                                  }}
                                                />
                                              </label>
                                              {status === "idle" && task.video_url && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-300 bg-zinc-700 border border-zinc-600 px-2 py-0.5 rounded-full">
                                                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                                                  Mux
                                                </span>
                                              )}
                                              {status !== "idle" && (
                                                <div className="flex items-center gap-1.5">
                                                  {isUploading && (
                                                    <div className="w-2.5 h-2.5 border border-zinc-600 border-t-zinc-300 rounded-full animate-spin shrink-0" />
                                                  )}
                                                  {status === "done" && (
                                                    <svg className="w-3 h-3 text-green-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                  )}
                                                  {status === "error" && (
                                                    <svg className="w-3 h-3 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                    </svg>
                                                  )}
                                                  <span className={`text-[10px] ${status === "done" ? "text-green-500" : status === "error" ? "text-red-400" : "text-zinc-400"}`}>
                                                    {{ requesting: "Requesting…", uploading: "Uploading…", processing: "Processing…", done: "Ready", error: "Failed", idle: "" }[status]}
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })()}
                                      </div>

                                      {/* Blocks */}
                                      <div className="divide-y divide-zinc-700/50 border-t border-zinc-700/40">
                                        {(task.blocks ?? []).map((block, blockIdx) => (
                                          <div key={block.id} className="px-4 py-2.5 space-y-2">
                                            <div className="flex items-start gap-2">
                                              {/* Up/down arrows */}
                                              <div className="flex flex-col gap-0.5 shrink-0 pt-0.5">
                                                <button
                                                  onClick={() => moveBlock(block.id, "up", task.blocks)}
                                                  disabled={blockIdx === 0}
                                                  className="text-zinc-600 hover:text-zinc-300 disabled:opacity-20 transition-colors"
                                                  aria-label="Move up"
                                                >
                                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                  </svg>
                                                </button>
                                                <button
                                                  onClick={() => moveBlock(block.id, "down", task.blocks)}
                                                  disabled={blockIdx === (task.blocks?.length ?? 1) - 1}
                                                  className="text-zinc-600 hover:text-zinc-300 disabled:opacity-20 transition-colors"
                                                  aria-label="Move down"
                                                >
                                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                  </svg>
                                                </button>
                                              </div>

                                              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mt-0.5 w-10 shrink-0">
                                                {block.type}
                                              </span>

                                              {block.type === "exercise" ? (
                                                block.exercise_id && exBlockSearch[block.id] === undefined ? (
                                                  // Tag: exercise selected, not in search mode
                                                  <div className="flex-1 flex items-center min-w-0">
                                                    <span className="inline-flex items-center gap-1 text-xs bg-zinc-600 border border-zinc-500 rounded-full px-2.5 py-0.5 text-zinc-100 min-w-0 max-w-full">
                                                      <span className="truncate">{exercises.find((e) => e.id === block.exercise_id)?.name ?? "Unknown"}</span>
                                                      <button
                                                        onClick={(e) => {
                                                          e.preventDefault();
                                                          clearBlockExercise(block.id);
                                                          setExBlockSearch((prev) => ({ ...prev, [block.id]: "" }));
                                                        }}
                                                        className="text-zinc-400 hover:text-white shrink-0 leading-none"
                                                        aria-label="Clear exercise"
                                                      >×</button>
                                                    </span>
                                                  </div>
                                                ) : (
                                                  // Search mode
                                                  <div className="flex-1 space-y-1 min-w-0">
                                                    <input
                                                      type="search"
                                                      value={exBlockSearch[block.id] ?? ""}
                                                      onChange={(e) => setExBlockSearch((prev) => ({ ...prev, [block.id]: e.target.value }))}
                                                      className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-2 py-1 text-xs text-zinc-100 focus:outline-none"
                                                      placeholder="Search exercise…"
                                                    />
                                                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                                                      {exercises
                                                        .filter((ex) => {
                                                          const q = (exBlockSearch[block.id] ?? "").toLowerCase();
                                                          return !q || ex.name.toLowerCase().includes(q) || ex.category.toLowerCase().includes(q);
                                                        })
                                                        .slice(0, 16)
                                                        .map((ex) => (
                                                          <button
                                                            key={ex.id}
                                                            onClick={(e) => {
                                                              e.preventDefault();
                                                              updateBlockExercise(block.id, ex.id);
                                                              setExBlockSearch((prev) => {
                                                                const next = { ...prev };
                                                                delete next[block.id];
                                                                return next;
                                                              });
                                                            }}
                                                            className="text-xs px-2 py-0.5 rounded-full bg-zinc-700 border border-zinc-600 text-zinc-200 hover:bg-zinc-600 transition-colors"
                                                          >
                                                            {ex.name}
                                                          </button>
                                                        ))}
                                                    </div>
                                                  </div>
                                                )
                                              ) : (
                                                <textarea
                                                  defaultValue={block.content ?? ""}
                                                  onBlur={(e) => {
                                                    if (e.target.value !== (block.content ?? ""))
                                                      updateBlockContent(block.id, e.target.value);
                                                  }}
                                                  className="flex-1 bg-zinc-700 border border-zinc-600 rounded-lg px-2 py-1 text-xs text-zinc-100 resize-none h-16 focus:outline-none"
                                                  placeholder="Text content…"
                                                />
                                              )}
                                              <ConfirmDelete
                                                label="block"
                                                onConfirm={() => deleteBlock(block.id)}
                                              />
                                            </div>

                                            {/* Sets / Reps / Load (exercise blocks only) */}
                                            {block.type === "exercise" && (
                                              <div className="flex gap-1.5 pl-14">
                                                <input
                                                  defaultValue={block.sets ?? ""}
                                                  onBlur={(e) => {
                                                    const val = e.target.value.trim() || null;
                                                    if (val !== (block.sets ?? null))
                                                      updateBlockFields(block.id, { sets: val });
                                                  }}
                                                  className="w-16 bg-zinc-700 border border-zinc-600 rounded-lg px-2 py-1 text-xs text-zinc-100 focus:outline-none"
                                                  placeholder="Sets"
                                                />
                                                <input
                                                  defaultValue={block.reps ?? ""}
                                                  onBlur={(e) => {
                                                    const val = e.target.value.trim() || null;
                                                    if (val !== (block.reps ?? null))
                                                      updateBlockFields(block.id, { reps: val });
                                                  }}
                                                  className="w-16 bg-zinc-700 border border-zinc-600 rounded-lg px-2 py-1 text-xs text-zinc-100 focus:outline-none"
                                                  placeholder="Reps"
                                                />
                                                <input
                                                  defaultValue={block.load ?? ""}
                                                  onBlur={(e) => {
                                                    const val = e.target.value.trim() || null;
                                                    if (val !== (block.load ?? null))
                                                      updateBlockFields(block.id, { load: val });
                                                  }}
                                                  className="w-20 bg-zinc-700 border border-zinc-600 rounded-lg px-2 py-1 text-xs text-zinc-100 focus:outline-none"
                                                  placeholder="Load"
                                                />
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>

                                      {/* Add block — search for exercise or add text */}
                                      <div className="px-4 py-2.5 border-t border-zinc-700/50">
                                        {showExSelectForTask === task.id ? (
                                          <div className="space-y-1.5">
                                            <input
                                              autoFocus
                                              type="search"
                                              value={exSearchForTask[task.id] ?? ""}
                                              onChange={(e) =>
                                                setExSearchForTask((prev) => ({
                                                  ...prev,
                                                  [task.id]: e.target.value,
                                                }))
                                              }
                                              className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
                                              placeholder="Search by name or category…"
                                            />
                                            <div className="border border-zinc-600 rounded-lg overflow-hidden">
                                              {(() => {
                                                const q = (exSearchForTask[task.id] ?? "").toLowerCase();
                                                const results = exercises
                                                  .filter((ex) =>
                                                    !q ||
                                                    ex.name.toLowerCase().includes(q) ||
                                                    ex.category.toLowerCase().includes(q)
                                                  )
                                                  .slice(0, 10);
                                                if (exercises.length === 0) {
                                                  return (
                                                    <p className="px-3 py-2 text-xs text-zinc-600">
                                                      Add exercises in Exercise Bank first.
                                                    </p>
                                                  );
                                                }
                                                if (results.length === 0) {
                                                  return (
                                                    <p className="px-3 py-2 text-xs text-zinc-600">
                                                      No exercises match.
                                                    </p>
                                                  );
                                                }
                                                return results.map((ex) => (
                                                  <button
                                                    key={ex.id}
                                                    onClick={(e) => {
                                                      e.preventDefault();
                                                      addBlock(
                                                        task.id,
                                                        task.blocks?.length ?? 0,
                                                        "exercise",
                                                        ex.id
                                                      );
                                                      setShowExSelectForTask(null);
                                                      setExSearchForTask((prev) => ({
                                                        ...prev,
                                                        [task.id]: "",
                                                      }));
                                                    }}
                                                    className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-xs text-zinc-200 hover:bg-zinc-600 transition-colors border-b border-zinc-700/50 last:border-0"
                                                  >
                                                    <span className="font-medium truncate">{ex.name}</span>
                                                    <span className="text-zinc-500 shrink-0">{ex.category}</span>
                                                  </button>
                                                ));
                                              })()}
                                            </div>
                                            <button
                                              onClick={() => {
                                                setShowExSelectForTask(null);
                                                setExSearchForTask((prev) => ({
                                                  ...prev,
                                                  [task.id]: "",
                                                }));
                                              }}
                                              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-3">
                                            <button
                                              onClick={(e) => { e.preventDefault(); setShowExSelectForTask(task.id); }}
                                              className="text-xs text-zinc-500 hover:text-zinc-100 font-medium transition-colors"
                                            >
                                              + Exercise
                                            </button>
                                            <span className="text-zinc-700 select-none">|</span>
                                            <button
                                              onClick={(e) => { e.preventDefault(); addBlock(task.id, task.blocks?.length ?? 0, "text"); }}
                                              className="text-xs text-zinc-500 hover:text-zinc-100 font-medium transition-colors"
                                            >
                                              + Text
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                      </>)}
                                    </div>
                                  ))}

                                  {/* Add task button */}
                                  <button
                                    onClick={() => addTask(day.id, day.tasks?.length ?? 0)}
                                    className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors font-medium"
                                  >
                                    + Add Task
                                  </button>
                                </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Add day */}
                          <div className="px-6 py-3">
                            <button
                              onClick={() =>
                                addDay(week.id, week.days?.length ?? 0)
                              }
                              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors font-medium"
                            >
                              + Add Day
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Add week */}
                <button
                  onClick={addWeek}
                  className={`${btnGhost} w-full justify-center`}
                >
                  + Add Week
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </>
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
                      {new Date(p.created_at).toLocaleDateString("en-GB")}
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
