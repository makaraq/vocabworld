import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getApiUser } from '@/lib/auth/api-auth'

// Lazy service-role client: defers createClient so importing this route during
// the static-export build does not require Supabase env vars at build time.
let _client: ReturnType<typeof createClient<any>> | null = null
function getServiceClient() {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _client
}

export async function GET(request: NextRequest) {
  const user = await getApiUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = user.id

  try {
    const { data, error } = await getServiceClient()
      .from('user_profiles')
      .select('show_on_leaderboard')
      .eq('id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return NextResponse.json({
      showOnLeaderboard: data?.show_on_leaderboard ?? false,
    })
  } catch (error) {
    console.error('Error fetching leaderboard opt-in:', error)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { showOnLeaderboard } = await request.json()
    const userId = user.id

    if (typeof showOnLeaderboard !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { error } = await getServiceClient()
      .from('user_profiles')
      .update({
        show_on_leaderboard: showOnLeaderboard,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating leaderboard opt-in:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
