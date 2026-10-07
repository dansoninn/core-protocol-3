import Mux from '@mux/mux-node'
import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/requireAdmin'

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
})

export const dynamic = 'force-dynamic'

export interface MuxLibraryAsset {
  assetId: string
  playbackId: string
  /** Whole seconds, null while Mux has no duration yet. */
  durationSec: number | null
  createdAt: string
  /** meta.title or passthrough — the file name for builder uploads; null for older ones. */
  title: string | null
}

/**
 * Every ready asset in the Mux environment with a public playback ID, newest
 * first — the course builder's video library. Admins only. At most 500
 * (five pages of 100); the builder filters client-side.
 */
export async function GET() {
  const denied = await requireAdminApi()
  if (denied) return denied

  try {
    const out: MuxLibraryAsset[] = []
    for await (const asset of mux.video.assets.list({ limit: 100 })) {
      if (asset.status === 'ready') {
        const playback = asset.playback_ids?.find((p) => p.policy === 'public')
        if (playback) {
          out.push({
            assetId: asset.id,
            playbackId: playback.id,
            durationSec: typeof asset.duration === 'number' ? Math.round(asset.duration) : null,
            createdAt: new Date(Number(asset.created_at) * 1000).toISOString(),
            title: asset.meta?.title?.trim() || asset.passthrough?.trim() || null,
          })
        }
      }
      if (out.length >= 500) break
    }
    out.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return NextResponse.json({ assets: out })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[mux/assets] list failed:', message)
    return NextResponse.json({ error: `Mux error: ${message}` }, { status: 500 })
  }
}
