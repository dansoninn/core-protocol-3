-- ============================================================
-- Core Protocol — a part's icon
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
--
-- tasks.icon — key of an icon from a fixed list in web/lib/partIcons.tsx
-- ("dumbbell", "flame", "leaf"…). NULL shows the default (dumbbell). The
-- bubble's colour is the existing tasks.color.
-- No CHECK constraint on purpose: the list lives in code, and an unknown key
-- falls back to the default, so the list can change without a migration.
--
-- Additive only. Safe to re-run.
-- ============================================================

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS icon TEXT;
