"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { awardXp } from "@/lib/leveling/engine"
import { Icon } from "@iconify/react"
import { hapticsSuccess, hapticsWarning, hapticsLight } from "@/lib/haptics"
import { preloadSoundEffects, playCorrectSound, playWrongSound } from "@/lib/sound-effects"
import { useT } from "@/components/providers/translation-provider"
import { usePictureCoins } from "@/lib/picture-coins"
import { QuizSheet } from "./quiz-sheet"
import { CoinPurse } from "./pixel-coin"
import {
  QuizProgress, QuizCardFrame, QuizQuestionCard, QuizAnswers, QuizResult, QuizResultActions, QUIZ_BUTTON, usePurseMotion,
} from "./quiz-parts"

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
  const { t } = useT()
  const coins = usePictureCoins()
  const purse = usePurseMotion()
  const [cards, setCards] = useState<QuizCard[]>([])
  const [totalWords, setTotalWords] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [options, setOptions] = useState<string[]>([])
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [sessionState, setSessionState] = useState<SessionState>("loading")
  const [correctCount, setCorrectCount] = useState(0)
  const missedRef = useRef(false)
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [round, setRound] = useState(1)
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
        missedRef.current = false
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
      playCorrectSound()
      setCorrectCount((c) => c + 1)
      awardXp(userId, "quiz_correct")
    } else {
      hapticsWarning()
      playWrongSound()
      missedRef.current = true
    }

    setTimeout(() => {
      if (currentIndex + 1 < cards.length) {
        setCurrentIndex((i) => i + 1)
        setSessionState("quiz")
      } else {
        setSessionState("complete")
        // A round with no mistakes pays a bonus on top.
        if (!missedRef.current && cards.length > 0) awardXp(userId, "quiz_perfect")
        missedRef.current = false
      }
    }, 1000)
  }

  const handleNextRound = () => {
    hapticsLight()
    setRound((r) => r + 1)
    fetchCards()
  }

  const answerFor = (option: string) => {
    if (selectedOption === null) return "idle" as const
    if (option.toLowerCase() === cards[currentIndex]?.sourceWord.toLowerCase()) return "correct" as const
    if (option === selectedOption && !isCorrect) return "wrong" as const
    return "faded" as const
  }

  const pct = cards.length > 0 ? Math.round((correctCount / cards.length) * 100) : 0
  const card = cards[currentIndex]
  const asking = (sessionState === "quiz" || sessionState === "answered") && !!card

  return (
    <QuizSheet
      title={t('quiz.topic.title', { topic: topicName })}
      icon="solar:cup-star-bold"
      iconClassName="text-yellow-400"
      closeLabel={t('quiz.topic.aria.close')}
      onClose={onClose}
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
          <QuizProgress
            current={currentIndex + 1}
            total={sessionState !== "complete" ? cards.length : 0}
            done={currentIndex + (sessionState === "answered" ? 1 : 0)}
            suffix={totalWords > cards.length && (
              <span className="text-white/30"> {t('quiz.topic.totalSuffix', { total: totalWords })}</span>
            )}
          />

          {sessionState === "loading" && (
            <>
              <QuizCardFrame className="justify-center">
                <div className="text-white/50 text-lg">{t('quiz.topic.loading')}</div>
              </QuizCardFrame>
              <QuizAnswers options={[]} loading answerFor={answerFor} onAnswer={() => {}} locked />
            </>
          )}

          {asking && (
            <>
              <QuizQuestionCard
                key={`${round}-${currentIndex}`}
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
                icon={pct >= 80 ? "solar:cup-star-bold" : "solar:check-circle-bold"}
                title={
                  cards.length === 0
                    ? t('quiz.topic.noWords')
                    : pct === 100
                    ? t('quiz.topic.perfect')
                    : pct >= 80
                    ? t('quiz.topic.great')
                    : t('quiz.topic.complete')
                }
                correct={correctCount}
                total={cards.length}
              >
                {totalWords > cards.length && (
                  <div className="text-white/30 text-sm">
                    {t('quiz.topic.coverage', { count: cards.length, total: totalWords })}
                  </div>
                )}
              </QuizResult>
              <QuizResultActions>
                {cards.length > 0 && (
                  <button onClick={handleNextRound} className={QUIZ_BUTTON}>
                    <Icon icon="solar:refresh-bold" width="18" height="18" />
                    {t('quiz.topic.tryAnother')}
                  </button>
                )}
                <button onClick={() => { hapticsLight(); close() }} className={`${QUIZ_BUTTON} text-white/75 font-medium`}>
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
