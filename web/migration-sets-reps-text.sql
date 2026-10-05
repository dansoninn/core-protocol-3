-- ============================================================
-- Core Protocol — blocks.sets / blocks.reps: INTEGER → TEXT
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
--
-- Why: coaches need ranges and notes — "8-12", "3-4", "10/hlið", "max" —
-- which an INTEGER column rejects. All app code already reads and writes
-- these as text. Existing numbers convert as-is (3 → '3').
--
-- One transaction: if anything blocks the change (e.g. a view or CHECK
-- constraint that depends on these columns), nothing is applied — send the
-- error back instead of retrying. Safe to re-run: text → text is a no-op.
--
-- blocks.load_kg (NUMERIC, unused by any code) is deliberately left alone.
-- ============================================================

BEGIN;

ALTER TABLE public.blocks
  ALTER COLUMN sets TYPE text USING sets::text,
  ALTER COLUMN reps TYPE text USING reps::text;

COMMIT;

-- ─── Verify (run after the migration) ───────────────────────────────────────
-- 1. Types. Expect: sets text, reps text, load text, load_kg numeric.
--
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'blocks'
--   AND column_name IN ('sets', 'reps', 'load', 'load_kg')
-- ORDER BY column_name;
--
-- 2. Values survived. Expect the same numbers as before, now as text.
--
-- SELECT id, sets, reps
-- FROM public.blocks
-- WHERE sets IS NOT NULL OR reps IS NOT NULL
-- LIMIT 10;
