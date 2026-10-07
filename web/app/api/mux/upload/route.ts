import Mux from '@mux/mux-node'
import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/requireAdmin'

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
})

// Create a direct upload slot — client PUTs the file to the returned uploadUrl.
// Optional JSON body { title } names the asset in Mux (shown in the course
// builder's video library); the file name is what the builder sends.
export async function POST(request: Request) {
  const denied = await requireAdminApi()
  if (denied) return denied

  let title: string | undefined
  try {
    const body = (await request.json()) as { title?: unknown }
    if (typeof body.title === 'string' && body.title.trim()) {
      title = body.title.trim().slice(0, 255)
    }
  } catch {
    // No body (exercise bank uploads) — the asset stays untitled
  }

  try {
    const upload = await mux.video.uploads.create({
      cors_origin: '*',
      new_asset_settings: {
        playback_policy: ['public'],
        encoding_tier: 'baseline',
        ...(title ? { passthrough: title, meta: { title } } : {}),
      },
    })

    return NextResponse.json({
      uploadId: upload.id,
      uploadUrl: upload.url,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[mux/upload] Failed to create upload slot:', message)
    return NextResponse.json(
      { error: `Mux error: ${message}` },
      { status: 500 }
    )
  }
}

// Poll for upload → asset readiness; returns playbackId (and durationSec once
// ready, whole seconds), or status/error info
export async function GET(request: Request) {
  const denied = await requireAdminApi()
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const uploadId = searchParams.get('uploadId')
  if (!uploadId) {
    return NextResponse.json({ error: 'Missing uploadId' }, { status: 400 })
  }

  const upload = await mux.video.uploads.retrieve(uploadId)

  // Upload-level error (e.g. the PUT itself failed or was rejected)
  if (upload.status === 'errored') {
    return NextResponse.json({ status: 'errored', error: 'Mux rejected the upload' })
  }

  if (!upload.asset_id) {
    // Still waiting for the PUT to complete / asset to be created
    return NextResponse.json({ status: upload.status })
  }

  const asset = await mux.video.assets.retrieve(upload.asset_id)

  if (asset.status === 'errored') {
    const reason = (asset.errors?.messages ?? []).join('; ') || 'Asset processing failed'
    return NextResponse.json({ status: 'errored', error: reason })
  }

  const playbackId = asset.playback_ids?.[0]?.id ?? null
  const durationSec =
    asset.status === 'ready' && typeof asset.duration === 'number'
      ? Math.round(asset.duration)
      : null

  return NextResponse.json({
    status: asset.status,
    assetId: asset.id,
    playbackId,
    durationSec,
  })
}
