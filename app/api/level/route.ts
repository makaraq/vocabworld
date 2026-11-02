import { NextResponse } from 'next/server'
import { getApiUser, getAdminClient } from '@/lib/auth/api-auth'

// The most one sync may add. A device that was offline for a long session, or
// an existing learner's one-time back-pay (lib/leveling/engine.ts
// seedFromStats), stays well under this; anything above is clamped.
const MAX_DELTA = 100_000

// POST - Add the XP this device earned since its last sync, plus its one-time
// back-pay (`seed`, kept only if no device has sent one before); returns the
// total across all devices. `delta: 0` just reads the total.
// Auth: session cookie (web) OR Authorization Bearer header (native)
export async function POST(request: Request) {
  try {
    const user = await getApiUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const raw = Number(body?.delta)
    const rawSeed = Number(body?.seed ?? 0)
    if (!Number.isFinite(raw) || raw < 0 || !Number.isFinite(rawSeed) || rawSeed < 0) {
      return NextResponse.json({ error: 'Invalid delta' }, { status: 400 })
    }
    const delta = Math.min(MAX_DELTA, Math.floor(raw))
    const seed = Math.min(MAX_DELTA, Math.floor(rawSeed))

    // Service-role client — auth verified above; the function only touches
    // this user's row.
    const { data, error } = await getAdminClient().rpc('add_user_xp', {
      p_user: user.id,
      p_delta: delta,
      p_seed: seed,
    })

    if (error) {
      // add-level-xp-schema.sql not applied yet: tell the client to stop
      // trying for this session rather than retrying on every gain.
      if (error.code === 'PGRST202' || error.code === '42883' || error.code === '42703') {
        return NextResponse.json({ error: 'XP sync not set up' }, { status: 501 })
      }
      console.error('❌ Error syncing XP:', error)
      return NextResponse.json({ error: 'Failed to sync XP' }, { status: 500 })
    }

    return NextResponse.json({ xp: Number(data) || 0, accepted: delta })
  } catch (error) {
    console.error('Unexpected error in POST /api/level:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
