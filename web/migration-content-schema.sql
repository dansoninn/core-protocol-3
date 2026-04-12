-- ============================================================
-- Core Protocol — Content schema migration
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
--
-- Drops: day_exercises, progress, days, weeks (in dependency order)
-- Creates: weeks, days, tasks, blocks, progress (new structure)
-- ============================================================


-- ─── 1. Drop old tables (dependency order: children first) ───────────────────

DROP TABLE IF EXISTS public.day_exercises CASCADE;
DROP TABLE IF EXISTS public.progress      CASCADE;
DROP TABLE IF EXISTS public.days          CASCADE;
DROP TABLE IF EXISTS public.weeks         CASCADE;


-- ─── 2. weeks ─────────────────────────────────────────────────────────────────

CREATE TABLE public.weeks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   UUID        NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  order_index INTEGER     NOT NULL DEFAULT 0
);

ALTER TABLE public.weeks ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all content
CREATE POLICY "Authenticated users can read weeks"
  ON public.weeks FOR SELECT
  USING (auth.role() = 'authenticated');

-- Admins can do everything
CREATE POLICY "Admin can manage weeks"
  ON public.weeks FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ─── 3. days ──────────────────────────────────────────────────────────────────

CREATE TABLE public.days (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id     UUID        NOT NULL REFERENCES public.weeks(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  description TEXT,          -- intro text shown at top of day
  order_index INTEGER     NOT NULL DEFAULT 0
);

ALTER TABLE public.days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read days"
  ON public.days FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can manage days"
  ON public.days FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ─── 4. tasks ─────────────────────────────────────────────────────────────────

CREATE TABLE public.tasks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id      UUID        NOT NULL REFERENCES public.days(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  color       TEXT        NOT NULL DEFAULT '#F5A623',  -- hex colour string
  order_index INTEGER     NOT NULL DEFAULT 0
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read tasks"
  ON public.tasks FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can manage tasks"
  ON public.tasks FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ─── 5. blocks ────────────────────────────────────────────────────────────────

CREATE TABLE public.blocks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID        NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL CHECK (type IN ('exercise', 'text')),
  order_index INTEGER     NOT NULL DEFAULT 0,
  exercise_id UUID        REFERENCES public.exercises(id) ON DELETE SET NULL,
  content     TEXT        -- used when type = 'text'
);

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read blocks"
  ON public.blocks FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can manage blocks"
  ON public.blocks FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ─── 6. progress (block-level) ────────────────────────────────────────────────

CREATE TABLE public.progress (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  block_id     UUID        NOT NULL REFERENCES public.blocks(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, block_id)
);

ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;

-- Users can read their own progress
CREATE POLICY "Users can read own progress"
  ON public.progress FOR SELECT
  USING (auth.uid() = user_id);

-- Users can mark blocks complete (insert)
CREATE POLICY "Users can insert own progress"
  ON public.progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can un-mark blocks (delete)
CREATE POLICY "Users can delete own progress"
  ON public.progress FOR DELETE
  USING (auth.uid() = user_id);


-- ─── Done ─────────────────────────────────────────────────────────────────────
-- Tables created: weeks, days, tasks, blocks, progress
-- Indexes on FK columns are created automatically by Postgres for PKs;
-- add extras if query patterns require it:
--
-- CREATE INDEX ON public.weeks      (course_id);
-- CREATE INDEX ON public.days       (week_id);
-- CREATE INDEX ON public.tasks      (day_id);
-- CREATE INDEX ON public.blocks     (task_id);
-- CREATE INDEX ON public.progress   (user_id, block_id);
