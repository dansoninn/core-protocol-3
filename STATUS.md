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
- **Day view redesign** — step 1/3 schema written
  (`web/migration-day-view-v2.sql`), awaiting manual migration in Supabase.
  Step 2: admin fields. Step 3: user view.

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
