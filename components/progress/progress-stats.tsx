"use client"
import { useEffect, useState } from "react"
import { Flame, TrendingUp, Trophy, BookOpen } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Icon } from "@iconify/react"
import { DetailedProgressModal } from "./detailed-progress-modal"

interface ProgressStats {
  wordsLearned: number
  wordsLearnedToday: number
  dailyLoginStreak: number
  topicsCompleted: number
  languageCompletionPercentage: number
  totalWordsInLanguage: number
}

// Map language codes to flag icons (same as language-selector)
function getFlagIcon(languageCode: string): string {
  const flagMap: { [key: string]: string } = {
    'ar': 'flag:sa-1x1', 'bg': 'flag:bg-1x1', 'bn': 'flag:bd-1x1',
    'ca': 'flag:es-ct-1x1', 'cs': 'flag:cz-1x1', 'cy': 'flag:gb-wls-1x1',
    'da': 'flag:dk-1x1', 'de': 'flag:de-1x1', 'el': 'flag:gr-1x1',
    'en': 'flag:us-1x1', 'es': 'flag:es-1x1', 'et': 'flag:ee-1x1',
    'eu': 'flag:es-pv-1x1', 'fa': 'flag:ir-1x1', 'fi': 'flag:fi-1x1',
    'fr': 'flag:fr-1x1', 'ga': 'flag:ie-1x1', 'gu': 'flag:in-1x1',
    'he': 'flag:il-1x1', 'hi': 'flag:in-1x1', 'hr': 'flag:hr-1x1',
    'hu': 'flag:hu-1x1', 'id': 'flag:id-1x1', 'is': 'flag:is-1x1',
    'it': 'flag:it-1x1', 'ja': 'flag:jp-1x1', 'ko': 'flag:kr-1x1',
    'lt': 'flag:lt-1x1', 'lv': 'flag:lv-1x1', 'mk': 'flag:mk-1x1',
    'ml': 'flag:in-1x1', 'mr': 'flag:in-1x1', 'mt': 'flag:mt-1x1',
    'nl': 'flag:nl-1x1', 'no': 'flag:no-1x1', 'pl': 'flag:pl-1x1',
    'pt': 'flag:pt-1x1', 'ro': 'flag:ro-1x1', 'ru': 'flag:ru-1x1',
    'sk': 'flag:sk-1x1', 'sl': 'flag:si-1x1', 'sv': 'flag:se-1x1',
    'ta': 'flag:in-1x1', 'te': 'flag:in-1x1', 'th': 'flag:th-1x1',
    'tr': 'flag:tr-1x1', 'uk': 'flag:ua-1x1', 'ur': 'flag:pk-1x1',
    'vi': 'flag:vn-1x1', 'zh': 'flag:cn-1x1'
  }
  return flagMap[languageCode] || 'flag:us-1x1'
}

export function ProgressStats({ targetLanguageCode, targetLanguageName }: { targetLanguageCode: string, targetLanguageName: string }) {
  const { user } = useAuth()
  const [stats, setStats] = useState<ProgressStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDetailedModal, setShowDetailedModal] = useState(false)
  const [lastFetchKey, setLastFetchKey] = useState<string>('')

  useEffect(() => {
    if (!user?.id || !targetLanguageCode) {
      setLoading(false)
      return
    }
    
    // Create cache key to prevent duplicate calls
    const cacheKey = `${user.id}-${targetLanguageCode}`
    
    // Skip if we just fetched for the same user/language combination
    if (cacheKey === lastFetchKey) {
      console.log('⏩ Skipping progress stats fetch - same cache key')
      setLoading(false)
      return
    }
    
    const fetchStats = async () => {
      try {
        console.log(`📊 Fetching progress stats for: ${targetLanguageName} (${targetLanguageCode})`)
        const response = await fetch(`/api/progress/stats?userId=${user.id}&targetLanguageCode=${targetLanguageCode}`)
        if (response.ok) {
          const data = await response.json()
          setStats(data)
          setLastFetchKey(cacheKey)
          console.log('✅ Progress stats loaded successfully')
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
          className="bg-white/10 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-white/20 cursor-pointer hover:bg-white/15 transition-all duration-200"
          onClick={() => setShowDetailedModal(true)}
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
            <div className="text-xl sm:text-2xl font-bold text-white">{stats.wordsLearned}</div>
            <div className="text-[10px] sm:text-xs text-white/90">Words Learned</div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-4 border border-white/20">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mb-1.5 sm:mb-2">
              <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-white">{stats.dailyLoginStreak}</div>
            <div className="text-[10px] sm:text-xs text-white/90">Day Streak</div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-4 border border-white/20">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-1.5 sm:mb-2">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-white">{stats.wordsLearnedToday}</div>
            <div className="text-[10px] sm:text-xs text-white/90">Today</div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-4 border border-white/20">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-1.5 sm:mb-2">
              <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-white">{stats.topicsCompleted}</div>
            <div className="text-[10px] sm:text-xs text-white/90">Topics Done</div>
          </div>
        </div>
      </div>
      
      <DetailedProgressModal
        isOpen={showDetailedModal}
        onCloseAction={() => setShowDetailedModal(false)}
        targetLanguageCode={targetLanguageCode}
        targetLanguageName={targetLanguageName}
      />
    </>
  )
}
