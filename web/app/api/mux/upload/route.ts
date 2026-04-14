import Mux from '@mux/mux-node'
import { NextResponse } from 'next/server'

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
})

// Create a direct upload slot — client PUTs the file to the returned uploadUrl
export async function POST() {
  const upload = await mux.video.uploads.create({
    cors_origin: '*',
    new_asset_settings: {
      playback_policy: ['public'],
      encoding_tier: 'baseline',
    },
  })

  return NextResponse.json({
    uploadId: upload.id,
    uploadUrl: upload.url,
  })
}

// Poll for upload → asset readiness; returns playbackId once ready, or status/error info
export async function GET(request: Request) {
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

  return NextResponse.json({
    status: asset.status,
    assetId: asset.id,
    playbackId,
  })
}
