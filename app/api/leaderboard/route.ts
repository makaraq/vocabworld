import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
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

// Non-reversible short token derived from a user's UUID. Used by the client as
// a stable React key and to render an anonymous "Learner #XXXX" label, so the
// raw user_id never leaves the server (prevents UUID harvesting).
function displayIdFor(uuid: string): string {
  return createHash('sha256').update(uuid).digest('hex').slice(0, 8)
}

interface LeaderboardEntry {
  rank: number
  displayId: string
  firstName: string | null
  avatarUrl: string | null
  wordsPlayed: number
  streak: number
  isCurrentUser: boolean
}

export async function GET(request: NextRequest) {
  const user = await getApiUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = user.id
  const { searchParams } = new URL(request.url)
  const targetLanguageCode = searchParams.get('targetLanguageCode')
  const period = searchParams.get('period') || 'alltime'
  const scope = searchParams.get('scope') || 'language'

  if (scope === 'language' && !targetLanguageCode) {
    return NextResponse.json({ error: 'targetLanguageCode is required for language scope' }, { status: 400 })
  }

  try {
    const isWeekly = period === 'week'
    const isGlobal = scope === 'global'

    const leaderboardRows = await fetchLeaderboard(isWeekly, isGlobal, targetLanguageCode)

    const currentUserIndex = leaderboardRows.findIndex((r) => r.user_id === userId)
    let currentUserEntry = null

    if (currentUserIndex === -1) {
      currentUserEntry = await fetchUserRank(userId, isWeekly, isGlobal, targetLanguageCode)
    }

    const entries: LeaderboardEntry[] = leaderboardRows.map((row, i) => ({
      rank: i + 1,
      displayId: displayIdFor(row.user_id),
      firstName: extractFirstName(row.full_name),
      avatarUrl: row.avatar_url,
      wordsPlayed: row.words_played,
      streak: row.streak,
      isCurrentUser: row.user_id === userId,
    }))

    let currentUserRank: LeaderboardEntry | null = null
    if (currentUserEntry && currentUserIndex === -1) {
      currentUserRank = {
        rank: currentUserEntry.rank,
        displayId: displayIdFor(currentUserEntry.user_id),
        firstName: extractFirstName(currentUserEntry.full_name),
        avatarUrl: currentUserEntry.avatar_url,
        wordsPlayed: currentUserEntry.words_played,
        streak: currentUserEntry.streak,
        isCurrentUser: true,
      }
    }

    return NextResponse.json({ entries, currentUserRank })
  } catch (error) {
    console.error('Leaderboard error:', error)
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }
}

function extractFirstName(fullName: string | null): string | null {
  if (!fullName) return null
  return fullName.split(' ')[0]
}

interface LeaderboardRow {
  user_id: string
  words_played: number
  streak: number
  full_name: string | null
  avatar_url: string | null
}

async function fetchLeaderboard(
  isWeekly: boolean,
  isGlobal: boolean,
  targetLanguageCode: string | null
): Promise<LeaderboardRow[]> {
  let query = getServiceClient()
    .from('user_word_progress')
    .select('user_id, play_count, last_played_at, target_language_code')

  if (!isGlobal && targetLanguageCode) {
    query = query.eq('target_language_code', targetLanguageCode)
  }

  if (isWeekly) {
    const weekStart = getWeekStart()
    query = query.gte('last_played_at', weekStart)
  }

  const { data: wordRows, error } = await query

  if (error) throw error

  const userScores = new Map<string, number>()
  for (const row of wordRows || []) {
    const current = userScores.get(row.user_id) || 0
    userScores.set(row.user_id, current + row.play_count)
  }

  if (userScores.size === 0) return []

  const userIds = Array.from(userScores.keys())

  const { data: profiles } = await getServiceClient()
    .from('user_profiles')
    .select('id, full_name, avatar_url, show_on_leaderboard')
    .in('id', userIds)

  const { data: streaks } = await getServiceClient()
    .from('user_login_streaks')
    .select('user_id, current_streak')
    .in('user_id', userIds)

  const profileMap = new Map((profiles || []).map(p => [p.id, p]))
  const streakMap = new Map((streaks || []).map(s => [s.user_id, s.current_streak || 0]))

  const results: LeaderboardRow[] = userIds.map(uid => {
    const profile = profileMap.get(uid)
    const showInfo = profile?.show_on_leaderboard === true
    return {
      user_id: uid,
      words_played: userScores.get(uid) || 0,
      streak: streakMap.get(uid) || 0,
      full_name: showInfo ? (profile?.full_name || null) : null,
      avatar_url: showInfo ? (profile?.avatar_url || null) : null,
    }
  })

  results.sort((a, b) => b.words_played - a.words_played)
  return results.slice(0, 20)
}

async function fetchUserRank(
  userId: string,
  isWeekly: boolean,
  isGlobal: boolean,
  targetLanguageCode: string | null
): Promise<(LeaderboardRow & { rank: number }) | null> {
  let query = getServiceClient()
    .from('user_word_progress')
    .select('user_id, play_count, last_played_at, target_language_code')

  if (!isGlobal && targetLanguageCode) {
    query = query.eq('target_language_code', targetLanguageCode)
  }

  if (isWeekly) {
    const weekStart = getWeekStart()
    query = query.gte('last_played_at', weekStart)
  }

  const { data: allRows, error } = await query
  if (error || !allRows) return null

  const userScores = new Map<string, number>()
  for (const row of allRows) {
    const current = userScores.get(row.user_id) || 0
    userScores.set(row.user_id, current + row.play_count)
  }

  const sorted = Array.from(userScores.entries()).sort((a, b) => b[1] - a[1])
  const userIndex = sorted.findIndex(([uid]) => uid === userId)

  if (userIndex === -1) return null

  const { data: profile } = await getServiceClient()
    .from('user_profiles')
    .select('id, full_name, avatar_url, show_on_leaderboard')
    .eq('id', userId)
    .single()

  const { data: streak } = await getServiceClient()
    .from('user_login_streaks')
    .select('current_streak')
    .eq('user_id', userId)
    .single()

  const showInfo = profile?.show_on_leaderboard === true

  return {
    rank: userIndex + 1,
    user_id: userId,
    words_played: sorted[userIndex][1],
    streak: streak?.current_streak || 0,
    full_name: showInfo ? (profile?.full_name || null) : null,
    avatar_url: showInfo ? (profile?.avatar_url || null) : null,
  }
}

function getWeekStart(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const weekStart = new Date(now.setDate(diff))
  weekStart.setHours(0, 0, 0, 0)
  return weekStart.toISOString()
}
