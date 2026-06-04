"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import { Icon } from "@iconify/react"
import { hapticsSuccess, hapticsWarning, hapticsLight } from "@/lib/haptics"

interface QuizCard {
  vocabularyId: number
  targetWord: string
  sourceWord: string
  englishWord: string
}

interface TopicQuizModalProps {
  topicId: number
  topicName: string
  userId: string
  targetLanguageCode: string
  sourceLanguageCode: string
  onClose: () => void
}

type SessionState = "loading" | "quiz" | "answered" | "complete"

export function TopicQuizModal({
  topicId,
  topicName,
  userId,
  targetLanguageCode,
  sourceLanguageCode,
  onClose,
}: TopicQuizModalProps) {
  const [mounted, setMounted] = useState(false)
  const [cards, setCards] = useState<QuizCard[]>([])
  const [totalWords, setTotalWords] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [options, setOptions] = useState<string[]>([])
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [sessionState, setSessionState] = useState<SessionState>("loading")
  const [correctCount, setCorrectCount] = useState(0)
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [round, setRound] = useState(1)
  const audioElRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && !audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      } catch (e) {}
    }
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {})
      }
    }
  }, [])

  const playWordAudio = async (card: QuizCard) => {
    if (isPlayingAudio) {
      if (audioElRef.current) { audioElRef.current.pause(); audioElRef.current = null }
      if (activeSourceRef.current) { try { activeSourceRef.current.stop() } catch(e) {} activeSourceRef.current = null }
      setIsPlayingAudio(false)
      return
    }

    hapticsLight()
    setIsPlayingAudio(true)

    let url = `/api/universal-audio?wordId=${card.vocabularyId}&languageCode=${targetLanguageCode}`
    if (card.englishWord) url += `&word=${encodeURIComponent(card.englishWord)}`
    if (card.targetWord) url += `&targetWord=${encodeURIComponent(card.targetWord)}`

    const done = () => { setIsPlayingAudio(false); audioElRef.current = null; activeSourceRef.current = null }

    try {
      const audio = new Audio(url)
      audioElRef.current = audio
      audio.onended = done
      audio.onerror = () => { throw new Error('HTMLAudio failed') }
      await audio.play()
    } catch {
      audioElRef.current = null
      try {
        const ctx = audioContextRef.current
        if (ctx) {
          if (ctx.state === 'suspended') await ctx.resume()
          const resp = await fetch(url)
          if (!resp.ok) throw new Error('fetch failed')
          const buf = await ctx.decodeAudioData(await resp.arrayBuffer())
          const source = ctx.createBufferSource()
          source.buffer = buf
          source.connect(ctx.destination)
          source.onended = done
          activeSourceRef.current = source
          source.start(0)
        } else {
          done()
        }
      } catch {
        done()
      }
    }
  }

  useEffect(() => {
    setMounted(true)
    const scrollY = window.scrollY
    const originalStyles = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      htmlOverflow: document.documentElement.style.overflow,
    }
    document.body.style.overflow = "hidden"
    document.body.style.position = "fixed"
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = "100%"
    document.documentElement.style.overflow = "hidden"
    return () => {
      setMounted(false)
      document.body.style.overflow = originalStyles.overflow
      document.body.style.position = originalStyles.position
      document.body.style.top = originalStyles.top
      document.body.style.width = originalStyles.width
      document.documentElement.style.overflow = originalStyles.htmlOverflow
      window.scrollTo(0, scrollY)
    }
  }, [])

  const fetchCards = useCallback(async () => {
    setSessionState("loading")
    try {
      const res = await fetch(
        `/api/quiz/topic?topicId=${topicId}&targetLanguageCode=${targetLanguageCode}&sourceLanguageCode=${sourceLanguageCode}&limit=20`
      )
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      if (data.totalWords) setTotalWords(data.totalWords)
      if (data.cards && data.cards.length > 0) {
        setCards(data.cards)
        setCurrentIndex(0)
        setCorrectCount(0)
        setSelectedOption(null)
        setIsCorrect(null)
        setOptions([])
        setSessionState("quiz")
      } else {
        setSessionState("complete")
      }
    } catch {
      setSessionState("complete")
    }
  }, [topicId, targetLanguageCode, sourceLanguageCode])

  useEffect(() => { fetchCards() }, [fetchCards])

  const loadDistractors = useCallback(
    async (card: QuizCard) => {
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
        setLoadingOptions(false)
      } catch {
        setOptions([card.sourceWord])
        setLoadingOptions(false)
      }
    },
    [sourceLanguageCode]
  )

  useEffect(() => {
    if (sessionState === "quiz" && cards[currentIndex]) {
      if (audioElRef.current) {
        audioElRef.current.pause()
        audioElRef.current = null
      }
      if (activeSourceRef.current) {
        try { activeSourceRef.current.stop() } catch(e) {}
        activeSourceRef.current = null
      }
      setIsPlayingAudio(false)
      setSelectedOption(null)
      setIsCorrect(null)
      if (options.length === 0) setLoadingOptions(true)
      loadDistractors(cards[currentIndex])
    }
  }, [sessionState, currentIndex, cards, loadDistractors]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnswer = (option: string) => {
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

    setTimeout(() => {
      if (currentIndex + 1 < cards.length) {
        setCurrentIndex((i) => i + 1)
        setSessionState("quiz")
      } else {
        setSessionState("complete")
      }
    }, 1000)
  }

  const handleNextRound = () => {
    hapticsLight()
    setRound((r) => r + 1)
    fetchCards()
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

  const pct = cards.length > 0 ? Math.round((correctCount / cards.length) * 100) : 0

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => { e.stopPropagation(); e.preventDefault() }}
      onTouchEnd={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseMove={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xl" />

      <div className="relative flex flex-col h-full p-4 pt-14 sm:p-6 sm:pt-14 max-w-lg mx-auto w-full">
        {sessionState !== "complete" && cards.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white text-center mb-3">{topicName} Quiz</h2>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-white/50">
                {currentIndex + 1} of {cards.length}
                {totalWords > cards.length && (
                  <span className="text-white/30"> ({totalWords} total)</span>
                )}
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

        {sessionState === "loading" && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-white/50 text-lg">Loading quiz...</div>
          </div>
        )}

        {(sessionState === "quiz" || sessionState === "answered") &&
          cards[currentIndex] && (
            <div className="flex-1 flex flex-col justify-center gap-6">
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
                  aria-label={isPlayingAudio ? "Stop audio" : `Play pronunciation of ${cards[currentIndex].targetWord}`}
                >
                  <Icon
                    icon={isPlayingAudio ? "solar:volume-loud-bold" : "solar:volume-bold"}
                    width="20"
                    height="20"
                    className={isPlayingAudio ? "text-blue-400" : "text-white/70"}
                  />
                </button>
              </div>

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
                      aria-label={`Answer: ${option}`}
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
                icon={pct >= 80 ? "solar:cup-star-bold" : "solar:check-circle-bold"}
                width="44"
                height="44"
                className="text-white"
              />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-2">
                {cards.length === 0
                  ? "No words in this topic yet!"
                  : pct === 100
                  ? "Perfect Score!"
                  : pct >= 80
                  ? "Great Job!"
                  : "Quiz Complete!"}
              </div>
              {cards.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-10 my-4">
                    <div className="flex items-center gap-2.5">
                      <Icon icon="solar:check-circle-bold" width="32" height="32" className="text-emerald-400" />
                      <span className="text-emerald-400 font-bold text-2xl">{correctCount}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Icon icon="solar:close-circle-bold" width="32" height="32" className="text-red-400" />
                      <span className="text-red-400 font-bold text-2xl">{cards.length - correctCount}</span>
                    </div>
                  </div>
                  <div className="text-white/50 text-sm">{pct}% accuracy</div>
                  {totalWords > cards.length && (
                    <div className="text-white/30 text-sm">
                      {cards.length} of {totalWords} words in this topic
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="pt-4 pb-6 space-y-2.5">
          {sessionState === "complete" && cards.length > 0 ? (
            <>
              <button
                onClick={handleNextRound}
                className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl text-white font-semibold text-base hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <Icon icon="solar:refresh-bold" width="18" height="18" />
                Try Another Round
              </button>
              <button
                onClick={() => { hapticsLight(); onClose() }}
                className="w-full py-3.5 bg-white/10 border border-white/15 rounded-2xl text-white/70 font-medium text-base hover:bg-white/15 transition-all"
              >
                Done
              </button>
            </>
          ) : (
            <div className="flex justify-center">
              <button
                onPointerUp={() => { hapticsLight(); onClose() }}
                className="w-14 h-14 rounded-full bg-white/10 border border-white/15 flex items-center justify-center"
                aria-label="Close quiz"
              >
                <Icon icon="solar:close-circle-bold" width="28" height="28" className="text-white/50" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
