-- ============================================================
-- Core Protocol — video parts: are the tagged exercises reference only?
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
--
-- tasks.exercises_are_reference — only meaningful when the part has a video.
--   TRUE  (default): the exercises are what the video shows. They are shown
--         for reference and the part is completed as a whole by one
--         "Merkja lokið" — today's behaviour for every video part.
--   FALSE: the video is an intro/demo. Exercises are completed one by one,
--         as in a part without a video.
-- The course builder sets it when a video is attached (TRUE for a video
-- longer than 60 s or of unknown length); the coach can untick it.
--
-- Additive only. DEFAULT TRUE keeps every existing part as it is.
-- Safe to re-run.
-- ============================================================

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS exercises_are_reference BOOLEAN NOT NULL DEFAULT TRUE;

-- Verify — expect one row: exercises_are_reference | boolean | NO | true
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'tasks'
--   AND column_name = 'exercises_are_reference';
