// Backfill tasks.video_duration_sec from Mux for task videos uploaded before
// the duration was captured on upload (day view step 3b).
//
//   node scripts/backfill-video-duration.mjs           dry run — prints what it would write
//   node scripts/backfill-video-duration.mjs --apply   writes the durations
//
// Run from web/. Reads .env.local; variables already set in the shell win.
// Needs:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   a valid service-role / secret key — RLS lets only
//                               admins update tasks, and this script has no session
//   MUX_TOKEN_ID, MUX_TOKEN_SECRET
//
// For each task with a video_url and no duration: video_url is a Mux playback
// ID → Mux playback-id lookup gives the asset → the asset gives the duration
// (seconds, rounded). Only rows whose duration is still null are written, so a
// re-run, or an upload that saved its own duration meanwhile, is left alone.

import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import Mux from "@mux/mux-node";

const apply = process.argv.includes("--apply");

try {
  process.loadEnvFile(fileURLToPath(new URL("../.env.local", import.meta.url)));
} catch {
  // No .env.local — rely on the shell environment.
}

const {
  NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: serviceKey,
  MUX_TOKEN_ID: muxTokenId,
  MUX_TOKEN_SECRET: muxTokenSecret,
} = process.env;

const missing = Object.entries({
  NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: serviceKey,
  MUX_TOKEN_ID: muxTokenId,
  MUX_TOKEN_SECRET: muxTokenSecret,
})
  .filter(([, v]) => !v)
  .map(([k]) => k);
if (missing.length > 0) {
  console.error(`Missing: ${missing.join(", ")}. Set them in web/.env.local or the shell.`);
  process.exit(1);
}

// A legacy service_role key is a JWT (eyJ…); a new secret key starts with
// sb_secret_. Anything else is rejected by Supabase — fail before any request.
if (!serviceKey.startsWith("eyJ") && !serviceKey.startsWith("sb_secret_")) {
  console.error(
    `SUPABASE_SERVICE_ROLE_KEY is not a service-role or secret key (${serviceKey.length} characters).\n` +
      "Replace it with the project's secret key from Supabase → Project Settings → API keys."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const mux = new Mux({ tokenId: muxTokenId, tokenSecret: muxTokenSecret });

/** tasks.video_url holds the bare playback ID; tolerate a stream.mux.com URL. Null for anything else. */
function playbackIdOf(videoUrl) {
  const v = videoUrl.trim();
  if (/^[A-Za-z0-9]+$/.test(v)) return v;
  const m = v.match(/^https?:\/\/stream\.mux\.com\/([A-Za-z0-9]+)/);
  return m ? m[1] : null;
}

const { data: tasks, error } = await supabase
  .from("tasks")
  .select("id, name, video_url")
  .not("video_url", "is", null)
  .is("video_duration_sec", null)
  .order("id");

if (error) {
  console.error(`Reading tasks failed: ${error.message}`);
  if (/video_duration_sec/.test(error.message)) {
    console.error("Run web/migration-task-progress.sql first.");
  }
  process.exit(1);
}

console.log(`${apply ? "APPLY" : "DRY RUN"} — ${tasks.length} task(s) with a video and no duration\n`);

const counts = { written: 0, wouldWrite: 0, skipped: 0, failed: 0 };

for (const task of tasks) {
  const label = `${task.id}  ${task.name}`;
  const playbackId = playbackIdOf(task.video_url);
  if (!playbackId) {
    console.log(`skip    ${label} — video_url is not a Mux playback ID: ${task.video_url}`);
    counts.skipped++;
    continue;
  }

  let durationSec;
  try {
    const pid = await mux.video.playbackIds.retrieve(playbackId);
    if (pid.object.type !== "asset") {
      console.log(`skip    ${label} — playback ID belongs to a ${pid.object.type}, not an asset`);
      counts.skipped++;
      continue;
    }
    const asset = await mux.video.assets.retrieve(pid.object.id);
    if (asset.status !== "ready" || typeof asset.duration !== "number") {
      console.log(`skip    ${label} — asset ${asset.id} is ${asset.status}, no duration yet`);
      counts.skipped++;
      continue;
    }
    durationSec = Math.round(asset.duration);
  } catch (err) {
    console.log(`fail    ${label} — Mux lookup for ${playbackId}: ${err instanceof Error ? err.message : err}`);
    counts.failed++;
    continue;
  }

  if (!apply) {
    console.log(`would   ${label} — ${durationSec} s`);
    counts.wouldWrite++;
    continue;
  }

  const { error: updateError } = await supabase
    .from("tasks")
    .update({ video_duration_sec: durationSec })
    .eq("id", task.id)
    .is("video_duration_sec", null);
  if (updateError) {
    console.log(`fail    ${label} — update: ${updateError.message}`);
    counts.failed++;
  } else {
    console.log(`wrote   ${label} — ${durationSec} s`);
    counts.written++;
  }
}

console.log(
  `\n${apply ? `${counts.written} written` : `${counts.wouldWrite} would be written`}, ` +
    `${counts.skipped} skipped, ${counts.failed} failed.` +
    (apply ? "" : " Re-run with --apply to write.")
);
process.exit(counts.failed > 0 ? 1 : 0);
