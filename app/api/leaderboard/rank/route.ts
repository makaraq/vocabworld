import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const targetLanguageCode = searchParams.get('targetLanguageCode')

  if (!userId || !targetLanguageCode) {
    return NextResponse.json({ error: 'userId and targetLanguageCode required' }, { status: 400 })
  }

  try {
    const [allTimeRank, weeklyRank] = await Promise.all([
      computeRank(userId, targetLanguageCode, false),
      computeRank(userId, targetLanguageCode, true),
    ])

    const bestRank = Math.min(
      allTimeRank ?? Infinity,
      weeklyRank ?? Infinity,
    )

    return NextResponse.json({
      bestRank: bestRank === Infinity ? null : bestRank,
    })
  } catch (error) {
    console.error('Rank error:', error)
    return NextResponse.json({ error: 'Failed to fetch rank' }, { status: 500 })
  }
}

async function computeRank(
  userId: string,
  targetLanguageCode: string,
  isWeekly: boolean,
): Promise<number | null> {
  let query = supabase
    .from('user_word_progress')
    .select('user_id, play_count, last_played_at')
    .eq('target_language_code', targetLanguageCode)

  if (isWeekly) {
    const now = new Date()
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
    const weekStart = new Date(now.setDate(diff))
    weekStart.setHours(0, 0, 0, 0)
    query = query.gte('last_played_at', weekStart.toISOString())
  }

  const { data, error } = await query
  if (error || !data) return null

  const scores = new Map<string, number>()
  for (const row of data) {
    scores.set(row.user_id, (scores.get(row.user_id) || 0) + row.play_count)
  }

  const sorted = Array.from(scores.entries()).sort((a, b) => b[1] - a[1])
  const idx = sorted.findIndex(([uid]) => uid === userId)

  return idx === -1 ? null : idx + 1
}
