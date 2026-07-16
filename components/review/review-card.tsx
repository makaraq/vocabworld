"use client"
import { useState, useEffect } from "react"
import { Icon } from "@iconify/react"
import { hapticsLight } from "@/lib/haptics"
import { ReviewQuizModal } from "./review-quiz-modal"
import { REVIEW_SYNCED_EVENT } from "@/lib/offline/review-queue"
import { useT } from "@/components/providers/translation-provider"

interface ReviewCardProps {
  userId?: string
  targetLanguageCode: string
  nativeLanguageCode: string
}

export function ReviewCard({ userId, targetLanguageCode, nativeLanguageCode }: ReviewCardProps) {
  const { t, tPlural } = useT()
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

  // After offline review grades replay on reconnect, refresh the due count live.
  useEffect(() => {
    const onSynced = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (!detail || detail.targetLanguageCode !== targetLanguageCode) return
      if (typeof detail.totalDue === 'number') setDueCount(detail.totalDue)
      if (typeof detail.totalCards === 'number') setTotalCards(detail.totalCards)
    }
    window.addEventListener(REVIEW_SYNCED_EVENT, onSynced)
    return () => window.removeEventListener(REVIEW_SYNCED_EVENT, onSynced)
  }, [targetLanguageCode])

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
        onClick={() => { if (dueCount > 0) { hapticsLight(); setShowQuiz(true) } }}
        className="bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 xs:p-3.5 sm:p-4 border border-white/20 transition-all hover:bg-white/15 active:scale-[1.03]"
        aria-label={loading ? t('review.card.aria.loading') : totalCards === 0 ? t('review.card.aria.start') : dueCount > 0 ? tPlural('review.card.aria.due', dueCount) : t('review.card.aria.caughtUp')}
      >
        <div className={`w-8 h-8 xs:w-9 xs:h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center mb-1.5 xs:mb-1.5 sm:mb-2 ${
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
            <div className="text-2xl xs:text-3xl sm:text-3xl font-bold text-white/40">...</div>
            <div className="text-xs xs:text-sm sm:text-sm text-white/50">{t('review.card.loading')}</div>
          </>
        ) : totalCards === 0 ? (
          <>
            <div className="text-2xl xs:text-3xl sm:text-3xl font-bold text-white/40">—</div>
            <div className="text-xs xs:text-sm sm:text-sm text-white/50">{t('review.card.startLearning')}</div>
          </>
        ) : dueCount > 0 ? (
          <>
            <div className="text-2xl xs:text-3xl sm:text-3xl font-bold text-white">{dueCount}</div>
            <div className="text-xs xs:text-sm sm:text-sm text-white/90">{t('review.card.wordsToReview')}</div>
          </>
        ) : (
          <>
            <div className="text-2xl xs:text-3xl sm:text-3xl font-bold text-white/70">0</div>
            <div className="text-xs xs:text-sm sm:text-sm text-white/90">{t('review.card.caughtUp')}</div>
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
