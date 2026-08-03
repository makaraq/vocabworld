/**
 * GET /api/notifications/context
 *
 * Returns the data needed for on-device notification scheduling.
 * Auth: session cookie (web) OR Authorization Bearer header (native).
 *
 * Response:
 * {
 *   currentStreak: number         // resolved against today, 0 once it has lapsed
 *   streakDaysRemaining: number   // day offsets it stays savable (0 = tonight only)
 *   lastTopicName: string | null
 *   lastStudiedAt: string | null   // ISO timestamp
 *   userLanguage: string           // display name, e.g. "Portuguese"
 *   timezone: string               // IANA timezone stored in user_profiles
 *   dueReviewCount: number
 * }
 */

import { NextResponse } from 'next/server'
import { getApiUser, getAdminClient } from '@/lib/auth/api-auth'
import { languageNamesTranslations } from '@/lib/i18n/language-names-translations'
import { effectiveStreak, streakDaysRemaining } from '@/lib/progress/progress-service'

// Topic ID → display name map (matches app/api/topics/route.ts)
const TOPIC_NAMES: Record<number, string> = {
  1: 'Greetings', 2: 'Numbers', 3: 'Time', 4: 'Directions', 5: 'Shopping',
  6: 'Food', 7: 'Emergency', 8: 'Health & Body Parts', 9: 'Home',
  10: 'Personal Style', 11: 'Weather & Nature', 12: 'Family & Relationships',
  13: 'Emotions', 14: 'Personality', 15: 'Hobbies', 16: 'Fitness',
  17: 'Places Around Town', 18: 'Travel', 19: 'Colors & Shapes', 20: 'Nature',
  21: 'Actions', 22: 'Adjectives', 23: 'Art', 24: 'Technology',
  25: 'Professions', 26: 'Education', 27: 'Media', 28: 'Environment',
  29: 'Business', 30: 'Common Collocations', 31: 'Modern Expressions',
  32: 'Science', 33: 'Mathematics', 34: 'History', 35: 'Politics & Law',
  36: 'Religion', 37: 'Mythology', 38: 'Holidays', 39: 'Formal Language',
  40: 'Cultural Integration', 41: 'Verbs', 42: 'Daily Language',
  43: 'Essential Words', 45: 'Example Sentences',
}

/** Today's date (YYYY-MM-DD) in `timezone`, falling back to UTC for a bad value. */
function localToday(timezone: string): string {
  try {
    return new Date().toLocaleDateString('en-CA', { timeZone: timezone })
  } catch {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'UTC' })
  }
}

export async function GET(request: Request) {
  try {
    const user = await getApiUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Service-role client — auth is already verified, queries filter by user id
    const supabase = getAdminClient()

    // Run all three queries in parallel
    const [streakResult, langResult, profileResult] = await Promise.all([
      supabase
        .from('user_login_streaks')
        .select('current_streak, last_login_date')
        .eq('user_id', user.id)
        .single(),

      supabase
        .from('user_language_progress')
        .select('target_language_code, last_activity_at')
        .eq('user_id', user.id)
        .order('last_activity_at', { ascending: false })
        .limit(1)
        .single(),

      supabase
        .from('user_profiles')
        .select('timezone')
        .eq('id', user.id)
        .single(),
    ])

    // Resolve last topic name from most recent daily progress entry
    let lastTopicName: string | null = null
    const langCode = langResult.data?.target_language_code ?? null

    // Resolve language code → display name (English fallback)
    const userLanguage = langCode
      ? (languageNamesTranslations['en']?.[langCode] ?? langCode)
      : 'your language'

    // Fetch due review count + last topic in parallel
    const [dailyResult, dueResult] = await Promise.all([
      langCode
        ? supabase
            .from('user_daily_progress')
            .select('topics_practiced')
            .eq('user_id', user.id)
            .eq('target_language_code', langCode)
            .not('topics_practiced', 'eq', '{}')
            .order('activity_date', { ascending: false })
            .limit(1)
        : Promise.resolve({ data: null }),

      langCode
        ? supabase
            .from('user_sr_cards')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('target_language_code', langCode)
            .lte('due', new Date().toISOString())
        : Promise.resolve({ count: 0 }),
    ])

    const topicsArr: string[] = dailyResult.data?.[0]?.topics_practiced ?? []
    if (topicsArr.length > 0) {
      const lastTopicId = parseInt(topicsArr[topicsArr.length - 1], 10)
      lastTopicName = TOPIC_NAMES[lastTopicId] ?? null
    }

    const timezone = profileResult.data?.timezone ?? 'UTC'

    // current_streak is only recomputed when the user opens the app, so a
    // lapsed user's row still holds whatever they had on their last login.
    // Scheduling 30 days of reminders off that raw number makes them quote a
    // streak the next login will reset — resolve it against today first.
    const storedStreak = streakResult.data?.current_streak ?? 0
    const lastLoginDate = streakResult.data?.last_login_date ?? null
    const today = localToday(timezone)
    const currentStreak = effectiveStreak(storedStreak, lastLoginDate, today)

    return NextResponse.json({
      currentStreak,
      streakDaysRemaining: streakDaysRemaining(storedStreak, lastLoginDate, today),
      lastTopicName,
      lastStudiedAt: langResult.data?.last_activity_at ?? null,
      userLanguage,
      timezone,
      dueReviewCount: dueResult.count ?? 0,
    })
  } catch (error) {
    console.error('Notifications context error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
