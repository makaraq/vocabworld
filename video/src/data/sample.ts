import type { AccountData } from '../app-ui/AccountSection'
import type { WeekActivity } from '../components/ProgressDashboard'

// Sample values for the film only. The components take the same shapes the
// app uses (/api/progress/stats, the badges store), so real data can replace
// these without touching the screens.

export const ACCOUNT_SAMPLE: AccountData = {
  targetLanguageCode: 'fr',
  percentage: 9,
  wordsLearned: 248,
  streak: 12,
  wordsToday: 18,
  rank: 8,
  dueCount: 14,
  badgesUnlocked: 9,
  // ACHIEVEMENTS in lib/achievements/definitions.ts has 50 badges.
  badgesTotal: 50,
  // words_100 (gold), streak_7 (silver), topics_5 (silver), with the tier
  // gradients from tierGradient().
  recentBadges: [
    { icon: 'solar:book-2-bold', gradient: 'from-yellow-500 to-amber-300' },
    { icon: 'solar:fire-square-bold', gradient: 'from-slate-400 to-slate-200' },
    { icon: 'solar:medal-ribbon-star-bold', gradient: 'from-slate-400 to-slate-200' },
  ],
}

export const WEEK_SAMPLE: WeekActivity = {
  words: [14, 22, 9, 18, 25, 12, 18],
  streakDays: 12,
  minutesListened: 46,
}
