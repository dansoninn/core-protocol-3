# Core Protocol — CP.v02

## Project Overview
Next.js 14 e-learning/training platform for fitness and training programs.
Deployed at core-protocol-3.vercel.app via Vercel (GitHub → auto deploy).
All app code lives in the `/web` directory.

Current build state and open items live in STATUS.md — read it before starting
work, update it before finishing.

## Tech Stack
- **Framework:** Next.js 14 App Router
- **Auth + Database:** Supabase (@supabase/ssr)
- **Styling:** Tailwind CSS
- **Language:** TypeScript
- **Deployment:** Vercel

## Supabase Clients
- Browser: `@/lib/supabase/client`
- Server: `@/lib/supabase/server`

## Route Protection (middleware)
- `/dashboard` — requires auth
- `/admin` — requires auth + role = 'admin'

## Database Schema
```
profiles (id, email, full_name, role, created_at)
courses (id, title, slug, description, category, price, cover_image, instructor)
exercises (id, name, category, description, video_url,
           mux_asset_id, mux_playback_id)
weeks (id, course_id, title, order_index)
days (id, week_id, title, description, order_index)
tasks (id, day_id, name, color, video_url, order_index,
       instructions, format, work_sec, rest_sec, rounds, time_cap_sec, rep_scheme)
blocks (id, task_id, type['exercise'|'text'], order_index,
        exercise_id, content, sets, reps, load,
        duration_sec, rest_sec, side, intensity, group_label)
purchases (id, user_id, course_id, created_at)
progress (id, user_id, block_id, completed_at)
```
- `blocks.sets`, `reps` and `load` are TEXT — coaches write ranges and notes
  ("8-12", "10/hlið", "max").
- `blocks.load_kg` (NUMERIC) still exists but is unused — to be dropped (STATUS.md).
- Day-view rows are normalised to `types/index.ts` in `lib/dayNormalize.ts`.

## Content Hierarchy
Course → Week → Day → Task → Block (exercise or text)
Progress tracked at **block level** (exercise blocks only).

## Key Rules
- NO mock/hardcoded data — everything reads from Supabase
- Server components for all data fetching
- Client components only for interactivity
- No router.refresh() inside inline edit operations — local state only
- e.preventDefault() on all block/task buttons to prevent scroll jump
- Run `npm run build` before every commit — it completes in about 40 seconds and
  must pass. It catches ESLint errors that `npx tsc --noEmit` does not, and those
  are exactly what break Vercel deploys. `tsc --noEmit` is a faster inner-loop
  check, not a substitute.
- Use the `--accent-line` CSS variable for accent borders — never hardcode rgba
  values, they break in light mode

## Storage Buckets (Supabase)
- `course-images` — public, course cover images
- `task-videos` — public, task videos

## Admin Panel (/admin)
Tabs: Exercise Bank | Courses | Course Builder | Users
Course Builder: collapsible weeks/days/tasks, 
exercise search with pills, duplicate day, move up/down

## User-Facing Routes
- `/` — homepage with course grid
- `/courses` — all courses
- `/courses/[slug]` — course overview with progress
- `/courses/[slug]/weeks/[weekId]/days/[dayId]` — day overview
- `/courses/[slug]/weeks/[weekId]/days/[dayId]/tasks/[taskId]` — one part of the day
- `/dashboard` — user home
- `/profile` — enrolled courses + streak
- `/settings` — name + password

## Architecture
- User pages: max-width 680px centered, bottom nav, no sidebar
- Admin pages: full width, sidebar, no bottom nav
- CSS variables: `--bg`, `--surface`, `--surface2`, `--surface3`, `--border`,
  `--accent`, `--accent-dim`, `--accent-line`, `--success`, `--success-dim`,
  `--text`, `--muted`, `--muted2`
- Fonts: Bebas Neue (`var(--font-bebas)`) for headings, DM Sans for body
