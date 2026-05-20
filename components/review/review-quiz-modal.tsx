"use client"
import { useState, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { Icon } from "@iconify/react"
import { hapticsSuccess, hapticsWarning, hapticsLight } from "@/lib/haptics"
import { Rating } from "@/lib/sr/fsrs"

interface QuizCard {
  cardId: number
  vocabularyId: number
  targetWord: string
  sourceWord: string
  englishWord: string
  topicId?: number
  state: number
}

interface ReviewQuizModalProps {
  userId: string
  targetLanguageCode: string
  sourceLanguageCode: string
  onClose: () => void
}

type SessionState = "loading" | "quiz" | "answered" | "complete"

export function ReviewQuizModal({
  userId,
  targetLanguageCode,
  sourceLanguageCode,
  onClose,
}: ReviewQuizModalProps) {
  const [mounted, setMounted] = useState(false)
  const [cards, setCards] = useState<QuizCard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [options, setOptions] = useState<string[]>([])
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [sessionState, setSessionState] = useState<SessionState>("loading")
  const [correctCount, setCorrectCount] = useState(0)
  const [loadingOptions, setLoadingOptions] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const res = await fetch(
          `/api/sr/due?userId=${userId}&targetLanguageCode=${targetLanguageCode}&sourceLanguageCode=${sourceLanguageCode}&limit=20`
        )
        if (!res.ok) throw new Error("Failed to fetch")
        const data = await res.json()
        if (data.cards && data.cards.length > 0) {
          setCards(data.cards)
          setSessionState("quiz")
        } else {
          setSessionState("complete")
        }
      } catch {
        setSessionState("complete")
      }
    }
    fetchCards()
  }, [userId, targetLanguageCode, sourceLanguageCode])

  const loadDistractors = useCallback(
    async (card: QuizCard) => {
      setLoadingOptions(true)
      try {
        const res = await fetch(
          `/api/sr/distractors?vocabularyId=${card.vocabularyId}&targetLanguageCode=${sourceLanguageCode}&count=3`
        )
        if (!res.ok) throw new Error("Failed to fetch distractors")
        const data = await res.json()
        const distractors: string[] = data.distractors || []
        const allOptions = [...distractors, card.sourceWord].sort(
          () => Math.random() - 0.5
        )
        setOptions(allOptions)
      } catch {
        setOptions([card.sourceWord])
      } finally {
        setLoadingOptions(false)
      }
    },
    [sourceLanguageCode]
  )

  useEffect(() => {
    if (sessionState === "quiz" && cards[currentIndex]) {
      loadDistractors(cards[currentIndex])
      setSelectedOption(null)
      setIsCorrect(null)
    }
  }, [sessionState, currentIndex, cards, loadDistractors])

  const handleAnswer = async (option: string) => {
    if (sessionState !== "quiz" || selectedOption !== null) return

    const card = cards[currentIndex]
    const correct = option.toLowerCase() === card.sourceWord.toLowerCase()
    setSelectedOption(option)
    setIsCorrect(correct)
    setSessionState("answered")

    if (correct) {
      hapticsSuccess()
      setCorrectCount((c) => c + 1)
    } else {
      hapticsWarning()
    }

    const rating = correct ? Rating.Good : Rating.Again

    fetch("/api/sr/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cardId: card.cardId,
        rating,
        userId,
        targetLanguageCode,
      }),
    }).catch(() => {})

    setTimeout(() => {
      if (currentIndex + 1 < cards.length) {
        setCurrentIndex((i) => i + 1)
        setSessionState("quiz")
      } else {
        setSessionState("complete")
      }
    }, 1000)
  }

  const getOptionStyle = (option: string) => {
    if (selectedOption === null) {
      return "bg-white/10 border-white/20 text-white hover:bg-white/20 active:scale-[0.97]"
    }
    if (option.toLowerCase() === cards[currentIndex]?.sourceWord.toLowerCase()) {
      return "bg-emerald-500/30 border-emerald-400/50 text-white"
    }
    if (option === selectedOption && !isCorrect) {
      return "bg-red-500/30 border-red-400/50 text-white"
    }
    return "bg-white/5 border-white/10 text-white/40"
  }

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xl" />

      <div className="relative flex flex-col h-full p-4 sm:p-6 max-w-lg mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => { hapticsLight(); onClose() }}
            className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          {sessionState !== "complete" && cards.length > 0 && (
            <div className="text-sm text-white/70">
              {currentIndex + 1} / {cards.length}
            </div>
          )}
        </div>

        {/* Progress bar */}
        {sessionState !== "complete" && cards.length > 0 && (
          <div className="h-1.5 bg-white/10 rounded-full mb-8 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-300"
              style={{
                width: `${((currentIndex + (sessionState === "answered" ? 1 : 0)) / cards.length) * 100}%`,
              }}
            />
          </div>
        )}

        {/* Content */}
        {sessionState === "loading" && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-white/50 text-lg">Loading review...</div>
          </div>
        )}

        {(sessionState === "quiz" || sessionState === "answered") &&
          cards[currentIndex] && (
            <div className="flex-1 flex flex-col justify-center gap-6">
              {/* Question card */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-8 text-center">
                <div className="text-sm text-white/50 mb-2">
                  What does this mean?
                </div>
                <div className="text-3xl sm:text-4xl font-bold text-white">
                  {cards[currentIndex].targetWord}
                </div>
              </div>

              {/* Answer options */}
              <div className="grid grid-cols-1 gap-3">
                {loadingOptions ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-14 bg-white/5 border border-white/10 rounded-xl animate-pulse"
                    />
                  ))
                ) : (
                  options.map((option, i) => (
                    <button
                      key={`${currentIndex}-${i}`}
                      onClick={() => handleAnswer(option)}
                      disabled={selectedOption !== null}
                      className={`py-3.5 px-5 rounded-xl border text-base font-medium transition-all ${getOptionStyle(option)}`}
                    >
                      {option}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

        {sessionState === "complete" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Icon
                icon="solar:check-circle-bold"
                width="44"
                height="44"
                className="text-white"
              />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-2">
                {cards.length === 0 ? "No words to review!" : "Session Complete!"}
              </div>
              {cards.length > 0 && (
                <div className="text-white/70 space-y-1">
                  <div>
                    {correctCount} / {cards.length} correct (
                    {Math.round((correctCount / cards.length) * 100)}%)
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => { hapticsLight(); onClose() }}
              className="mt-4 px-8 py-3 bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl text-white font-semibold text-base hover:opacity-90 transition-opacity"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
