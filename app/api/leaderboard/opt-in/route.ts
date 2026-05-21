import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  try {
    const { data, error } = await supabase
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
    const { userId, showOnLeaderboard } = await request.json()

    if (!userId || typeof showOnLeaderboard !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { error } = await supabase
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
