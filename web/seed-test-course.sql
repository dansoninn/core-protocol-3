-- ============================================================
-- Core Protocol — Test course for building and checking day view step 3b
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
--
-- "TEST — prófunarnámskeið" (/courses/test-namskeid): 1 week, 4 days, 10
-- parts covering every case step 3b must render. Fixed UUIDs (prefix
-- 7e570000-…) and ON CONFLICT DO NOTHING: a re-run inserts nothing and changes
-- nothing, including edits made in /admin since. No DELETEs.
--
-- Uses only exercises already in the exercise bank, by id (names in the
-- comments; "Kálfalyftur" exists twice, so names are not unique):
--   Hnébeygja                              77064159-2498-46b9-86fb-e71a6349682b
--   Pushups (no explanation video)          6ba58344-c556-41eb-98d2-dd6ffe321d7b
--   Kálfalyftur (Styrkur)                   4551b84c-3f49-43d7-8b0c-ffc2787269e6
--   Englahringir                            2d73d310-a7b0-42d8-8fd7-ed29de80831a
--   Ganga og snúa öxlum                     1ad82136-af41-4369-973c-4021ead95341
--   Háar hnélyftur með bjöllu öðru megin    24056499-8d32-4238-845e-33a4a00b9beb
--   Hælspark og olnbogar aftur              adafae75-787c-4753-8df3-f9db1a32fae5
--   Toga í sundur                           edce19ec-09bb-4208-ad89-2607d2def8e2
--
-- Day 4's video: the playback ID of the first existing task video (course,
-- week, day, part order). If no task has one, Englahringir's exercise video is
-- used instead — also a real Mux asset. The last SELECT says which.
-- video_duration_sec stays NULL so the backfill path is exercised.
--
-- Visible to everyone on / and /courses: courses has no published flag.
-- ============================================================

BEGIN;

-- ─── Course and week ─────────────────────────────────────────────────────────

INSERT INTO public.courses (id, title, slug, description, category, price, cover_image, instructor)
VALUES (
  '7e570000-0000-4000-a000-000000000001',
  'TEST — prófunarnámskeið',
  'test-namskeid',
  'Prófunargögn fyrir dagsýn, skref 3b. Ekki ætlað notendum.',
  'Styrkur',  -- same category as Sterkari 60+ and Styrkur 101
  0,
  NULL,
  NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.weeks (id, course_id, title, order_index)
VALUES ('7e570000-0000-4000-a000-000000000101', '7e570000-0000-4000-a000-000000000001', 'Vika 1', 0)
ON CONFLICT (id) DO NOTHING;

-- ─── Days ────────────────────────────────────────────────────────────────────

INSERT INTO public.days (id, week_id, title, description, order_index) VALUES
  ('7e570000-0000-4000-a000-000000000201', '7e570000-0000-4000-a000-000000000101',
   'Sets, texti og leiðbeiningar',
   'Prófun: sets-hluti með texta og bili/hlið, og hluti með aðeins leiðbeiningum.', 0),
  ('7e570000-0000-4000-a000-000000000202', '7e570000-0000-4000-a000-000000000101',
   'AMRAP, EMOM, Tabata og hópar',
   'Prófun: tímasnið og ofursett (A1/A2) og samsett (B1/B2/B3).', 1),
  ('7e570000-0000-4000-a000-000000000203', '7e570000-0000-4000-a000-000000000101',
   'For time, stigi og chipper',
   'Prófun: for time, 21-15-9 stigi og chipper.', 2),
  ('7e570000-0000-4000-a000-000000000204', '7e570000-0000-4000-a000-000000000101',
   'Myndbandshluti',
   'Prófun: myndbandshluti með tveimur merktum æfingum, án lengdar.', 3)
ON CONFLICT (id) DO NOTHING;

-- ─── Parts (tasks) ───────────────────────────────────────────────────────────
-- Only the parameters each format uses are filled (components/admin/TaskSettings.tsx
-- → FORMAT_PARAMS); the rest are NULL, as the admin leaves them.

INSERT INTO public.tasks
  (id, day_id, name, color, order_index, video_url, instructions,
   format, work_sec, rest_sec, rounds, time_cap_sec, rep_scheme, video_duration_sec)
VALUES
  -- Day 1 — sets with a text block and no instructions, so the text block
  -- becomes "Leiðbeiningar"
  ('7e570000-0000-4000-a000-000000000301', '7e570000-0000-4000-a000-000000000201',
   'Styrkur', '#F5A623', 0, NULL, NULL,
   'sets', NULL, NULL, NULL, NULL, NULL, NULL),
  -- Day 1 — instructions only, no blocks: completable only through task_progress
  ('7e570000-0000-4000-a000-000000000302', '7e570000-0000-4000-a000-000000000201',
   'Teygjur', '#F5A623', 1, NULL,
   'Rólegar teygjur í 5–10 mínútur: kálfar, læri, mjaðmir og axlir. Haldið hverri teygju í 20–30 sek.',
   'sets', NULL, NULL, NULL, NULL, NULL, NULL),

  -- Day 2 — AMRAP 12 mín
  ('7e570000-0000-4000-a000-000000000303', '7e570000-0000-4000-a000-000000000202',
   'AMRAP', '#F5A623', 0, NULL,
   'Eins margar umferðir og þú nærð á 12 mínútum.',
   'amrap', NULL, NULL, NULL, 720, NULL, NULL),
  -- Day 2 — EMOM: 60 s interval × 10
  ('7e570000-0000-4000-a000-000000000304', '7e570000-0000-4000-a000-000000000202',
   'EMOM', '#F5A623', 1, NULL,
   'Á hverri mínútu: kláraðu æfinguna og hvíldu út mínútuna. Skiptist á æfingum.',
   'emom', 60, NULL, 10, NULL, NULL, NULL),
  -- Day 2 — Tabata 20/10 × 8
  ('7e570000-0000-4000-a000-000000000305', '7e570000-0000-4000-a000-000000000202',
   'Tabata', '#F5A623', 2, NULL,
   '20 sek. vinna, 10 sek. hvíld, 8 umferðir. Skiptist á æfingunum.',
   'tabata', 20, 10, 8, NULL, NULL, NULL),
  -- Day 2 — superset A1/A2 and complex B1/B2/B3 (group_label, not a format)
  ('7e570000-0000-4000-a000-000000000306', '7e570000-0000-4000-a000-000000000202',
   'Ofursett og samsett', '#F5A623', 3, NULL,
   'A: ofursett — A1 og A2 til skiptis, hvíld eftir A2. B: samsett — B1, B2 og B3 í röð án hvíldar, hvíld eftir B3.',
   'sets', NULL, NULL, NULL, NULL, NULL, NULL),

  -- Day 3 — for time: 3 rounds, 15 min cap
  ('7e570000-0000-4000-a000-000000000307', '7e570000-0000-4000-a000-000000000203',
   'For time', '#F5A623', 0, NULL,
   '3 umferðir eins hratt og þú getur með góðri tækni. Tímamörk 15 mín.',
   'for_time', NULL, NULL, 3, 900, NULL, NULL),
  -- Day 3 — ladder 21-15-9, no cap (the cap is optional for a ladder)
  ('7e570000-0000-4000-a000-000000000308', '7e570000-0000-4000-a000-000000000203',
   'Stigi 21-15-9', '#F5A623', 1, NULL,
   'Hver tala er fjöldi endurtekninga á hverja æfingu í þeirri umferð.',
   'ladder', NULL, NULL, NULL, NULL, '21-15-9', NULL),
  -- Day 3 — chipper, 20 min cap
  ('7e570000-0000-4000-a000-000000000309', '7e570000-0000-4000-a000-000000000203',
   'Chipper', '#F5A623', 2, NULL,
   'Kláraðu hverja æfingu áður en þú ferð í þá næstu. Tímamörk 20 mín.',
   'chipper', NULL, NULL, NULL, 1200, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- Day 4 — video part. video_url is looked up from existing data (see header);
-- video_duration_sec stays NULL for the backfill.
INSERT INTO public.tasks
  (id, day_id, name, color, order_index, video_url, instructions,
   format, work_sec, rest_sec, rounds, time_cap_sec, rep_scheme, video_duration_sec)
SELECT
  '7e570000-0000-4000-a000-000000000310', '7e570000-0000-4000-a000-000000000204',
  'Aðalþáttur', '#F5A623', 0,
  COALESCE(
    (SELECT t.video_url
       FROM public.tasks t
       JOIN public.days d  ON d.id = t.day_id
       JOIN public.weeks w ON w.id = d.week_id
      WHERE t.video_url ~ '^[A-Za-z0-9]+$'          -- a bare Mux playback ID
        AND w.course_id <> '7e570000-0000-4000-a000-000000000001'
      ORDER BY w.course_id, w.order_index, d.order_index, t.order_index, t.id
      LIMIT 1),
    (SELECT e.mux_playback_id
       FROM public.exercises e
      WHERE e.id = '2d73d310-a7b0-42d8-8fd7-ed29de80831a')  -- Englahringir
  ),
  'Fylgdu myndbandinu. Æfingarnar hér fyrir neðan eru til viðmiðunar.',
  'sets', NULL, NULL, NULL, NULL, NULL, NULL
ON CONFLICT (id) DO NOTHING;

-- ─── Blocks ──────────────────────────────────────────────────────────────────

INSERT INTO public.blocks
  (id, task_id, type, order_index, exercise_id, content,
   sets, reps, load, duration_sec, rest_sec, side, intensity, group_label)
VALUES
  -- Day 1 · Styrkur — text block, then text sets/reps/load, a side, a coach
  -- note, and an exercise without an explanation video (Pushups)
  ('7e570000-0000-4000-a000-000000000401', '7e570000-0000-4000-a000-000000000301', 'text', 0, NULL,
   'Hitið upp í 5 mínútur áður en byrjað er. Hvílið 60–90 sek. á milli setta.',
   NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('7e570000-0000-4000-a000-000000000402', '7e570000-0000-4000-a000-000000000301', 'exercise', 1,
   '77064159-2498-46b9-86fb-e71a6349682b', NULL,                       -- Hnébeygja
   '3-4', '8-12', 'Létt handlóð', NULL, 90, NULL, 'moderate', NULL),
  ('7e570000-0000-4000-a000-000000000403', '7e570000-0000-4000-a000-000000000301', 'exercise', 2,
   '24056499-8d32-4238-845e-33a4a00b9beb', NULL,                       -- Háar hnélyftur með bjöllu öðru megin
   '3', '10/hlið', '8 kg', NULL, 60, 'each_side', NULL, NULL),
  ('7e570000-0000-4000-a000-000000000404', '7e570000-0000-4000-a000-000000000301', 'exercise', 3,
   '6ba58344-c556-41eb-98d2-dd6ffe321d7b',                             -- Pushups
   'Á hnjám ef þarf — haldið beinu baki.',
   '3', 'max', NULL, NULL, NULL, NULL, 'hard', NULL),
  ('7e570000-0000-4000-a000-000000000405', '7e570000-0000-4000-a000-000000000301', 'exercise', 4,
   '4551b84c-3f49-43d7-8b0c-ffc2787269e6', NULL,                       -- Kálfalyftur
   '2', '15-20', NULL, NULL, NULL, NULL, NULL, NULL),

  -- Day 2 · AMRAP
  ('7e570000-0000-4000-a000-000000000406', '7e570000-0000-4000-a000-000000000303', 'exercise', 0,
   '77064159-2498-46b9-86fb-e71a6349682b', NULL,                       -- Hnébeygja
   NULL, '10', NULL, NULL, NULL, NULL, NULL, NULL),
  ('7e570000-0000-4000-a000-000000000407', '7e570000-0000-4000-a000-000000000303', 'exercise', 1,
   '6ba58344-c556-41eb-98d2-dd6ffe321d7b', NULL,                       -- Pushups
   NULL, '8', NULL, NULL, NULL, NULL, NULL, NULL),
  ('7e570000-0000-4000-a000-000000000408', '7e570000-0000-4000-a000-000000000303', 'exercise', 2,
   'edce19ec-09bb-4208-ad89-2607d2def8e2', NULL,                       -- Toga í sundur
   NULL, '15', NULL, NULL, NULL, NULL, NULL, NULL),

  -- Day 2 · EMOM
  ('7e570000-0000-4000-a000-000000000409', '7e570000-0000-4000-a000-000000000304', 'exercise', 0,
   '4551b84c-3f49-43d7-8b0c-ffc2787269e6', NULL,                       -- Kálfalyftur
   NULL, '12', NULL, NULL, NULL, NULL, NULL, NULL),
  ('7e570000-0000-4000-a000-000000000410', '7e570000-0000-4000-a000-000000000304', 'exercise', 1,
   '2d73d310-a7b0-42d8-8fd7-ed29de80831a', NULL,                       -- Englahringir
   NULL, '10', NULL, NULL, NULL, NULL, NULL, NULL),

  -- Day 2 · Tabata — no reps; the format gives the time
  ('7e570000-0000-4000-a000-000000000411', '7e570000-0000-4000-a000-000000000305', 'exercise', 0,
   'adafae75-787c-4753-8df3-f9db1a32fae5', NULL,                       -- Hælspark og olnbogar aftur
   NULL, NULL, NULL, NULL, NULL, 'alternating', NULL, NULL),
  ('7e570000-0000-4000-a000-000000000412', '7e570000-0000-4000-a000-000000000305', 'exercise', 1,
   '1ad82136-af41-4369-973c-4021ead95341', NULL,                       -- Ganga og snúa öxlum
   NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),

  -- Day 2 · Ofursett og samsett — A1/A2 superset, B1/B2/B3 complex; rest on
  -- the last block of each group; B3 is timed (30 sek.)
  ('7e570000-0000-4000-a000-000000000413', '7e570000-0000-4000-a000-000000000306', 'exercise', 0,
   '77064159-2498-46b9-86fb-e71a6349682b', NULL,                       -- A1 Hnébeygja
   '3', '8-10', NULL, NULL, NULL, NULL, NULL, 'A'),
  ('7e570000-0000-4000-a000-000000000414', '7e570000-0000-4000-a000-000000000306', 'exercise', 1,
   '6ba58344-c556-41eb-98d2-dd6ffe321d7b', NULL,                       -- A2 Pushups
   '3', 'max', NULL, NULL, 90, NULL, NULL, 'A'),
  ('7e570000-0000-4000-a000-000000000415', '7e570000-0000-4000-a000-000000000306', 'exercise', 2,
   '4551b84c-3f49-43d7-8b0c-ffc2787269e6', NULL,                       -- B1 Kálfalyftur
   '3', '15', NULL, NULL, NULL, NULL, NULL, 'B'),
  ('7e570000-0000-4000-a000-000000000416', '7e570000-0000-4000-a000-000000000306', 'exercise', 3,
   'edce19ec-09bb-4208-ad89-2607d2def8e2', NULL,                       -- B2 Toga í sundur
   '3', '12', NULL, NULL, NULL, NULL, NULL, 'B'),
  ('7e570000-0000-4000-a000-000000000417', '7e570000-0000-4000-a000-000000000306', 'exercise', 4,
   '2d73d310-a7b0-42d8-8fd7-ed29de80831a', NULL,                       -- B3 Englahringir
   '3', NULL, NULL, 30, 60, NULL, NULL, 'B'),

  -- Day 3 · For time
  ('7e570000-0000-4000-a000-000000000418', '7e570000-0000-4000-a000-000000000307', 'exercise', 0,
   '77064159-2498-46b9-86fb-e71a6349682b', NULL,                       -- Hnébeygja
   NULL, '15', NULL, NULL, NULL, NULL, NULL, NULL),
  ('7e570000-0000-4000-a000-000000000419', '7e570000-0000-4000-a000-000000000307', 'exercise', 1,
   '6ba58344-c556-41eb-98d2-dd6ffe321d7b', NULL,                       -- Pushups
   NULL, '10', NULL, NULL, NULL, NULL, NULL, NULL),
  ('7e570000-0000-4000-a000-000000000420', '7e570000-0000-4000-a000-000000000307', 'exercise', 2,
   '24056499-8d32-4238-845e-33a4a00b9beb', NULL,                       -- Háar hnélyftur með bjöllu öðru megin
   NULL, '10/hlið', NULL, NULL, NULL, 'each_side', NULL, NULL),

  -- Day 3 · Stigi 21-15-9 — reps come from rep_scheme
  ('7e570000-0000-4000-a000-000000000421', '7e570000-0000-4000-a000-000000000308', 'exercise', 0,
   '77064159-2498-46b9-86fb-e71a6349682b', NULL,                       -- Hnébeygja
   NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('7e570000-0000-4000-a000-000000000422', '7e570000-0000-4000-a000-000000000308', 'exercise', 1,
   '4551b84c-3f49-43d7-8b0c-ffc2787269e6', NULL,                       -- Kálfalyftur
   NULL, NULL, NULL, NULL, NULL, NULL, 'light', NULL),

  -- Day 3 · Chipper
  ('7e570000-0000-4000-a000-000000000423', '7e570000-0000-4000-a000-000000000309', 'exercise', 0,
   'edce19ec-09bb-4208-ad89-2607d2def8e2', NULL,                       -- Toga í sundur
   NULL, '50', NULL, NULL, NULL, NULL, NULL, NULL),
  ('7e570000-0000-4000-a000-000000000424', '7e570000-0000-4000-a000-000000000309', 'exercise', 1,
   '4551b84c-3f49-43d7-8b0c-ffc2787269e6', NULL,                       -- Kálfalyftur
   NULL, '40', NULL, NULL, NULL, NULL, NULL, NULL),
  ('7e570000-0000-4000-a000-000000000425', '7e570000-0000-4000-a000-000000000309', 'exercise', 2,
   '77064159-2498-46b9-86fb-e71a6349682b', NULL,                       -- Hnébeygja
   NULL, '30', NULL, NULL, NULL, NULL, NULL, NULL),
  ('7e570000-0000-4000-a000-000000000426', '7e570000-0000-4000-a000-000000000309', 'exercise', 3,
   '6ba58344-c556-41eb-98d2-dd6ffe321d7b', NULL,                       -- Pushups
   NULL, '20', NULL, NULL, NULL, NULL, NULL, NULL),
  ('7e570000-0000-4000-a000-000000000427', '7e570000-0000-4000-a000-000000000309', 'exercise', 4,
   '2d73d310-a7b0-42d8-8fd7-ed29de80831a', NULL,                       -- Englahringir
   NULL, '10', NULL, NULL, NULL, NULL, NULL, NULL),

  -- Day 4 · Aðalþáttur — two tagged reference exercises, no prescription
  ('7e570000-0000-4000-a000-000000000428', '7e570000-0000-4000-a000-000000000310', 'exercise', 0,
   '77064159-2498-46b9-86fb-e71a6349682b', NULL,                       -- Hnébeygja
   NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('7e570000-0000-4000-a000-000000000429', '7e570000-0000-4000-a000-000000000310', 'exercise', 1,
   '4551b84c-3f49-43d7-8b0c-ffc2787269e6', NULL,                       -- Kálfalyftur
   NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- ─── Enrolment for Daniel ────────────────────────────────────────────────────
-- Inserts nothing if no profile has this email; the SELECT below shows it.
-- No target on ON CONFLICT: also covers UNIQUE (user_id, course_id).

INSERT INTO public.purchases (id, user_id, course_id)
SELECT '7e570000-0000-4000-a000-000000000501', p.id, '7e570000-0000-4000-a000-000000000001'
FROM public.profiles p
WHERE lower(p.email) = 'dthordarson2@gmail.com'
ON CONFLICT DO NOTHING;

COMMIT;

-- ─── Result ──────────────────────────────────────────────────────────────────
-- Expect days 4, parts 10, blocks 29, purchases_for_daniel 1, and one of
-- video_from_task / video_from_exercise filled. A re-run returns the same row.

SELECT
  (SELECT count(*) FROM public.days
    WHERE week_id = '7e570000-0000-4000-a000-000000000101') AS days,
  (SELECT count(*) FROM public.tasks t JOIN public.days d ON d.id = t.day_id
    WHERE d.week_id = '7e570000-0000-4000-a000-000000000101') AS parts,
  (SELECT count(*) FROM public.blocks b JOIN public.tasks t ON t.id = b.task_id
    JOIN public.days d ON d.id = t.day_id
    WHERE d.week_id = '7e570000-0000-4000-a000-000000000101') AS blocks,
  (SELECT count(*) FROM public.purchases pu JOIN public.profiles p ON p.id = pu.user_id
    WHERE pu.course_id = '7e570000-0000-4000-a000-000000000001'
      AND lower(p.email) = 'dthordarson2@gmail.com') AS purchases_for_daniel,
  v.video_url AS day4_video,
  (SELECT string_agg(t.name || ' (' || t.id || ')', ', ')
     FROM public.tasks t
    WHERE t.video_url = v.video_url AND t.id <> '7e570000-0000-4000-a000-000000000310') AS video_from_task,
  (SELECT string_agg(e.name, ', ')
     FROM public.exercises e WHERE e.mux_playback_id = v.video_url) AS video_from_exercise
FROM public.tasks v
WHERE v.id = '7e570000-0000-4000-a000-000000000310';
