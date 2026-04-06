"use client";

import { useState, useEffect } from "react";
import type { Course, Exercise, Category } from "@/types";
import {
  isAdminAuthenticated,
  adminLogin,
  adminLogout,
  getAdminUsers,
  addAdminUser,
  deleteAdminUser,
  getAdminCourses,
  saveAdminCourse,
  getAdminExercises,
  saveAdminExercise,
  type AdminUser,
} from "@/lib/storage";
import { COURSES, EXERCISES, CATEGORIES } from "@/lib/data";

type Tab = "dashboard" | "courses" | "exercises" | "users";

export default function AdminClient() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("dashboard");

  // Data state
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminCourses, setAdminCourses] = useState<Course[]>([]);
  const [adminExercises, setAdminExercises] = useState<Exercise[]>([]);

  useEffect(() => {
    const ok = isAdminAuthenticated();
    setAuthed(ok);
    if (ok) loadData();
  }, []);

  const loadData = () => {
    setAdminUsers(getAdminUsers());
    setAdminCourses(getAdminCourses());
    setAdminExercises(getAdminExercises());
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminLogin(password)) {
      setAuthed(true);
      setError("");
      loadData();
    } else {
      setError("Rangt lykilorð.");
    }
  };

  const handleLogout = () => {
    adminLogout();
    setAuthed(false);
  };

  if (!authed) {
    return (
      <main className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-8 w-full max-w-sm">
          <h1 className="text-2xl font-extrabold text-zinc-900 mb-1">Stjórnborð</h1>
          <p className="text-zinc-500 text-sm mb-6">Skráðu þig inn til að halda áfram.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Lykilorð
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                placeholder="••••••••"
              />
            </div>
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <button
              type="submit"
              className="w-full bg-zinc-900 text-white font-semibold py-2.5 rounded-xl hover:bg-zinc-700 transition-colors text-sm"
            >
              Innskráning
            </button>
          </form>
        </div>
      </main>
    );
  }

  const allCourses = [...COURSES, ...adminCourses];
  const allExercises = [...EXERCISES, ...adminExercises];

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900">Stjórnborð</h1>
          <p className="text-zinc-500 text-sm">Core Protocol — Admin</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-zinc-500 hover:text-zinc-800 border border-zinc-200 px-4 py-2 rounded-xl hover:border-zinc-400 transition-colors"
        >
          Útskráning
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-zinc-100 p-1 rounded-xl w-fit">
        {(["dashboard", "courses", "exercises", "users"] as Tab[]).map((t) => {
          const labels: Record<Tab, string> = {
            dashboard: "Yfirlit",
            courses: "Námskeið",
            exercises: "Æfingar",
            users: "Notendur",
          };
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {labels[t]}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === "dashboard" && (
        <DashboardTab
          courses={allCourses}
          users={adminUsers}
          exercises={allExercises}
        />
      )}
      {tab === "courses" && (
        <CoursesTab
          exercises={allExercises}
          onSave={() => { loadData(); }}
          adminCourses={adminCourses}
          onCourseSaved={(c) => { saveAdminCourse(c); loadData(); }}
        />
      )}
      {tab === "exercises" && (
        <ExercisesTab
          adminExercises={adminExercises}
          onSaved={(e) => { saveAdminExercise(e); loadData(); }}
        />
      )}
      {tab === "users" && (
        <UsersTab
          users={adminUsers}
          onAdd={(u) => { addAdminUser(u); loadData(); }}
          onDelete={(id) => { deleteAdminUser(id); loadData(); }}
        />
      )}
    </main>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
function DashboardTab({
  courses,
  users,
  exercises,
}: {
  courses: Course[];
  users: AdminUser[];
  exercises: Exercise[];
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Námskeið", value: courses.length },
          { label: "Notendur", value: users.length },
          { label: "Æfingar", value: exercises.length },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6"
          >
            <p className="text-sm text-zinc-500 mb-1">{label}</p>
            <p className="text-4xl font-extrabold text-zinc-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
        <h2 className="font-bold text-zinc-900 mb-4">Nýlegir notendur</h2>
        {users.length === 0 ? (
          <p className="text-zinc-400 text-sm">Engir notendur skráðir.</p>
        ) : (
          <ul className="divide-y divide-zinc-50">
            {users.slice(-5).reverse().map((u) => (
              <li key={u.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-zinc-800">{u.name}</p>
                  <p className="text-xs text-zinc-500">{u.email}</p>
                </div>
                <span className="text-xs text-zinc-400">
                  {new Date(u.createdAt).toLocaleDateString("is-IS")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── Courses ─────────────────────────────────────────────────────────────────
function CoursesTab({
  exercises,
  adminCourses,
  onCourseSaved,
}: {
  exercises: Exercise[];
  onSave: () => void;
  adminCourses: Course[];
  onCourseSaved: (c: Course) => void;
}) {
  const empty: Omit<Course, "id" | "weeks"> = {
    slug: "",
    title: "",
    instructor: "",
    description: "",
    price: 0,
    category: "Styrkur",
    coverImage: "",
  };

  const [form, setForm] = useState(empty);
  const [weeks, setWeeks] = useState<Course["weeks"]>([]);
  const [saved, setSaved] = useState(false);

  const addWeek = () => {
    setWeeks((prev) => [
      ...prev,
      { id: `w-${Date.now()}`, title: `Vika ${prev.length + 1}`, days: [] },
    ]);
  };

  const addDay = (wIdx: number) => {
    setWeeks((prev) =>
      prev.map((w, i) =>
        i !== wIdx
          ? w
          : {
              ...w,
              days: [
                ...w.days,
                {
                  id: `day-${Date.now()}`,
                  title: `Dagur ${w.days.length + 1}`,
                  videoUrl: "",
                  workoutText: "",
                  exerciseIds: [],
                },
              ],
            }
      )
    );
  };

  const updateDay = (wIdx: number, dIdx: number, field: string, value: string | string[]) => {
    setWeeks((prev) =>
      prev.map((w, i) =>
        i !== wIdx
          ? w
          : {
              ...w,
              days: w.days.map((d, j) =>
                j !== dIdx ? d : { ...d, [field]: value }
              ),
            }
      )
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const course: Course = {
      ...form,
      id: `course-${Date.now()}`,
      weeks,
    };
    onCourseSaved(course);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setForm(empty);
    setWeeks([]);
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
        <h2 className="font-bold text-zinc-900 mb-6">Búa til nýtt námskeið</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Titill" required>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={inputCls}
                placeholder="Styrkur í 8 vikur"
                required
              />
            </Field>
            <Field label="Slóð (slug)" required>
              <input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className={inputCls}
                placeholder="styrkur-i-8-vikur"
                required
              />
            </Field>
            <Field label="Leiðbeinandi" required>
              <input
                value={form.instructor}
                onChange={(e) => setForm({ ...form, instructor: e.target.value })}
                className={inputCls}
                required
              />
            </Field>
            <Field label="Verð (kr.)">
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                className={inputCls}
              />
            </Field>
            <Field label="Flokkur">
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
                className={inputCls}
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Forsíðumynd (URL)">
              <input
                value={form.coverImage}
                onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
                className={inputCls}
                placeholder="https://..."
              />
            </Field>
          </div>
          <Field label="Lýsing">
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={`${inputCls} h-20 resize-none`}
            />
          </Field>

          {/* Weeks */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-zinc-800 text-sm">Vikur & dagar</h3>
              <button
                type="button"
                onClick={addWeek}
                className="text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-3 py-1.5 rounded-lg transition-colors font-medium"
              >
                + Bæta við viku
              </button>
            </div>
            <div className="space-y-4">
              {weeks.map((week, wIdx) => (
                <div
                  key={week.id}
                  className="border border-zinc-200 rounded-xl p-4 space-y-3"
                >
                  <input
                    value={week.title}
                    onChange={(e) =>
                      setWeeks((prev) =>
                        prev.map((w, i) =>
                          i === wIdx ? { ...w, title: e.target.value } : w
                        )
                      )
                    }
                    className={`${inputCls} font-semibold`}
                    placeholder="Vika 1 — Grunnurinn"
                  />
                  {week.days.map((day, dIdx) => (
                    <div
                      key={day.id}
                      className="bg-zinc-50 rounded-lg p-3 space-y-2"
                    >
                      <input
                        value={day.title}
                        onChange={(e) =>
                          updateDay(wIdx, dIdx, "title", e.target.value)
                        }
                        className={inputCls}
                        placeholder="Dagur 1 — Titill"
                      />
                      <input
                        value={day.videoUrl}
                        onChange={(e) =>
                          updateDay(wIdx, dIdx, "videoUrl", e.target.value)
                        }
                        className={inputCls}
                        placeholder="Myndband URL"
                      />
                      <textarea
                        value={day.workoutText}
                        onChange={(e) =>
                          updateDay(wIdx, dIdx, "workoutText", e.target.value)
                        }
                        className={`${inputCls} h-16 resize-none`}
                        placeholder="Æfingalýsing..."
                      />
                      <div>
                        <p className="text-xs text-zinc-500 mb-1.5 font-medium">
                          Veldu æfingar
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {exercises.map((ex) => {
                            const sel = day.exerciseIds?.includes(ex.id);
                            return (
                              <button
                                key={ex.id}
                                type="button"
                                onClick={() => {
                                  const cur = day.exerciseIds || [];
                                  updateDay(
                                    wIdx,
                                    dIdx,
                                    "exerciseIds",
                                    sel
                                      ? cur.filter((id) => id !== ex.id)
                                      : [...cur, ex.id]
                                  );
                                }}
                                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                                  sel
                                    ? "bg-zinc-900 text-white border-zinc-900"
                                    : "border-zinc-200 text-zinc-600 hover:border-zinc-400"
                                }`}
                              >
                                {ex.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addDay(wIdx)}
                    className="text-xs text-zinc-500 hover:text-zinc-800 underline"
                  >
                    + Bæta við degi
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="bg-zinc-900 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-zinc-700 transition-colors"
            >
              Vista námskeið
            </button>
            {saved && (
              <span className="text-sm text-green-600 font-medium">Vistað!</span>
            )}
          </div>
        </form>
      </div>

      {/* Existing admin courses */}
      {adminCourses.length > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
          <h2 className="font-bold text-zinc-900 mb-4">Námskeið búin til í admin</h2>
          <ul className="divide-y divide-zinc-50">
            {adminCourses.map((c) => (
              <li key={c.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-zinc-800">{c.title}</p>
                  <p className="text-xs text-zinc-500">/{c.slug} · {c.category}</p>
                </div>
                <span className="text-sm font-bold text-zinc-700">
                  {c.price.toLocaleString("is-IS")} kr.
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Exercises ────────────────────────────────────────────────────────────────
function ExercisesTab({
  adminExercises,
  onSaved,
}: {
  adminExercises: Exercise[];
  onSaved: (e: Exercise) => void;
}) {
  const empty = { name: "", category: "Styrkur" as Category, description: "", videoUrl: "" };
  const [form, setForm] = useState(empty);
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaved({ ...form, id: `ex-admin-${Date.now()}` });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setForm(empty);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
        <h2 className="font-bold text-zinc-900 mb-5">Bæta við æfingu</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nafn" required>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputCls}
                required
              />
            </Field>
            <Field label="Flokkur">
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
                className={inputCls}
              >
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Myndband URL">
              <input
                value={form.videoUrl}
                onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                className={inputCls}
                placeholder="https://..."
              />
            </Field>
          </div>
          <Field label="Lýsing">
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={`${inputCls} h-20 resize-none`}
            />
          </Field>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="bg-zinc-900 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-zinc-700 transition-colors"
            >
              Vista æfingu
            </button>
            {saved && <span className="text-sm text-green-600 font-medium">Vistað!</span>}
          </div>
        </form>
      </div>

      {adminExercises.length > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
          <h2 className="font-bold text-zinc-900 mb-4">Æfingar búnar til í admin</h2>
          <ul className="divide-y divide-zinc-50">
            {adminExercises.map((ex) => (
              <li key={ex.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-zinc-800">{ex.name}</p>
                  <p className="text-xs text-zinc-500">{ex.category}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Users ────────────────────────────────────────────────────────────────────
function UsersTab({
  users,
  onAdd,
  onDelete,
}: {
  users: AdminUser[];
  onAdd: (u: { name: string; email: string }) => void;
  onDelete: (id: string) => void;
}) {
  const [form, setForm] = useState({ name: "", email: "" });
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setForm({ name: "", email: "" });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
        <h2 className="font-bold text-zinc-900 mb-5">Bæta við notanda</h2>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 items-end">
          <Field label="Nafn" required>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputCls}
              required
            />
          </Field>
          <Field label="Netfang" required>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={inputCls}
              required
            />
          </Field>
          <div className="flex items-center gap-3 pb-0.5">
            <button
              type="submit"
              className="bg-zinc-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-zinc-700 transition-colors whitespace-nowrap"
            >
              Bæta við
            </button>
            {saved && <span className="text-sm text-green-600 font-medium">Vistað!</span>}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h2 className="font-bold text-zinc-900">Allir notendur ({users.length})</h2>
        </div>
        {users.length === 0 ? (
          <p className="text-zinc-400 text-sm px-6 py-8 text-center">
            Engir notendur skráðir enn.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-500 uppercase text-xs tracking-wide">
              <tr>
                <th className="text-left px-6 py-3">Nafn</th>
                <th className="text-left px-6 py-3">Netfang</th>
                <th className="text-left px-6 py-3 hidden sm:table-cell">Skráð</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-zinc-800">{u.name}</td>
                  <td className="px-6 py-3 text-zinc-500">{u.email}</td>
                  <td className="px-6 py-3 text-zinc-400 hidden sm:table-cell">
                    {new Date(u.createdAt).toLocaleDateString("is-IS")}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => onDelete(u.id)}
                      className="text-red-400 hover:text-red-600 text-xs font-medium transition-colors"
                    >
                      Eyða
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 mb-1">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white";
