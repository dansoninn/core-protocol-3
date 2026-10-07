"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import MuxPlayer from "@mux/mux-player-react";
import { formatPrice } from "@/lib/formatPrice";
import { formatNumericDate } from "@/lib/formatDate";
import CourseBuilder from "@/components/admin/builder/CourseBuilder";

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
      {tab === "builder" && <CourseBuilder />}
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
