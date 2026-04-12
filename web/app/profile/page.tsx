import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileRow {
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface PurchaseRow {
  courses: {
    id: string;
    title: string;
    slug: string;
    cover_image: string | null;
    weeks: { days: { tasks: { blocks: { id: string }[] }[] }[] }[];
  };
}

interface ProgressRow {
  block_id: string;
  completed_at: string;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ProfilePage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?next=/profile");

  // ── Profile ──────────────────────────────────────────────────────────────
  const { data: profileRaw, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, created_at")
    .eq("id", user.id)
    .single();

  if (profileError) console.error("[ProfilePage] profiles query:", profileError.message);
  const profile = profileRaw as ProfileRow | null;

  // ── Purchases + course structure ─────────────────────────────────────────
  const { data: purchaseRaw } = await supabase
    .from("purchases")
    .select(
      `courses (
        id, title, slug, cover_image,
        weeks ( days ( tasks ( blocks ( id ) ) ) )
      )`
    )
    .eq("user_id", user.id);

  const purchases = (purchaseRaw as unknown as PurchaseRow[]) ?? [];

  // ── Progress ─────────────────────────────────────────────────────────────
  const { data: progressRaw } = await supabase
    .from("progress")
    .select("block_id, completed_at")
    .eq("user_id", user.id);

  const progressRows = (progressRaw as ProgressRow[]) ?? [];
  const completedIds = new Set(progressRows.map((p) => p.block_id));

  // ── Streak ───────────────────────────────────────────────────────────────
  // Deduplicate to one entry per calendar date, sort descending
  const uniqueDates = Array.from(
    new Set(
      progressRows
        .filter((p) => p.completed_at)
        .map((p) => new Date(p.completed_at!).toISOString().slice(0, 10))
    )
  ).sort((a, b) => b.localeCompare(a));

  let streak = 0;
  if (uniqueDates.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const latest = new Date(uniqueDates[0]);
    latest.setHours(0, 0, 0, 0);
    const gapDays = Math.round(
      (today.getTime() - latest.getTime()) / 86_400_000
    );

    // Streak only counts if the user was active today or yesterday
    if (gapDays <= 1) {
      let expected = latest;
      for (const dateStr of uniqueDates) {
        const d = new Date(dateStr);
        d.setHours(0, 0, 0, 0);
        if (d.getTime() === expected.getTime()) {
          streak++;
          expected = new Date(expected.getTime() - 86_400_000);
        } else {
          break;
        }
      }
    }
  }

  // ── Per-course completion ────────────────────────────────────────────────
  const enrolledCourses = purchases.map((p) => {
    const course = p.courses;
    const allBlockIds = (course.weeks ?? []).flatMap((w) =>
      w.days.flatMap((d) =>
        d.tasks.flatMap((t) => t.blocks.map((b) => b.id))
      )
    );
    const completedCount = allBlockIds.filter((id) => completedIds.has(id)).length;
    const pct =
      allBlockIds.length > 0
        ? Math.round((completedCount / allBlockIds.length) * 100)
        : 0;
    return { ...course, totalDays: allBlockIds.length, completedCount, pct };
  });

  // ── Display helpers ──────────────────────────────────────────────────────
  // Prefer profiles table; fall back to auth metadata (set at signup or after
  // settings save via auth.updateUser) so the heading is never blank.
  const fullName =
    profile?.full_name?.trim() ||
    ((user.user_metadata?.full_name as string | undefined) ?? "").trim() ||
    null;
  const email = user.email ?? "";

  // Initials from full_name words (e.g. "Daniel Þórðarson" → "DÞ")
  const initials = fullName
    ? fullName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join("")
    : email.slice(0, 1).toUpperCase() || "?";

  const memberSince = new Date(
    profile?.created_at ?? user.created_at
  ).toLocaleDateString("is-IS", { year: "numeric", month: "long" });

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={fullName ?? email}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-zinc-900 text-white flex items-center justify-center text-xl font-bold shrink-0">
              {initials}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-extrabold text-zinc-900 leading-tight">
              {fullName ?? email}
            </h1>
            {fullName && (
              <p className="text-sm text-zinc-500 mt-0.5">{email}</p>
            )}
            <p className="text-sm text-zinc-500 mt-0.5">
              Meðlimur síðan {memberSince}
            </p>
          </div>
        </div>

        {/* Gear → /settings */}
        <Link
          href="/settings"
          className="text-zinc-400 hover:text-zinc-700 transition-colors mt-1"
          title="Stillingar"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </Link>
      </div>

      {/* ── Streak ── */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6 flex items-center gap-5">
        <div className="w-14 h-14 rounded-2xl bg-zinc-900 text-white flex items-center justify-center text-2xl font-extrabold shrink-0">
          {streak}
        </div>
        <div>
          <p className="font-bold text-zinc-900 text-lg">Daga í röð</p>
          <p className="text-sm text-zinc-500 mt-0.5">
            {streak === 0
              ? "Ljúktu við æfingu í dag til að byrja strák!"
              : `${streak} ${streak === 1 ? "dagur" : "dagar"} í röð — hald áfram!`}
          </p>
        </div>
      </div>

      {/* ── Enrolled courses ── */}
      <section>
        <h2 className="text-lg font-bold text-zinc-900 mb-4">Mín námskeið</h2>

        {enrolledCourses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-8 text-center">
            <p className="text-zinc-500 mb-5">
              Þú ert ekki skráður í nein námskeið
            </p>
            <Link
              href="/courses"
              className="inline-flex items-center bg-zinc-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-zinc-700 transition-colors"
            >
              Skoða námskeið
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {enrolledCourses.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden"
              >
                <div className="flex items-center gap-4 p-4">
                  {/* Cover */}
                  <div className="w-20 h-14 rounded-xl overflow-hidden bg-zinc-200 shrink-0">
                    {course.cover_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={course.cover_image}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-zinc-800" />
                    )}
                  </div>

                  {/* Info + progress */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-zinc-900 truncate">
                      {course.title}
                    </p>
                    {course.totalDays > 0 && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-zinc-500 mb-1">
                          <span>Framvinda</span>
                          <span>
                            {course.completedCount}/{course.totalDays} ·{" "}
                            {course.pct}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-zinc-900 rounded-full"
                            style={{ width: `${course.pct}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* CTA */}
                  <Link
                    href={`/courses/${course.slug}`}
                    className="shrink-0 bg-zinc-900 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-zinc-700 transition-colors"
                  >
                    Halda áfram
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
