-- ============================================================
-- Core Protocol — Day view step 3b: task-level completion + video duration
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
--
-- 1. task_progress — a part (task) marked done as a whole. A part is done
--    when it has a task_progress row OR it has ≥1 exercise block and all of
--    them are in progress (lib/dayLogic.ts → isPartDone). Video parts are
--    completed this way; their tagged exercises are reference only.
-- 2. tasks.video_duration_sec — the Mux video duration, the total time of a
--    video part. Filled on upload; existing videos via
--    scripts/backfill-video-duration.mjs.
--
-- Additive only. Policies mirror public.progress (migration-content-schema.sql):
-- select / insert / delete own rows, no update. Safe to re-run.
-- ============================================================

BEGIN;

-- ─── 1. task_progress ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.task_progress (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id      UUID        NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, task_id)
);

ALTER TABLE public.task_progress ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY has no IF NOT EXISTS — drop first so a re-run is a no-op.

-- Users can read their own task progress
DROP POLICY IF EXISTS "Users can read own task progress" ON public.task_progress;
CREATE POLICY "Users can read own task progress"
  ON public.task_progress FOR SELECT
  USING (auth.uid() = user_id);

-- Users can mark parts complete (insert)
DROP POLICY IF EXISTS "Users can insert own task progress" ON public.task_progress;
CREATE POLICY "Users can insert own task progress"
  ON public.task_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can un-mark parts (delete)
DROP POLICY IF EXISTS "Users can delete own task progress" ON public.task_progress;
CREATE POLICY "Users can delete own task progress"
  ON public.task_progress FOR DELETE
  USING (auth.uid() = user_id);

-- ─── 2. tasks.video_duration_sec ─────────────────────────────────────────────

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS video_duration_sec INTEGER;  -- Mux duration, rounded to whole seconds

COMMIT;

-- ─── Verify (run after the migration) ───────────────────────────────────────
-- 1. Table and column. Expect 4 task_progress rows (id, user_id, task_id,
--    completed_at), then 1 tasks row (video_duration_sec, integer, YES).
--
-- SELECT table_name, column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND (table_name = 'task_progress'
--        OR (table_name = 'tasks' AND column_name = 'video_duration_sec'))
-- ORDER BY table_name, ordinal_position;
--
-- 2. RLS on, three policies. Expect rowsecurity = true, then DELETE, INSERT,
--    SELECT — each scoped to auth.uid() = user_id.
--
-- SELECT relname, relrowsecurity AS rowsecurity
-- FROM pg_class WHERE oid = 'public.task_progress'::regclass;
--
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'task_progress'
-- ORDER BY cmd;
