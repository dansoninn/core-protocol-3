# STATUS

Live state only — what is done, open, unverified, decided.
Durable reference (stack, schema, routes, conventions) lives in CLAUDE.md.
**Update this file before finishing work.**

Last updated: 2026-10-06

## Done

Recent commits, newest first. A commit cannot list its own hash, so the latest
one is never in this table — see `git log`.

| Commit | What changed |
|---|---|
| `5c58281` | Test course seed (`web/seed-test-course.sql`); `task_progress` recorded as live |
| `0a2d032` | Day view step 3b.1 — `task_progress` + `tasks.video_duration_sec` (`web/migration-task-progress.sql`, **run by Daniel, verified live 2026-10-06**: 4 columns, the new column, 3 policies); one completion rule (`lib/dayLogic.ts`) used by every page; duration captured on Mux upload; backfill script |
| `086ce9a` | Docs: CLAUDE.md schema matches production after the sets/reps change |
| `13a0511` | `web/migration-sets-reps-text.sql` — `blocks.sets` / `reps` INTEGER → TEXT. **Run by Daniel, confirmed live** |
| `de6f392` | Day-view rows normalised once at the data boundary (`lib/dayNormalize.ts`) — fixed the production `.trim()` crash |
| `b09a0a8` | Admin day-access bypass; "Myndband ✓" counts Mux only; light-theme accent is gold `#825A00` |
| `12201c9` | Day view v2 step 3a — day overview + one page per part; locked days refused server-side (`lib/dayAccess.ts`) |
| `d024d03` | Course builder flags exercise blocks whose exercise has no explanation video |
| `6363d1c` | Day view v2 step 2 — admin fields: task format (`TaskSettings`) and block prescription (`BlockPrescription`) |
| `29f3102` | Day view v2 step 1 — `web/migration-day-view-v2.sql` (task formats, block prescription). Live |
| `8bbd5df` | Stopped tracking the embedded `CoreProtocol/` Expo repo (gitlink); folder untouched on disk |
| `d3cf5d2`…`e73c21c` | Docs only: STATUS.md created, corrected; hydration claims dropped after the production measurement |
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
- **Unguarded `getUser()` in `app/dashboard/page.tsx:66`** — documented in
  `middleware.ts`, not fixed. Needs a decision about what `/dashboard` should
  render during a Supabase outage.
- **No user-facing behaviour when Supabase is unreachable.** Everyone is
  redirected to login, and login also needs Supabase. Undecided.
- **No Supabase backups** (free plan).
- **`blocks.load_kg`** — NUMERIC, unused by any code. Drop it later.
- **`SUPABASE_SERVICE_ROLE_KEY` in `web/.env.local` is invalid** — 26 characters,
  rejected by Supabase. No app code uses it, but it blocks server-side
  diagnostics. Replace with the project's secret key if it is wanted.
- **Day view redesign** — step 1 schema live in Supabase. Step 2 admin fields
  done, **pending Daniel's check in /admin**. **Step 3a done (day overview +
  one page per part), pending Daniel's check** — logic tested and layout checked
  at 375px with fixture data only; never seen with real data or a real session.
- **Test course — `web/seed-test-course.sql`, run by Daniel 2026-10-06**
  (4 days, 10 parts, 29 blocks, his purchase; Day 4 video reused from the
  task "Æfing 1"). Still open:
  "TEST — prófunarnámskeið" (`/courses/test-namskeid`): 1 week, 4 days, 10
  parts covering every 3b case, plus a purchase for Daniel. Idempotent (fixed
  `7e570000-…` UUIDs, `ON CONFLICT DO NOTHING`). Caveats:
  - **Visible to everyone on `/` and `/courses`** — `courses` has no published
    flag. Price 0, so any signed-in user can "Kaupa" it (the same self-insert
    hole as under payments). Delete it in /admin when 3b is done; weeks, days,
    parts, blocks, purchases and progress cascade.
  - Day 1's "Teygjur" (instructions only, no exercise blocks) is deliberate —
    the whole-part "Merkja lokið" (3b.2) is what completes it. Daniel is an
    admin, so the bypass opens every day for him regardless; the lock path
    needs a non-admin account to see.
- **Step 3b — done.** 3b.1–3b.4 merged to `main` (`dd56adc`). 3b.2 checked by
  Daniel on the test course (whole-part button persists); 3b.3/3b.4 merged on
  his word, not yet looked at with real data — Days 2–3 of the test course.
- **Backfill `tasks.video_duration_sec`** — `web/scripts/backfill-video-duration.mjs`
  (dry run by default, `--apply` writes). Not run. Blocked: it needs a valid
  service key (see below) and `MUX_TOKEN_ID` / `MUX_TOKEN_SECRET`, which are not
  in `web/.env.local` (only on Vercel). It refuses the current 26-character key.
- **Admin "Virkir í dag" counts only the admin.** `app/admin/page.tsx` reads
  other users' `progress`, but RLS lets every user (admins too) read only
  their own rows, so the number is 0 or 1. Fixing it needs an admin read
  policy on `progress` and `task_progress` (SQL, security-relevant) — Daniel's
  call. Left as is.
- **Light-mode leftovers over images are fine; others fixed.** Remaining
  `rgba(255,255,255,…)` are borders/scrims on photos or blurred chips
  (course hero, course cards), which are correct in both themes.

## Unverified

- **Branch `step-4-cleanup` (on top of 3b).** Build passes after each commit;
  `formatDate` checked with assertions; part page (tiles, A/B groups,
  reference cards, green done state) rendered with fixture data at 375 px and
  680 px in headless Chromium. Not run with a real session: dashboard,
  profile and course-overview numbers on real progress; the save pill and
  leave warning in /admin; quick-tag on a real video part.

- **Steps 3b.3 + 3b.4.** `formatSummary` and `layoutPartBlocks` checked with
  assertions; rendered with fixture data at 375 px (tiles wrap rather than
  truncate). Not seen with real data — Days 2–3 of the test course.

- **Step 3b.2 leftovers.** Checked: Day 1 "Teygjur" button persists. Not
  yet seen: Day 4 reference cards and duration line, the "Tókst ekki að
  vista" error path.

- **Step 3b.1 signed-in paths.** Build passes; the rule is checked with
  assertions; signed-out routes load in dev without errors; the migration is
  verified live. Not exercised (no session): the course overview, day and part
  pages, dashboard and profile with real progress; `task_progress` reads from a
  signed-in page; duration capture on a real Mux upload; the backfill on real
  data. The test course is meant for this.
- **The retryable/network branch in `middleware.ts`.** Never observed to fire:
  auth-js logs the retryable fetch error internally and surfaces
  `AuthSessionMissingError` to the caller instead. Kept as defensive code; see
  the comment above it.

## Decided

- **One completion rule (step 3b).** A part is done when it has a
  `task_progress` row, or it has ≥1 exercise block and all of them are in
  `progress`. Every part is completable and counts in "{done} / {total} liðir"
  (replaces the old "zero exercise blocks are uncountable" exclusion). A day is
  done when every part is done. One implementation: `isPartDone` /
  `partProgress` / `isDayDone` in `lib/dayLogic.ts`, used by the day pages,
  course overview, dashboard and profile. The course overview and
  `requireDayAccess` both load completion through `loadCourseCompletion`
  (`lib/dayAccess.ts`), so unlock display and server-side refusal read the same
  rows and cannot disagree.
- **A day with no parts is never done**, so it stops every later day from
  unlocking. Kept from before 3b, where the unlock check and course overview
  already behaved this way; the dashboard used to treat such a day as done and
  now follows the shared rule.
- **Video part duration** is `tasks.video_duration_sec` (Mux duration, whole
  seconds). The admin upload waits for the asset to be `ready` and saves URL and
  duration in one update. If Mux is still preparing after the 60-second poll,
  the URL is saved without a duration, for the backfill to fill.

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
- A video part's total time is `tasks.video_duration_sec` (shown under the
  video and on the day overview card); null until saved on upload or
  backfilled, and then no time is shown. Its reference exercises are never
  summed — that would show the wrong number.
- **Every progress metric counts parts** (`partsProgress`, `lib/dayLogic.ts`):
  course %, per-day rings and "x/y liðir" on the course overview, dashboard
  "x / y liðir" and course %, profile %. Text blocks no longer sit in a
  denominator. Streak, calendar dots and "ÆFINGAR" count a day with any
  completed block **or** whole part. Profile walks weeks in course order.
  The dashboard's "~N mín" estimate is still ~3 min per exercise block.
- **Dates are formatted by `lib/formatDate.ts`** — hardcoded Icelandic months
  and weekdays, UTC fields (Iceland is UTC+0, no DST). Never
  `toLocaleDateString` / `Intl`, same reason as prices.
- **Gold is always a token.** The last hard-coded `rgba(240,192,112,…)` values
  use `--accent-dim` / `--accent-line`; ring tracks use `--surface3`.
- **Course builder autosave status** (`components/admin/SaveStatus.tsx`): one
  pill bottom-right — "Vistar…", "Vistað ✓" (2 s), "Vistun mistókst" (until
  a later save succeeds) — over the builder's autosave writes (week title,
  task fields, block fields/content/exercise). One pill, not one per field:
  each block has up to ten fields, and the existing error toast already names
  the failure. The tab warns before closing/reloading while a write is
  pending, a write failed, or a typed-in field has not been blurred yet
  (blur is what saves). In-app navigation is not intercepted.
- **Quick-tag on video parts** (`components/admin/QuickTag.tsx`): under the
  blocks of a part with a video. Type, Enter adds the top match (name starts
  with › name contains › category), clears and keeps focus; already-tagged
  exercises are skipped; one insert at a time.
- **Groups are labelled neutrally** — the letter and "N æfingar í röð, hvíld
  eftir hópinn", no "Supersett"/"Complex" (Daniel, 2026-10-06).
- **A whole part's button follows `isPartDone`.** A video part done by its
  blocks alone (ticked before 3b.2) shows as done; "afmerkja" clears those
  block rows.
- **Format tiles (3b.3).** Above the instructions on a non-video part: the
  format name (gold), then one tile per set parameter, with the admin's words
  (Lengd, Bil, Vinna, Hvíld, Hringir, Tímamörk, Endurtekningar). "sets" shows
  none. Total time follows the format: AMRAP = length, EMOM = interval ×
  rounds, Tabata/interval = (work + rest) × rounds, rounds = exercise sum ×
  rounds + rest between rounds; sets = the exercise sum. For time / ladder /
  chipper have only a cap, so no total — the cap is a tile. All in
  `formatSummary` (`lib/dayLogic.ts`), which `partTotalSeconds` uses.
- **Grouping (3b.4).** Consecutive exercise blocks with the same `group_label`
  are framed together, labelled A1, A2…; a text block or another label breaks
  the run; a label on one block alone is not a group. Ungrouped exercises are
  numbered 1, 2… among themselves. The last block's `rest_sec` is shown as the
  rest after the group. `layoutPartBlocks` in `lib/dayLogic.ts`.
- **Dark-theme `--success` is green `#3FBF8F`** (was slate `#708893`, which
  made a finished part look disabled). 7.95:1 on `--bg`, 5.21:1 worst case on
  its 12% tint — above WCAG AA. Decided by Daniel 2026-10-06.
- **Parts completed as a whole** (`isWholePart`: a video part, or a part with
  no exercise blocks) get one "Merkja lokið" under the content, writing
  `task_progress` (`components/day/useTaskProgress.ts`). A video part's tagged
  exercises are reference cards: numbered, never checked, no button, and
  expandable only when they have a note. Exercise-only parts are unchanged —
  completed card by card.
- After a progress write the part page calls `router.refresh()`, which empties
  Next's 30s client router cache so the overview shows fresh progress. This is
  a deliberate exception to the no-refresh rule, which is about admin edits.
