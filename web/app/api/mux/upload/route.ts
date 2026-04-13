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

// Poll for upload → asset readiness; returns playbackId once the asset is ready
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const uploadId = searchParams.get('uploadId')
  if (!uploadId) {
    return NextResponse.json({ error: 'Missing uploadId' }, { status: 400 })
  }

  const upload = await mux.video.uploads.retrieve(uploadId)

  if (!upload.asset_id) {
    return NextResponse.json({ status: upload.status })
  }

  const asset = await mux.video.assets.retrieve(upload.asset_id)
  const playbackId = asset.playback_ids?.[0]?.id ?? null

  return NextResponse.json({
    status: asset.status,
    assetId: asset.id,
    playbackId,
  })
}
