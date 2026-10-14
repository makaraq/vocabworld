import React from 'react'
import { BookOpen, Flame, TrendingUp } from 'lucide-react'
import { AppIcon } from './icons'
import { flagIcon } from './app-data'
import { Touch } from './motion'

// The ACCOUNT page of the topic menu: ProgressStats, ReviewCard, BadgesCard
// and Manage Account (components/progress/progress-stats.tsx,
// components/review/review-card.tsx, components/achievements/badges-card.tsx,
// language-selector.tsx), with classes resolved for the 440pt width.
//
// The numbers are props: the film passes sample values, and anything that
// renders this can pass a user's real stats in the same shape as
// /api/progress/stats.

export interface AccountData {
  targetLanguageCode: string
  /** languageCompletionPercentage */
  percentage: number
  wordsLearned: number
  /** dailyLoginStreak */
  streak: number
  wordsToday: number
  /** Best leaderboard rank, or null for "—". */
  rank: number | null
  /** Words due for review (ReviewCard). */
  dueCount: number
  badgesUnlocked: number
  badgesTotal: number
  /** The three most recent badges: Solar icon and tier gradient classes. */
  recentBadges: { icon: string; gradient: string }[]
}

const StatTile: React.FC<{
  gradient: string
  icon: React.ReactNode
  value: React.ReactNode
  label: string
  as?: 'div' | 'button'
  touch?: number
}> = ({ gradient, icon, value, label, as: Tag = 'div', touch }) => (
  <Tag className="bg-white/10 backdrop-blur-sm rounded-lg p-3.5 border border-white/20" style={{ position: 'relative' }}>
    <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center mb-1.5`}>
      {icon}
    </div>
    <div className="text-3xl font-bold text-white">{value}</div>
    <div className="text-sm text-white/90">{label}</div>
    {touch !== undefined && <Touch t={touch} />}
  </Tag>
)

export const AccountSection: React.FC<{
  data: AccountData
  targetLanguage: string
  /** A finger on the Leaderboard tile, 0 → 1. */
  leaderboardTouch?: number
}> = ({ data, targetLanguage, leaderboardTouch }) => (
  <div className="h-full flex flex-col space-y-3">
    {/* ProgressStats */}
    <div className="space-y-3.5">
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3.5 border border-white/20 scale-100" role="button">
        <div className="flex items-start gap-4">
          <AppIcon icon={flagIcon(data.targetLanguageCode)} className="w-9 h-9 flex-shrink-0 mt-1" />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2 mb-1.5">
              <h3 className="font-semibold text-white text-base truncate">{targetLanguage} Progress</h3>
              <p className="text-base font-bold text-white whitespace-nowrap">{Math.round(data.percentage)}%</p>
            </div>
            <div className="h-3 bg-white/10 rounded-full overflow-hidden mb-1.5">
              <div
                className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
                style={{ width: `${Math.min(data.percentage, 100)}%` }}
              />
            </div>
            <p className="text-sm text-white/50 text-left">Click to see details</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatTile
          gradient="from-blue-500 to-cyan-500"
          icon={<BookOpen className="w-5 h-5 text-white" />}
          value={data.wordsLearned}
          label="Words Learned"
        />
        <StatTile
          gradient="from-orange-500 to-red-500"
          icon={<Flame className="w-5 h-5 text-white" />}
          value={data.streak}
          label="Day Streak"
        />
        <StatTile
          gradient="from-green-500 to-emerald-500"
          icon={<TrendingUp className="w-5 h-5 text-white" />}
          value={data.wordsToday}
          label="Today"
        />
        <StatTile
          as="button"
          gradient="from-purple-500 to-indigo-500"
          icon={<AppIcon icon="solar:cup-star-bold" className="w-5 h-5 text-white" />}
          value={data.rank ? `#${data.rank}` : '—'}
          label="Leaderboard"
          touch={leaderboardTouch}
        />
      </div>
    </div>

    {/* Daily Reminder & Goal Cards */}
    <div className="grid grid-cols-2 gap-3">
      {/* ReviewCard, with words due */}
      <button className="bg-white/10 backdrop-blur-sm rounded-lg p-3.5 border border-white/20">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-1.5 bg-gradient-to-br from-blue-500 to-cyan-500">
          <AppIcon icon="solar:book-2-bold" width="18" height="18" className="text-white" />
        </div>
        <div className="text-3xl font-bold text-white">{data.dueCount}</div>
        <div className="text-sm text-white/90">Words to Review</div>
      </button>

      {/* BadgesCard */}
      <button className="bg-white/10 backdrop-blur-sm rounded-lg p-3.5 border border-white/20 w-full scale-100">
        <div className="flex items-start justify-between mb-1.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
            <AppIcon icon="solar:medal-star-bold" width="18" height="18" className="text-white" />
          </div>
          {data.recentBadges.length > 0 && (
            <div className="flex -space-x-1.5">
              {data.recentBadges.map((badge, i) => (
                <div
                  key={i}
                  className={`w-6 h-6 rounded-full bg-gradient-to-br ${badge.gradient} ring-2 ring-black/20 flex items-center justify-center`}
                >
                  <AppIcon icon={badge.icon} width="11" height="11" className="text-white" />
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="text-3xl font-bold text-white">
          {data.badgesUnlocked}
          <span className="text-white/50 text-base font-medium"> / {data.badgesTotal}</span>
        </div>
        <div className="text-sm text-white/90">Badges</div>
      </button>
    </div>

    {/* Manage Account Button */}
    <button className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white py-3.5 px-4 rounded-2xl font-semibold text-sm flex items-center justify-center space-x-2">
      <AppIcon icon="solar:user-circle-bold" width="18" height="18" className="text-white/70" />
      <span>Manage Account</span>
      <AppIcon icon="solar:alt-arrow-right-bold" width="16" height="16" className="text-white/40 ml-auto" />
    </button>
  </div>
)
