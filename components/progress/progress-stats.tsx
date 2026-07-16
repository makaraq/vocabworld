"use client"
import { useEffect, useState } from "react"
import { Flame, TrendingUp, BookOpen } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Icon } from "@iconify/react"
import { DetailedProgressModal, prefetchDetailedProgress } from "./detailed-progress-modal"
import { readCached, writeCached } from "@/lib/instant-cache"
import { LeaderboardModal } from "@/components/leaderboard/leaderboard-modal"
import { getFlagIcon } from "@/utils/flags"
import { reportProgress } from "@/lib/achievements/engine"
import { useT } from "@/components/providers/translation-provider"

interface ProgressStats {
  wordsLearned: number
  wordsLearnedToday: number
  dailyLoginStreak: number
  topicsCompleted: number
  languageCompletionPercentage: number
  totalWordsInLanguage: number
}

export function ProgressStats({ targetLanguageCode, targetLanguageName, nativeLanguageCode }: { targetLanguageCode: string, targetLanguageName: string, nativeLanguageCode?: string }) {
  const { t } = useT()
  const { user } = useAuth()
  const [stats, setStats] = useState<ProgressStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDetailedModal, setShowDetailedModal] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [bestRank, setBestRank] = useState<number | null>(null)
  const [lastFetchKey, setLastFetchKey] = useState<string>('')
  const [holdingProgressButton, setHoldingProgressButton] = useState(false)

  useEffect(() => {
    if (!user?.id || !targetLanguageCode) {
      setLoading(false)
      return
    }

    // Create cache key to prevent duplicate calls
    const cacheKey = `${user.id}-${targetLanguageCode}`

    // Skip if we just fetched for the same user/language combination
    if (cacheKey === lastFetchKey) {
      setLoading(false)
      return
    }

    // Last known stats paint immediately (no skeleton); the fetch refreshes
    // them silently. Also warm the detailed-progress modal's cache so opening
    // it never shows a loading state.
    const cachedStats = readCached<ProgressStats>(`progress-stats:${cacheKey}`)
    if (cachedStats) {
      setStats(cachedStats)
      setLoading(false)
    }
    prefetchDetailedProgress(user.id, targetLanguageCode)

    const fetchStats = async () => {
      try {
        const response = await fetch(`/api/progress/stats?userId=${user.id}&targetLanguageCode=${targetLanguageCode}`)
        if (response.ok) {
          const data = await response.json()
          setStats(data)
          writeCached(`progress-stats:${cacheKey}`, data)
          setLastFetchKey(cacheKey)
          // 🏆 Evaluate badge unlocks against the freshest stats.
          reportProgress({
            userId: user.id,
            wordsLearned: data.wordsLearned,
            currentStreak: data.dailyLoginStreak,
            wordsToday: data.wordsLearnedToday,
            topicsCompleted: data.topicsCompleted,
            targetLanguageCode,
          })
          fetch(`/api/leaderboard/rank?userId=${user.id}&targetLanguageCode=${targetLanguageCode}`)
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d) setBestRank(d.bestRank) })
            .catch(() => {})
        }
      } catch (error) {
        console.error('Failed to fetch progress stats:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchStats()
  }, [user?.id, targetLanguageCode, lastFetchKey])

  if (!user) return null
  
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 animate-pulse">
          <div className="h-20 bg-white/5 rounded"></div>
        </div>
      </div>
    )
  }
  
  if (!stats) return null

  return (
    <>
      <div className="space-y-3 xs:space-y-3.5 sm:space-y-4">
        <div
          className={`bg-white/10 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 xs:p-3.5 sm:p-5 border border-white/20 cursor-pointer hover:bg-white/15 ${
            holdingProgressButton ? 'scale-105 transition-all duration-75' : 'scale-100 transition-all duration-300'
          }`}
          onClick={() => setShowDetailedModal(true)}
          onTouchStart={() => setHoldingProgressButton(true)}
          onTouchEnd={() => setHoldingProgressButton(false)}
          onTouchCancel={() => setHoldingProgressButton(false)}
          role="button"
          tabIndex={0}
          aria-label={t('progress.aria.card', { language: targetLanguageName, pct: Math.round(stats.languageCompletionPercentage) })}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowDetailedModal(true) } }}
        >
          <div className="flex items-start gap-3 xs:gap-4 sm:gap-4">
            {/* Flag on the left */}
            <Icon icon={getFlagIcon(targetLanguageCode)} className="w-8 h-8 xs:w-9 xs:h-9 sm:w-10 sm:h-10 flex-shrink-0 mt-1" />
            
            {/* Progress content in the middle */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2 mb-2 xs:mb-1.5">
                <h3 className="font-semibold text-white text-sm xs:text-base sm:text-base truncate">{t('progress.title', { language: targetLanguageName })}</h3>
                <p className="text-sm xs:text-base sm:text-base font-bold text-white whitespace-nowrap">{Math.round(stats.languageCompletionPercentage)}%</p>
              </div>
              <div className="h-2 xs:h-3 sm:h-3 bg-white/10 rounded-full overflow-hidden mb-2 xs:mb-1.5">
                <div
                  className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(stats.languageCompletionPercentage, 100)}%` }}
                />
              </div>
              <p className="text-xs xs:text-sm text-white/50 text-left">{t('progress.clickDetails')}</p>
            </div>
          </div>
        </div>
      
        <div className="grid grid-cols-2 gap-2 xs:gap-3 sm:gap-3">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 xs:p-3.5 sm:p-4 border border-white/20">
            <div className="w-8 h-8 xs:w-9 xs:h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-1.5 xs:mb-1.5 sm:mb-2">
              <BookOpen className="w-4 h-4 xs:w-5 xs:h-5 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="text-2xl xs:text-3xl sm:text-3xl font-bold text-white">{stats.wordsLearned}</div>
            <div className="text-xs xs:text-sm sm:text-sm text-white/90">{t('progress.wordsLearned')}</div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 xs:p-3.5 sm:p-4 border border-white/20">
            <div className="w-8 h-8 xs:w-9 xs:h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mb-1.5 xs:mb-1.5 sm:mb-2">
              <Flame className="w-4 h-4 xs:w-5 xs:h-5 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="text-2xl xs:text-3xl sm:text-3xl font-bold text-white">{stats.dailyLoginStreak}</div>
            <div className="text-xs xs:text-sm sm:text-sm text-white/90">{t('progress.dayStreak')}</div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 xs:p-3.5 sm:p-4 border border-white/20">
            <div className="w-8 h-8 xs:w-9 xs:h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-1.5 xs:mb-1.5 sm:mb-2">
              <TrendingUp className="w-4 h-4 xs:w-5 xs:h-5 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="text-2xl xs:text-3xl sm:text-3xl font-bold text-white">{stats.wordsLearnedToday}</div>
            <div className="text-xs xs:text-sm sm:text-sm text-white/90">{t('progress.today')}</div>
          </div>
          
          <button
            onClick={() => setShowLeaderboard(true)}
            className="bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 xs:p-3.5 sm:p-4 border border-white/20 hover:bg-white/15 transition-all active:scale-95"
            aria-label={bestRank ? t('progress.aria.rank', { rank: bestRank }) : t('progress.aria.viewLeaderboard')}
          >
            <div className="w-8 h-8 xs:w-9 xs:h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center mb-1.5 xs:mb-1.5 sm:mb-2">
              <Icon icon="solar:cup-star-bold" className="w-4 h-4 xs:w-5 xs:h-5 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="text-2xl xs:text-3xl sm:text-3xl font-bold text-white">
              {bestRank ? `#${bestRank}` : '—'}
            </div>
            <div className="text-xs xs:text-sm sm:text-sm text-white/90">{t('progress.leaderboard')}</div>
          </button>
        </div>
      </div>
      
      <DetailedProgressModal
        isOpen={showDetailedModal}
        onCloseAction={() => setShowDetailedModal(false)}
        targetLanguageCode={targetLanguageCode}
        targetLanguageName={targetLanguageName}
        nativeLanguageCode={nativeLanguageCode}
      />
      <LeaderboardModal
        open={showLeaderboard}
        onCloseAction={() => setShowLeaderboard(false)}
        targetLanguageCode={targetLanguageCode}
        targetLanguageName={targetLanguageName}
      />
    </>
  )
}
