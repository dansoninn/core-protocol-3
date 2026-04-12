"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

// ─── DB types ─────────────────────────────────────────────────────────────────

interface DbExercise {
  id: string;
  name: string;
  category: string;
  description: string;
  video_url: string;
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
}

interface DbTask {
  id: string;
  day_id: string;
  name: string;
  color: string;
  order_index: number;
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

type ExerciseForm = Omit<DbExercise, "id" | "created_at">;

const emptyExercise: ExerciseForm = {
  name: "",
  category: "Styrkur",
  description: "",
  video_url: "",
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
      video_url: ex.video_url ?? "",
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setForm(emptyExercise);
    setEditId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    if (editId) {
      const { error } = await supabase
        .from("exercises")
        .update(form)
        .eq("id", editId);
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

  return (
    <>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      <div className="space-y-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-100">
            Exercises ({exercises.length})
          </h2>
          {!showForm && (
            <button onClick={() => setShowForm(true)} className={btnPrimary} style={{ backgroundColor: ACCENT }}>
              + Add Exercise
            </button>
          )}
        </div>

        {/* Form */}
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
                <Field label="Video URL (YouTube embed)">
                  <input
                    value={form.video_url}
                    onChange={(e) =>
                      setForm({ ...form, video_url: e.target.value })
                    }
                    className={inp}
                    placeholder="https://www.youtube.com/embed/..."
                  />
                </Field>
              </div>
              <Field label="Description">
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className={`${inp} h-20 resize-none`}
                  placeholder="Short description of the movement..."
                />
              </Field>
              <div className="flex items-center gap-3 pt-1">
                <button type="submit" disabled={saving} className={btnPrimary} style={{ backgroundColor: ACCENT }}>
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
                    <td className="px-6 py-3 font-medium text-zinc-100">
                      {ex.name}
                    </td>
                    <td className="px-6 py-3 text-zinc-400 hidden sm:table-cell">
                      {ex.category}
                    </td>
                    <td className="px-6 py-3 hidden md:table-cell">
                      {ex.video_url ? (
                        <span className="text-xs text-zinc-500 font-mono truncate max-w-[200px] block">
                          {ex.video_url.replace("https://www.youtube.com/embed/", "yt:")}
                        </span>
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
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [dayForms, setDayForms] = useState<
    Record<string, Partial<DbDay>>
  >({});

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

  // ── Week operations ──────────────────────────────────────────────────────────

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
    else loadWeeks(selectedCourseId);
  };

  const deleteWeek = async (weekId: string) => {
    const { error } = await supabase.from("weeks").delete().eq("id", weekId);
    if (error) show(error.message, "error");
    else loadWeeks(selectedCourseId);
  };

  // ── Day operations ───────────────────────────────────────────────────────────

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
    const { error } = await supabase.from("tasks").insert({
      day_id: dayId,
      name: `Task ${taskCount + 1}`,
      color: "#F5A623",
      order_index: taskCount,
    });
    if (error) show(error.message, "error");
    else loadWeeks(selectedCourseId);
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) show(error.message, "error");
    else loadWeeks(selectedCourseId);
  };

  const updateTaskField = async (taskId: string, patch: Partial<Pick<DbTask, "name" | "color">>) => {
    const { error } = await supabase.from("tasks").update(patch).eq("id", taskId);
    if (error) show(error.message, "error");
    else loadWeeks(selectedCourseId);
  };

  // ── Block operations ─────────────────────────────────────────────────────────

  const addBlock = async (
    taskId: string,
    blockCount: number,
    type: "exercise" | "text",
    exerciseId?: string
  ) => {
    const { error } = await supabase.from("blocks").insert({
      task_id: taskId,
      type,
      order_index: blockCount,
      exercise_id: exerciseId ?? null,
      content: type === "text" ? "" : null,
    });
    if (error) show(error.message, "error");
    else loadWeeks(selectedCourseId);
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
    else loadWeeks(selectedCourseId);
  };

  const updateBlockExercise = async (blockId: string, exerciseId: string) => {
    const { error } = await supabase
      .from("blocks")
      .update({ exercise_id: exerciseId })
      .eq("id", blockId);
    if (error) show(error.message, "error");
    else loadWeeks(selectedCourseId);
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

                {weeks.map((week) => {
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
                        <ConfirmDelete
                          label={week.title}
                          onConfirm={() => deleteWeek(week.id)}
                        />
                      </div>

                      {/* Days */}
                      {expanded && (
                        <div className="border-t border-zinc-800 divide-y divide-zinc-800">
                          {(week.days ?? []).map((day) => {
                            const isEditing = editingDay === day.id;
                            const f = dayForms[day.id] ?? {};

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
                                  <div className="flex items-start justify-between gap-4">
                                    <div>
                                      <p className="text-sm font-semibold text-zinc-100">
                                        {day.title}
                                      </p>
                                      {day.description && (
                                        <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">
                                          {day.description}
                                        </p>
                                      )}
                                      <p className="text-xs text-zinc-600 mt-1">
                                        {day.tasks?.length ?? 0} task{(day.tasks?.length ?? 0) !== 1 ? "s" : ""}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-4 shrink-0">
                                      <button
                                        onClick={() => startEditDay(day)}
                                        className="text-xs text-zinc-400 hover:text-zinc-100 transition-colors font-medium"
                                      >
                                        Edit
                                      </button>
                                      <ConfirmDelete
                                        label={day.title}
                                        onConfirm={() => deleteDay(day.id)}
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* Tasks */}
                                <div className="pl-4 space-y-3">
                                  {(day.tasks ?? []).map((task) => (
                                    <div
                                      key={task.id}
                                      className="bg-zinc-800/60 rounded-xl border border-zinc-700 overflow-hidden"
                                    >
                                      {/* Task header */}
                                      <div className="flex items-center gap-2 px-4 py-2.5">
                                        <input
                                          type="color"
                                          value={task.color}
                                          onChange={(e) =>
                                            updateTaskField(task.id, { color: e.target.value })
                                          }
                                          className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0"
                                          title="Task color"
                                        />
                                        <input
                                          defaultValue={task.name}
                                          onBlur={(e) => {
                                            if (e.target.value !== task.name)
                                              updateTaskField(task.id, { name: e.target.value });
                                          }}
                                          className="flex-1 bg-transparent text-sm font-medium text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-600 rounded px-1"
                                        />
                                        <ConfirmDelete
                                          label={task.name}
                                          onConfirm={() => deleteTask(task.id)}
                                        />
                                      </div>

                                      {/* Blocks */}
                                      <div className="divide-y divide-zinc-700/50">
                                        {(task.blocks ?? []).map((block) => (
                                          <div
                                            key={block.id}
                                            className="flex items-start gap-3 px-4 py-2.5"
                                          >
                                            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mt-0.5 w-12 shrink-0">
                                              {block.type}
                                            </span>
                                            {block.type === "exercise" ? (
                                              <select
                                                value={block.exercise_id ?? ""}
                                                onChange={(e) =>
                                                  updateBlockExercise(block.id, e.target.value)
                                                }
                                                className="flex-1 bg-zinc-700 border border-zinc-600 rounded-lg px-2 py-1 text-xs text-zinc-100 focus:outline-none"
                                              >
                                                <option value="">— select exercise —</option>
                                                {exercises.map((ex) => (
                                                  <option key={ex.id} value={ex.id}>
                                                    {ex.name} ({ex.category})
                                                  </option>
                                                ))}
                                              </select>
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
                                        ))}
                                      </div>

                                      {/* Add block */}
                                      <div className="flex items-center gap-3 px-4 py-2.5 border-t border-zinc-700/50">
                                        <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                                          Add block:
                                        </span>
                                        <select
                                          className="bg-zinc-700 border border-zinc-600 rounded-lg px-2 py-1 text-xs text-zinc-100 focus:outline-none"
                                          defaultValue=""
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            if (!val) return;
                                            if (val === "text") {
                                              addBlock(task.id, task.blocks?.length ?? 0, "text");
                                            } else {
                                              addBlock(task.id, task.blocks?.length ?? 0, "exercise", val);
                                            }
                                            e.target.value = "";
                                          }}
                                        >
                                          <option value="">+ add…</option>
                                          <option value="text">Text block</option>
                                          {exercises.map((ex) => (
                                            <option key={ex.id} value={ex.id}>
                                              Exercise: {ex.name}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
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
