# Core Protocol — CP.v02

## Project Overview
Next.js 14 e-learning/training platform for fitness and training programs.
Deployed at core-protocol-3.vercel.app via Vercel (GitHub → auto deploy).
All app code lives in the `/web` directory.

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
exercises (id, name, category, description, video_url)
weeks (id, course_id, title, order_index)
days (id, week_id, title, description, order_index)
tasks (id, day_id, name, color, video_url, order_index)
blocks (id, task_id, type['exercise'|'text'], order_index, 
        exercise_id, content, sets, reps, load_kg)
purchases (id, user_id, course_id, created_at)
progress (id, user_id, block_id, completed_at)
```

## Content Hierarchy
Course → Week → Day → Task → Block (exercise or text)
Progress tracked at **block level** (exercise blocks only).

## Key Rules
- NO mock/hardcoded data — everything reads from Supabase
- Server components for all data fetching
- Client components only for interactivity
- No router.refresh() inside inline edit operations — local state only
- e.preventDefault() on all block/task buttons to prevent scroll jump
- Use npx tsc --noEmit to verify TypeScript (npm run build times out)

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
- `/courses/[slug]/weeks/[weekId]/days/[dayId]` — day view
- `/dashboard` — user home
- `/profile` — enrolled courses + streak
- `/settings` — name + password

## Current State (CP.v02 — April 2026)

### Completed
- Auth (Supabase) with email/password
- Admin panel with full course builder
- Progress tracking at block level (persists to DB)
- Image upload to Supabase Storage
- Move up/down on weeks and days
- Dark theme throughout with CSS variables in globals.css
- Bottom navigation (BottomNav.tsx) on all user pages, all screen sizes
- TopBar.tsx for user pages
- Admin sidebar kept only on /admin routes
- Dashboard redesign: streak, today card, tomorrow preview, week progress
- Course overview redesign: hero, locked/unlocked days, sequential unlock
- Day view redesign: hero, week strip, task accordion, video modal
- Exercise library: grid with Mux thumbnails, search, filters
- Profile page: avatar, stats pills, course list, settings menu

### Architecture
- User pages: max-width 680px centered, bottom nav, no sidebar
- Admin pages: full width, sidebar, no bottom nav
- CSS variables: `--bg`, `--surface`, `--surface2`, `--surface3`, `--border`,
  `--accent`, `--accent-dim`, `--success`, `--success-dim`, `--text`, `--muted`, `--muted2`
- Fonts: Bebas Neue (`var(--font-bebas)`) for headings, DM Sans for body

### Next
- Admin panel redesign: dashboard with live stats, quick actions,
  course builder improvements, user management
- Teya payment integration (one-time + subscription)
- Messaging per course (optional, checkbox in course creation)
- Push notifications
- Automated QA testing (Playwright + Claude API)
