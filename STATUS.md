# STATUS

Live state only — what is done, open, unverified, decided.
Durable reference (stack, schema, routes, conventions) lives in CLAUDE.md.
**Update this file before finishing work.**

Last updated: 2026-10-05

## Done

Recent commits:

| Commit | What changed |
|---|---|
| `8577061` | Middleware redirects now carry the cleared Supabase auth cookie, so a stale refresh token no longer survives and loops (`web/middleware.ts`) |
| `96fc0ac` | Admin view switcher — `ViewSwitcher.tsx`: banner on user pages, control in admin sidebar; adds the `--accent-line` token. **Verified:** banner in-browser (stacking, light/dark, mobile); `Skoða notendasýn` in `/admin` confirmed rendering and working by Daniel |
| `1566357` | Deterministic ISK price formatting — `web/lib/formatPrice.ts` replaces `toLocaleString` at 4 price call sites |
| `28cc519` | Root `.gitignore`, removed stray root install |

Shipped earlier:

- Auth (Supabase, email/password)
- Admin panel with full course builder
- Progress tracking at block level, persists to DB
- Image upload to Supabase Storage; Mux for video
- Move up/down on weeks and days
- Dark + light theme via CSS variables
- BottomNav on all user pages; TopBar on user pages; sidebar only on `/admin`
- Dashboard, course overview, day view, exercise library, profile — all redesigned

## Open

- **BLOCKS LAUNCH — payments.** Teya integration is not built and content access
  is not gated on purchase. The "Kaupa" button inserts straight into `purchases`,
  and RLS permits a self-insert, so any signed-in user can grant themselves any
  course. **Deliberately parked, not forgotten.**
- **Date formatting.** Four `toLocaleDateString` calls remain:
  `app/dashboard/page.tsx`, `app/profile/page.tsx`, `app/admin/page.tsx`,
  `app/admin/AdminClient.tsx` (the last uses `en-GB`, which is wrong).
  A deterministic fix needs a hardcoded Icelandic month array, not just a
  different locale string.
- **Unguarded `getUser()` in `app/dashboard/page.tsx:66`** — documented in
  `middleware.ts`, not fixed. Needs a decision about what `/dashboard` should
  render during a Supabase outage.
- **No user-facing behaviour when Supabase is unreachable.** Everyone is
  redirected to login, and login also needs Supabase. Undecided.
- **No Supabase backups** (free plan).
- **`blocks.sets` / `reps` → TEXT, awaiting Daniel's run** of
  `web/migration-sets-reps-text.sql`. Confirmed INTEGER in production (that
  caused the `.trim()` crash). Until it runs, the admin cannot save a range
  like "8-12" — the database rejects it. After Daniel confirms: remove the
  pending-migration note in `types/index.ts` and fix the CLAUDE.md schema
  (`load`, not `load_kg`; sets/reps text). The normaliser's coercion stays.
- **`blocks.load_kg`** — NUMERIC, unused by any code. Drop it later.
- **`SUPABASE_SERVICE_ROLE_KEY` in `web/.env.local` is invalid** — 26 characters,
  rejected by Supabase. No app code uses it, but it blocks server-side
  diagnostics. Replace with the project's secret key if it is wanted.
- **Day view redesign** — step 1 schema live in Supabase. Step 2 admin fields
  done, **pending Daniel's check in /admin**. **Step 3a done (day overview +
  one page per part), pending Daniel's check** — logic tested and layout checked
  at 375px with fixture data only; never seen with real data or a real session.
- **Step 3b** — video part layout, format stat tiles, single "Merkja lokið" for
  video parts, superset/complex grouping (A1/A2).
- **A part with zero exercise blocks cannot be marked done** (progress is
  block-level). It is left out of the "{done} / {total} liðir" count for now.
  Decide in 3b.
- **Admin: visible autosave status** ("Vistar…" / "Vistað ✓") per field, and a
  warning before leaving with an unsaved or failed edit.
- **Admin: quick-tag field on parts with a video.** A persistent exercise-bank
  search box under the part. Enter adds the top match as a new exercise block
  (a tag) and keeps focus, so the next one can be typed straight away. Skips
  exercises already tagged on that part. Optional — adding a single exercise
  the current way still works.
- **Hard-coded dark-theme gold** (`rgba(240,192,112,…)`) in
  `app/dashboard/page.tsx` (4 places), `BottomNav.tsx`, `TopBar.tsx` and the
  admin `Sidebar.tsx`. Not blue, but pale next to the light theme's gold;
  should use `--accent-dim` / `--accent-line`.

## Unverified

- **The retryable/network branch in `middleware.ts`.** Never observed to fire:
  auth-js logs the retryable fetch error internally and surfaces
  `AuthSessionMissingError` to the caller instead. Kept as defensive code; see
  the comment above it.

## Decided

- The view switcher shows an admin the user UI **as themselves**. No
  impersonation of another user — that would need a service-role key and an RLS
  bypass.
- `/admin` fails closed to `/` when the role cannot be verified.
- Prices use `formatPrice()`, never `toLocaleString` / `Intl` — server and
  browser ICU data can produce different output (e.g. "24.900" vs "24,900"), and
  the admin table was rendering the wrong format.
- Payments parked (2026-10-04) in favour of continuing feature work.
- The unverified retryable split is kept, with an in-code comment marking it
  inert, so no reader mistakes it for working outage handling.
- Hydration errors seen in Sept were a test-browser artifact (non-standard ICU).
  Production measured clean in Chrome on 2026-10-04.
- Day view: a day overview page, then one page per part with
  "Fyrri liður / Næsti liður". Gold accent, no blue actions.
- Video parts (e.g. Aðalþáttur): one "Merkja lokið" for the whole part; tagged
  exercises are for reference, not individually completed.
- Workout format lives on the task. Superset/complex is a grouping of blocks
  (`group_label`), not a format.
- For parts with a video, total time = the Mux video duration. Without a video,
  it is derived from the format.
- Locked days are refused server-side. `lib/dayAccess.ts` redirects a direct day
  or part URL to the course page unless every earlier day is complete — the
  same rule the course overview displays (`computeUnlockedDayIds`, shared).
  Before 3a the lock was display-only.
- **Admins bypass day access.** A user with `profiles.role = 'admin'` can open
  any day and part regardless of enrollment or unlock. Locked days still look
  locked to them (day strip, "Næsti dagur", course overview) but open. The role
  is read in parallel with the purchase query — the two tables have no foreign
  key between them, so they cannot share one query.
- Light theme accent is gold `#825A00` (dim/line: the same at 10% / 35%).
  Measured 4.94:1 in the worst case (accent text on the 10% tint over `--bg`),
  6.16:1 on `--surface`, above WCAG AA 4.5:1.
- `blocks.sets` and `blocks.reps` are TEXT, so coaches can write ranges and
  notes — "8-12", "3-4", "10/hlið", "max".
- Day-view rows are normalised to the declared types once, in
  `lib/dayNormalize.ts` via `loadDayParts`, not with `String()` in components.
  Text columns become `string | null`, integer columns `number | null`,
  constrained values fall back to null / 'sets'.
- "Myndband ✓" in the course builder counts `mux_playback_id` only, because
  the player plays Mux only. A legacy `video_url` without a Mux id shows
  "Gamalt myndband — hlaða upp í Mux"; its user-side thumbnail is not tappable.
- In 3a a video part shows no computed total time; its time will be the Mux
  duration (3b). Summing its reference exercises would show the wrong number.
- After a progress write the part page calls `router.refresh()`, which empties
  Next's 30s client router cache so the overview shows fresh progress. This is
  a deliberate exception to the no-refresh rule, which is about admin edits.
