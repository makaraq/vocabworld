"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { hapticsSuccess, hapticsWarning, hapticsLight } from "@/lib/haptics"
import { preloadSoundEffects, playCorrectSound, playWrongSound } from "@/lib/sound-effects"
import { Rating } from "@/lib/sr/fsrs"
import { useT } from "@/components/providers/translation-provider"
import { usePictureCoins } from "@/lib/picture-coins"
import { QuizSheet } from "@/components/quiz/quiz-sheet"
import { CoinPurse } from "@/components/quiz/pixel-coin"
import {
  QuizProgress, QuizCardFrame, QuizQuestionCard, QuizAnswers, QuizResult, QuizResultActions, QUIZ_BUTTON, usePurseMotion,
} from "@/components/quiz/quiz-parts"

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
  // The tile it was opened from: when it is on screen the view opens out of
  // it and closes back into it (lib/morph-modal.ts) instead of sliding up.
  // Dragged down, it slides away, the tile forming again behind it.
  morphFrom?: () => HTMLElement | null
}

type SessionState = "loading" | "quiz" | "answered" | "complete"

export function ReviewQuizModal({
  userId,
  targetLanguageCode,
  sourceLanguageCode,
  onClose,
  morphFrom,
}: ReviewQuizModalProps) {
  const { t } = useT()
  const coins = usePictureCoins()
  const purse = usePurseMotion()
  const [cards, setCards] = useState<QuizCard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [options, setOptions] = useState<string[]>([])
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [sessionState, setSessionState] = useState<SessionState>("loading")
  const [correctCount, setCorrectCount] = useState(0)
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const audioElRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null)

  useEffect(() => {
    preloadSoundEffects()
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
    if (card.englishWord) {
      url += `&word=${encodeURIComponent(card.englishWord)}`
    }
    if (card.targetWord) {
      url += `&targetWord=${encodeURIComponent(card.targetWord)}`
    }

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
    const fetchCards = async () => {
      try {
        const res = await fetch(
          `/api/sr/due?userId=${userId}&targetLanguageCode=${targetLanguageCode}&sourceLanguageCode=${sourceLanguageCode}&limit=20`
        )
        if (!res.ok) throw new Error("Failed to fetch")
        const data = await res.json()
        if (data.cards && data.cards.length > 0) {
          // Shuffle cards so the quiz order feels random
          const shuffled = [...data.cards].sort(() => Math.random() - 0.5)
          setCards(shuffled)
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
      // Only show skeletons on the very first card load
      if (options.length === 0) setLoadingOptions(true)
      loadDistractors(cards[currentIndex])
    }
  }, [sessionState, currentIndex, cards, loadDistractors]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnswer = async (option: string) => {
    if (sessionState !== "quiz" || selectedOption !== null) return

    const card = cards[currentIndex]
    const correct = option.toLowerCase() === card.sourceWord.toLowerCase()
    setSelectedOption(option)
    setIsCorrect(correct)
    setSessionState("answered")

    if (correct) {
      hapticsSuccess()
      playCorrectSound()
      setCorrectCount((c) => c + 1)
    } else {
      hapticsWarning()
      playWrongSound()
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

  const answerFor = (option: string) => {
    if (selectedOption === null) return "idle" as const
    if (option.toLowerCase() === cards[currentIndex]?.sourceWord.toLowerCase()) return "correct" as const
    if (option === selectedOption && !isCorrect) return "wrong" as const
    return "faded" as const
  }

  const card = cards[currentIndex]
  const asking = (sessionState === "quiz" || sessionState === "answered") && !!card

  return (
    <QuizSheet
      title={t('quiz.review.title')}
      icon="solar:book-2-bold"
      iconClassName="text-cyan-300"
      closeLabel={t('quiz.review.aria.close')}
      onClose={onClose}
      morphFrom={morphFrom}
      headerExtra={
        <CoinPurse
          ref={purse.ref}
          left={coins.left}
          total={coins.total}
          label={t('quiz.coins.aria', { count: coins.left, total: coins.total })}
        />
      }
    >
      {(close) => (
        <>
          {/* Counter + progress bar, their room kept while there are none,
              so the question doesn't move when the cards come. */}
          <QuizProgress
            current={currentIndex + 1}
            total={sessionState !== "complete" ? cards.length : 0}
            done={currentIndex + (sessionState === "answered" ? 1 : 0)}
          />

          {sessionState === "loading" && (
            <>
              <QuizCardFrame className="justify-center">
                <div className="text-white/50 text-lg">{t('quiz.review.loading')}</div>
              </QuizCardFrame>
              <QuizAnswers options={[]} loading answerFor={answerFor} onAnswer={() => {}} locked />
            </>
          )}

          {asking && (
            <>
              <QuizQuestionCard
                key={currentIndex}
                vocabularyId={card.vocabularyId}
                word={card.targetWord}
                playing={isPlayingAudio}
                onPlay={() => playWordAudio(card)}
                coins={coins}
                onSpent={() => purse.spent(coins.left - 1)}
                onBroke={purse.broke}
              />
              <QuizAnswers
                options={options}
                loading={loadingOptions}
                answerFor={answerFor}
                onAnswer={handleAnswer}
                locked={selectedOption !== null}
              />
            </>
          )}

          {sessionState === "complete" && (
            <>
              <QuizResult
                icon={cards.length === 0 ? "solar:check-circle-bold" : "solar:cup-star-bold"}
                title={cards.length === 0 ? t('quiz.review.noWords') : t('quiz.review.complete')}
                correct={correctCount}
                total={cards.length}
              />
              <QuizResultActions>
                <button onClick={() => { hapticsLight(); close() }} className={QUIZ_BUTTON}>
                  {t('common.done')}
                </button>
              </QuizResultActions>
            </>
          )}
        </>
      )}
    </QuizSheet>
  )
}
