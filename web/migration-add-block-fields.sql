-- ============================================================
-- Core Protocol — Add sets/reps/load to blocks, video_url to tasks
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Add prescription fields to blocks
ALTER TABLE public.blocks
  ADD COLUMN IF NOT EXISTS sets TEXT,
  ADD COLUMN IF NOT EXISTS reps TEXT,
  ADD COLUMN IF NOT EXISTS load TEXT;

-- Add optional video to tasks
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Create task-videos storage bucket (run separately if needed)
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('task-videos', 'task-videos', true)
-- ON CONFLICT DO NOTHING;
