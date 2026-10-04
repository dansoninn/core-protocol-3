# STATUS

Live state only — what is done, open, unverified, decided.
Durable reference (stack, schema, routes, conventions) lives in CLAUDE.md.
**Update this file before finishing work.**

Last updated: 2026-10-04 · HEAD `8577061`

## Done

Recent commits:

| Commit | What changed |
|---|---|
| `8577061` | Middleware redirects now carry the cleared Supabase auth cookie, so a stale refresh token no longer survives and loops (`web/middleware.ts`) |
| `96fc0ac` | Admin view switcher — `ViewSwitcher.tsx`: banner on user pages, control in admin sidebar; adds the `--accent-line` token |
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
- **`CoreProtocol/` subdirectory** — old Expo app with its own `.git`, tracked in
  this repo as a gitlink (mode `160000`). Needs `git rm --cached CoreProtocol`
  and cleanup.
- **No Supabase backups** (free plan).

## Unverified

- **Hydration errors #418 / #423 / #425.** Seen on production in one browser with
  non-standard ICU data; localhost dev is clean. Never measured in a normal
  Chrome against production. Until that measurement exists, treat this as
  **unknown** — not a bug, and not resolved.
- **The retryable/network branch in `middleware.ts`.** Never observed to fire:
  auth-js logs the retryable fetch error internally and surfaces
  `AuthSessionMissingError` to the caller instead. Kept as defensive code; see
  the comment above it.
- **ViewSwitcher admin sidebar control.** The user-facing banner was verified in
  a browser (stacking, light/dark, mobile); the `Skoða notendasýn` control in the
  admin sidebar shipped in `96fc0ac` without ever being seen rendered.

## Decided

- The view switcher shows an admin the user UI **as themselves**. No
  impersonation of another user — that would need a service-role key and an RLS
  bypass.
- `/admin` fails closed to `/` when the role cannot be verified.
- Prices use `formatPrice()`, never `toLocaleString` / `Intl` — server and
  browser disagree and it breaks hydration.
- Payments parked (2026-10-04) in favour of continuing feature work.
- The unverified retryable split stays rather than being deleted; it costs
  nothing and the failure mode is real in principle.
