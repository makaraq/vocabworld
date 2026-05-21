"use client"
import { useEffect, useState } from "react"
import { Flame, TrendingUp, BookOpen } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Icon } from "@iconify/react"
import { DetailedProgressModal } from "./detailed-progress-modal"
import { LeaderboardModal } from "@/components/leaderboard/leaderboard-modal"
import { getFlagIcon } from "@/utils/flags"
import { reportProgress } from "@/lib/achievements/engine"

interface ProgressStats {
  wordsLearned: number
  wordsLearnedToday: number
  dailyLoginStreak: number
  topicsCompleted: number
  languageCompletionPercentage: number
  totalWordsInLanguage: number
}

export function ProgressStats({ targetLanguageCode, targetLanguageName, nativeLanguageCode }: { targetLanguageCode: string, targetLanguageName: string, nativeLanguageCode?: string }) {
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
    
    const fetchStats = async () => {
      try {
        const response = await fetch(`/api/progress/stats?userId=${user.id}&targetLanguageCode=${targetLanguageCode}`)
        if (response.ok) {
          const data = await response.json()
          setStats(data)
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
      <div className="space-y-3 sm:space-y-4">
        <div 
          className={`bg-white/10 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-white/20 cursor-pointer hover:bg-white/15 ${
            holdingProgressButton ? 'scale-105 transition-all duration-75' : 'scale-100 transition-all duration-300'
          }`}
          onClick={() => setShowDetailedModal(true)}
          onTouchStart={() => setHoldingProgressButton(true)}
          onTouchEnd={() => setHoldingProgressButton(false)}
          onTouchCancel={() => setHoldingProgressButton(false)}
        >
          <div className="flex items-start gap-3 sm:gap-4">
            {/* Flag on the left */}
            <Icon icon={getFlagIcon(targetLanguageCode)} className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 mt-1" />
            
            {/* Progress content in the middle */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2 mb-2">
                <h3 className="font-semibold text-white text-sm sm:text-base truncate">{targetLanguageName} Progress</h3>
                <p className="text-sm sm:text-base font-bold text-white whitespace-nowrap">{Math.round(stats.languageCompletionPercentage)}%</p>
              </div>
              <div className="h-2 sm:h-3 bg-white/10 rounded-full overflow-hidden mb-2">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-pink-500 transition-all duration-500" 
                  style={{ width: `${Math.min(stats.languageCompletionPercentage, 100)}%` }} 
                />
              </div>
              <p className="text-xs text-white/50 text-left">Click to see details</p>
            </div>
          </div>
        </div>
      
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-4 border border-white/20">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-1.5 sm:mb-2">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white">{stats.wordsLearned}</div>
            <div className="text-xs sm:text-sm text-white/90">Words Learned</div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-4 border border-white/20">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mb-1.5 sm:mb-2">
              <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white">{stats.dailyLoginStreak}</div>
            <div className="text-xs sm:text-sm text-white/90">Day Streak</div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-4 border border-white/20">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-1.5 sm:mb-2">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white">{stats.wordsLearnedToday}</div>
            <div className="text-xs sm:text-sm text-white/90">Today</div>
          </div>
          
          <button
            onClick={() => setShowLeaderboard(true)}
            className="bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-4 border border-white/20 hover:bg-white/15 transition-all active:scale-95"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center mb-1.5 sm:mb-2">
              <Icon icon="solar:cup-star-bold" className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white">
              {bestRank ? `#${bestRank}` : '—'}
            </div>
            <div className="text-xs sm:text-sm text-white/90">Leaderboard</div>
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
