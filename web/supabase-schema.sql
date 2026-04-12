-- ============================================================
-- Core Protocol — Supabase schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- ─── 1. profiles ─────────────────────────────────────────────────────────────
-- Automatically populated when a user signs up via the trigger below.

CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT        NOT NULL,
  role       TEXT        NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ─── 2. Admin helper function ─────────────────────────────────────────────────
-- SECURITY DEFINER bypasses RLS, preventing infinite recursion when called
-- from inside a policy on the profiles table.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Allow admins to read all profiles and update roles
CREATE POLICY "Admin can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admin can update profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─── 3. courses ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.courses (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT        NOT NULL,
  slug        TEXT        NOT NULL UNIQUE,
  description TEXT,
  category    TEXT        NOT NULL DEFAULT 'Styrkur',
  price       INTEGER     NOT NULL DEFAULT 0,
  cover_image TEXT,
  instructor  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Courses are publicly readable"
  ON public.courses FOR SELECT
  USING (true);

CREATE POLICY "Admin can manage courses"
  ON public.courses FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─── 4. exercises ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.exercises (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  category    TEXT        NOT NULL DEFAULT 'Styrkur',
  description TEXT,
  video_url   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Exercises are publicly readable"
  ON public.exercises FOR SELECT
  USING (true);

CREATE POLICY "Admin can manage exercises"
  ON public.exercises FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─── 5. weeks ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.weeks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   UUID        NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  order_index INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.weeks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Weeks are publicly readable"
  ON public.weeks FOR SELECT
  USING (true);

CREATE POLICY "Admin can manage weeks"
  ON public.weeks FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─── 6. days ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.days (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id         UUID        NOT NULL REFERENCES public.weeks(id) ON DELETE CASCADE,
  title           TEXT        NOT NULL,
  video_url       TEXT,
  workout_text    TEXT,
  is_free_preview BOOLEAN     NOT NULL DEFAULT FALSE,
  order_index     INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Days are publicly readable"
  ON public.days FOR SELECT
  USING (true);

CREATE POLICY "Admin can manage days"
  ON public.days FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─── 7. day_exercises (junction) ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.day_exercises (
  day_id      UUID NOT NULL REFERENCES public.days(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  PRIMARY KEY (day_id, exercise_id)
);

ALTER TABLE public.day_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Day exercises are publicly readable"
  ON public.day_exercises FOR SELECT
  USING (true);

CREATE POLICY "Admin can manage day exercises"
  ON public.day_exercises FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─── 8. purchases ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.purchases (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id  UUID        NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, course_id)
);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own purchases"
  ON public.purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own purchases"
  ON public.purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ─── 9. progress ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.progress (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_id     UUID        NOT NULL REFERENCES public.days(id) ON DELETE CASCADE,
  completed  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, day_id)
);

ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own progress"
  ON public.progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── Trigger: auto-create profile on signup ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
