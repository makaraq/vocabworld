"use client"
import { useState, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
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
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const audioRef = useCallback(() => {
    // Keep a stable ref across renders
    return { current: null as HTMLAudioElement | null }
  }, [])()

  const playWordAudio = async (card: QuizCard) => {
    if (isPlayingAudio) {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      setIsPlayingAudio(false)
      return
    }

    hapticsLight()
    setIsPlayingAudio(true)
    try {
      const url = `/api/universal-audio-fast?wordId=${card.vocabularyId}&languageCode=${targetLanguageCode}`
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => { setIsPlayingAudio(false); audioRef.current = null }
      audio.onerror = () => { setIsPlayingAudio(false); audioRef.current = null }
      await audio.play()
    } catch {
      setIsPlayingAudio(false)
      audioRef.current = null
    }
  }

  // Mount + lock background scroll
  useEffect(() => {
    setMounted(true)
    const original = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      setMounted(false)
      document.body.style.overflow = original
    }
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
      // Stop any playing audio when moving to next card
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
        setIsPlayingAudio(false)
      }
      loadDistractors(cards[currentIndex])
      setSelectedOption(null)
      setIsCorrect(null)
    }
  }, [sessionState, currentIndex, cards, loadDistractors, audioRef])

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
    <div
      className="fixed inset-0 z-50 flex flex-col touch-none"
      onTouchMove={(e) => e.preventDefault()}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xl" />

      <div className="relative flex flex-col h-full p-4 sm:p-6 max-w-lg mx-auto w-full">
        {/* Header — title + counter + progress bar */}
        {sessionState !== "complete" && cards.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-white">Quick Recall</h2>
              <div className="text-sm text-white/50">
                {currentIndex + 1} of {cards.length}
              </div>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-300"
                style={{
                  width: `${((currentIndex + (sessionState === "answered" ? 1 : 0)) / cards.length) * 100}%`,
                }}
              />
            </div>
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
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-8 text-center relative">
                <div className="text-sm text-white/50 mb-2">
                  What does this mean?
                </div>
                <div className="text-3xl sm:text-4xl font-bold text-white mb-3">
                  {cards[currentIndex].targetWord}
                </div>
                <button
                  onClick={() => playWordAudio(cards[currentIndex])}
                  className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all active:scale-95 mx-auto ${
                    isPlayingAudio
                      ? "bg-blue-500/30 border-blue-400/50"
                      : "bg-white/10 border-white/20 hover:bg-white/20"
                  }`}
                >
                  <Icon
                    icon={isPlayingAudio ? "solar:volume-loud-bold" : "solar:volume-bold"}
                    width="20"
                    height="20"
                    className={isPlayingAudio ? "text-blue-400" : "text-white/70"}
                  />
                </button>
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
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
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
          </div>
        )}

        {/* Close button — always at bottom */}
        <div className="pt-4 pb-2 flex justify-center">
          {sessionState === "complete" && cards.length > 0 ? (
            <button
              onClick={() => { hapticsLight(); onClose() }}
              className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl text-white font-semibold text-base hover:opacity-90 transition-opacity"
            >
              Done
            </button>
          ) : (
            <button
              onClick={() => { hapticsLight(); onClose() }}
              className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all active:scale-95"
            >
              <Icon icon="solar:close-circle-bold" width="24" height="24" className="text-white/70" />
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
