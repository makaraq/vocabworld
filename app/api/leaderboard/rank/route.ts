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
  const { searchParams } = new URL(request.url)
  const targetLanguageCode = searchParams.get('targetLanguageCode')

  if (!targetLanguageCode) {
    return NextResponse.json({ error: 'targetLanguageCode required' }, { status: 400 })
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
  // PostgREST caps a response at 1000 rows, so page through the table — a
  // partial scan would hand the user a rank computed from an arbitrary slice.
  const PAGE = 1000
  const data: { user_id: string; play_count: number }[] = []
  for (let from = 0; ; from += PAGE) {
    let query = getServiceClient()
      .from('user_word_progress')
      .select('user_id, play_count, last_played_at')
      .eq('target_language_code', targetLanguageCode)
      .order('user_id', { ascending: true })
      .range(from, from + PAGE - 1)

    if (isWeekly) {
      const now = new Date()
      const day = now.getDay()
      const diff = now.getDate() - day + (day === 0 ? -6 : 1)
      const weekStart = new Date(now.setDate(diff))
      weekStart.setHours(0, 0, 0, 0)
      query = query.gte('last_played_at', weekStart.toISOString())
    }

    const { data: page, error } = await query
    if (error || !page) return null
    data.push(...page)
    if (page.length < PAGE) break
  }

  const scores = new Map<string, number>()
  for (const row of data) {
    scores.set(row.user_id, (scores.get(row.user_id) || 0) + row.play_count)
  }

  const sorted = Array.from(scores.entries()).sort((a, b) => b[1] - a[1])
  const idx = sorted.findIndex(([uid]) => uid === userId)

  return idx === -1 ? null : idx + 1
}
