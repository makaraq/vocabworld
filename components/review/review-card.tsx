"use client"
import { useState, useEffect } from "react"
import { Icon } from "@iconify/react"
import { ReviewQuizModal } from "./review-quiz-modal"

interface ReviewCardProps {
  userId?: string
  targetLanguageCode: string
  nativeLanguageCode: string
}

export function ReviewCard({ userId, targetLanguageCode, nativeLanguageCode }: ReviewCardProps) {
  const [dueCount, setDueCount] = useState(0)
  const [totalCards, setTotalCards] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showQuiz, setShowQuiz] = useState(false)

  useEffect(() => {
    if (!userId || !targetLanguageCode) {
      setLoading(false)
      return
    }

    const fetchDueCount = async () => {
      try {
        const res = await fetch(
          `/api/sr/due?userId=${userId}&targetLanguageCode=${targetLanguageCode}&countOnly=true`
        )
        if (res.ok) {
          const data = await res.json()
          setDueCount(data.totalDue || 0)
          setTotalCards(data.totalCards || 0)
        }
      } catch {
        // silently fail, show 0
      } finally {
        setLoading(false)
      }
    }

    fetchDueCount()
  }, [userId, targetLanguageCode])

  useEffect(() => {
    const handler = (e: Event) => {
      const { action } = (e as CustomEvent).detail ?? {}
      if (action === 'open_review') setShowQuiz(true)
    }
    window.addEventListener('notification-action', handler)
    return () => window.removeEventListener('notification-action', handler)
  }, [])

  const handleQuizClose = () => {
    setShowQuiz(false)
    if (userId && targetLanguageCode) {
      fetch(
        `/api/sr/due?userId=${userId}&targetLanguageCode=${targetLanguageCode}&countOnly=true`
      )
        .then(res => res.json())
        .then(data => { setDueCount(data.totalDue || 0); setTotalCards(data.totalCards || 0) })
        .catch(() => {})
    }
  }

  return (
    <>
      <button
        onClick={() => dueCount > 0 && setShowQuiz(true)}
        className="bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-4 border border-white/20 text-left transition-all hover:bg-white/15 active:scale-[1.03]"
      >
        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center mb-1.5 sm:mb-2 ${
          totalCards === 0
            ? "bg-gradient-to-br from-white/20 to-white/10"
            : "bg-gradient-to-br from-blue-500 to-cyan-500"
        }`}>
          {totalCards === 0 ? (
            <Icon icon="solar:book-2-linear" width="18" height="18" className="text-white/50" />
          ) : dueCount > 0 ? (
            <Icon icon="solar:book-2-bold" width="18" height="18" className="text-white" />
          ) : (
            <Icon icon="solar:check-circle-bold" width="18" height="18" className="text-white" />
          )}
        </div>
        {loading ? (
          <>
            <div className="text-xl sm:text-2xl font-bold text-white/40">...</div>
            <div className="text-[10px] sm:text-xs text-white/50">Loading</div>
          </>
        ) : totalCards === 0 ? (
          <>
            <div className="text-xl sm:text-2xl font-bold text-white/40">—</div>
            <div className="text-[10px] sm:text-xs text-white/50">Start learning</div>
          </>
        ) : dueCount > 0 ? (
          <>
            <div className="text-xl sm:text-2xl font-bold text-white">{dueCount}</div>
            <div className="text-[10px] sm:text-xs text-white/90">Words to Review</div>
          </>
        ) : (
          <>
            <div className="text-xl sm:text-2xl font-bold text-white/70">0</div>
            <div className="text-[10px] sm:text-xs text-white/90">All caught up!</div>
          </>
        )}
      </button>

      {showQuiz && userId && (
        <ReviewQuizModal
          userId={userId}
          targetLanguageCode={targetLanguageCode}
          sourceLanguageCode={nativeLanguageCode}
          onClose={handleQuizClose}
        />
      )}
    </>
  )
}
