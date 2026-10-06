import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { getApiUser } from '@/lib/auth/api-auth'
import { effectiveStreak, localDateInTimeZone } from '@/lib/progress/progress-service'
import { avatarSeedFor } from '@/lib/avatars/smiley-avatar'

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

// PostgREST answers with at most 1000 rows per request, and the board now sums
// thousands of progress rows — so page through them instead of silently
// ranking whatever arbitrary first 1000 came back.
const PAGE = 1000

async function fetchAllPages<T>(
  build: () => any,
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build().range(from, from + PAGE - 1)
    if (error) throw error
    rows.push(...(data as T[]))
    if (!data || data.length < PAGE) return rows
  }
}

// Same cap applies to `.in(...)` lookups, so ask for them in chunks. Keep the
// chunk small: `in` travels in the query string, and a few hundred UUIDs is
// already enough URL to get the request dropped before it reaches PostgREST.
const ID_CHUNK = 100

async function fetchByIds<T>(
  ids: string[],
  build: (chunk: string[]) => any,
): Promise<T[]> {
  const rows: T[] = []
  for (let i = 0; i < ids.length; i += ID_CHUNK) {
    const { data, error } = await build(ids.slice(i, i + ID_CHUNK))
    if (error) throw error
    rows.push(...((data || []) as T[]))
  }
  return rows
}

interface LeaderboardEntry {
  rank: number
  displayId: string
  firstName: string | null
  // Seed for the generated smiley the client draws. Derived from the user id
  // so the face matches the one on that person's own account screen, without
  // the raw id ever leaving the server.
  avatarSeed: string
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
      avatarSeed: avatarSeedFor(row.user_id),
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
        avatarSeed: avatarSeedFor(currentUserEntry.user_id),
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
  const wordRows = await fetchAllPages<{ user_id: string; play_count: number }>(() => {
    let query = getServiceClient()
      .from('user_word_progress')
      .select('user_id, play_count, last_played_at, target_language_code')
      .order('user_id', { ascending: true })

    if (!isGlobal && targetLanguageCode) {
      query = query.eq('target_language_code', targetLanguageCode)
    }

    if (isWeekly) {
      query = query.gte('last_played_at', getWeekStart())
    }

    return query
  })

  const userScores = new Map<string, number>()
  for (const row of wordRows) {
    const current = userScores.get(row.user_id) || 0
    userScores.set(row.user_id, current + row.play_count)
  }

  if (userScores.size === 0) return []

  const userIds = Array.from(userScores.keys())

  const profiles = await fetchByIds<{
    id: string
    full_name: string | null
    avatar_url: string | null
    show_on_leaderboard: boolean | null
    timezone: string | null
  }>(userIds, chunk => getServiceClient()
    .from('user_profiles')
    .select('id, full_name, avatar_url, show_on_leaderboard, timezone')
    .in('id', chunk))

  const streaks = await fetchByIds<{
    user_id: string
    current_streak: number | null
    last_login_date: string | null
  }>(userIds, chunk => getServiceClient()
    .from('user_login_streaks')
    .select('user_id, current_streak, last_login_date')
    .in('user_id', chunk))

  const profileMap = new Map(profiles.map(p => [p.id, p]))
  // These are other people's rows, and current_streak is only recomputed when
  // its owner opens the app — so the raw column is full of streaks that already
  // lapsed. Resolve each one against that user's own today.
  const streakMap = new Map(
    streaks.map(s => [
      s.user_id,
      effectiveStreak(
        s.current_streak || 0,
        s.last_login_date ?? null,
        localDateInTimeZone(profileMap.get(s.user_id)?.timezone)
      ),
    ])
  )

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
  let allRows: { user_id: string; play_count: number }[]
  try {
    allRows = await fetchAllPages<{ user_id: string; play_count: number }>(() => {
      let query = getServiceClient()
        .from('user_word_progress')
        .select('user_id, play_count, last_played_at, target_language_code')
        .order('user_id', { ascending: true })

      if (!isGlobal && targetLanguageCode) {
        query = query.eq('target_language_code', targetLanguageCode)
      }

      if (isWeekly) {
        query = query.gte('last_played_at', getWeekStart())
      }

      return query
    })
  } catch {
    return null
  }

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
    .select('id, full_name, avatar_url, show_on_leaderboard, timezone')
    .eq('id', userId)
    .single()

  const { data: streak } = await getServiceClient()
    .from('user_login_streaks')
    .select('current_streak, last_login_date')
    .eq('user_id', userId)
    .single()

  const showInfo = profile?.show_on_leaderboard === true

  return {
    rank: userIndex + 1,
    user_id: userId,
    words_played: sorted[userIndex][1],
    streak: effectiveStreak(
      streak?.current_streak || 0,
      streak?.last_login_date ?? null,
      localDateInTimeZone(profile?.timezone)
    ),
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
