-- ============================================================
-- Core Protocol — Day view v2: workout formats + exercise prescription
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
--
-- Additive only. Every new column is nullable or has a safe default, so
-- existing tasks and blocks keep working unchanged. Safe to re-run.
-- ============================================================

BEGIN;

-- ─── tasks: workout format for the part ──────────────────────────────────────
-- Superset/complex is NOT a format — it is a grouping of blocks (group_label).

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS instructions TEXT,            -- "Leiðbeiningar" for the part
  ADD COLUMN IF NOT EXISTS format TEXT NOT NULL DEFAULT 'sets'
    CONSTRAINT tasks_format_check CHECK (format IN (
      'sets', 'amrap', 'emom', 'tabata', 'for_time',
      'rounds', 'interval', 'ladder', 'chipper'
    )),
  ADD COLUMN IF NOT EXISTS work_sec INTEGER,             -- interval/tabata work, EMOM interval
  ADD COLUMN IF NOT EXISTS rest_sec INTEGER,             -- interval/tabata rest, rest between rounds
  ADD COLUMN IF NOT EXISTS rounds INTEGER,
  ADD COLUMN IF NOT EXISTS time_cap_sec INTEGER,         -- AMRAP duration, for_time/chipper cap
  ADD COLUMN IF NOT EXISTS rep_scheme TEXT;              -- ladder only, e.g. '2-4-6-8-10' or '21-15-9'

-- ─── blocks: structured prescription per exercise ───────────────────────────
-- Existing sets / reps / load are unchanged.
--
-- Convention (no column): on an exercise block, blocks.content is a
-- program-specific coaching note. When it is empty, the UI falls back to the
-- exercise bank's exercises.description.

ALTER TABLE public.blocks
  ADD COLUMN IF NOT EXISTS duration_sec INTEGER,         -- e.g. 30 for "30 sek."
  ADD COLUMN IF NOT EXISTS rest_sec INTEGER,             -- rest after this exercise / after its group
  ADD COLUMN IF NOT EXISTS side TEXT
    CONSTRAINT blocks_side_check CHECK (side IN ('each_side', 'alternating')),
  ADD COLUMN IF NOT EXISTS intensity TEXT
    CONSTRAINT blocks_intensity_check CHECK (intensity IN ('light', 'moderate', 'hard')),
  ADD COLUMN IF NOT EXISTS group_label TEXT;             -- 'A', 'B'… groups blocks into a superset/complex

COMMIT;

-- ─── Verify (run after the migration) ───────────────────────────────────────
-- Expect 12 rows: 7 on tasks, 5 on blocks.
--
-- SELECT table_name, column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND (
--        (table_name = 'tasks'  AND column_name IN ('instructions', 'format', 'work_sec',
--                                                   'rest_sec', 'rounds', 'time_cap_sec',
--                                                   'rep_scheme'))
--     OR (table_name = 'blocks' AND column_name IN ('duration_sec', 'rest_sec', 'side',
--                                                   'intensity', 'group_label'))
--   )
-- ORDER BY table_name, column_name;
