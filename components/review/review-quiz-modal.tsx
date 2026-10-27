"use client"
import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import { Icon } from "@iconify/react"
import { hapticsSuccess, hapticsWarning, hapticsLight } from "@/lib/haptics"
import { preloadSoundEffects, playCorrectSound, playWrongSound } from "@/lib/sound-effects"
import { Rating } from "@/lib/sr/fsrs"
import { useT } from "@/components/providers/translation-provider"
import { canMorphFrom, morphPanelOpen, type PanelMorph } from "@/lib/morph-modal"

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

  // Mount + fully freeze background (prevent scroll + swipe on the page behind)
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

  // The whole screen, frosted as the topic quiz is, opening out of the tile
  // as the other pop-ups do: glass that's the tile's to begin with, turning
  // into the view's.
  const modalRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const morphRef = useRef<PanelMorph | null>(null)
  const closingRef = useRef(false)
  const dragState = useRef<{ phase: 'idle' | 'pending' | 'dragging'; startY: number; currentY: number; startTime: number }>({
    phase: 'idle', startY: 0, currentY: 0, startTime: 0,
  })
  const [shown, setShown] = useState(false)

  // Out of the tile, when it's on screen; else the slide up. Before the
  // first paint, so it never shows in place first.
  useLayoutEffect(() => {
    if (!mounted) return
    const source = morphFrom?.()
    if (modalRef.current && canMorphFrom(source)) {
      morphRef.current = morphPanelOpen(source, modalRef.current)
      // Its own slide up doesn't run; the morph holds it meanwhile.
      setShown(true)
    }
    const raf = requestAnimationFrame(() => setShown(true))
    return () => {
      cancelAnimationFrame(raf)
      morphRef.current?.dispose()
      morphRef.current = null
    }
  }, [mounted]) // eslint-disable-line react-hooks/exhaustive-deps

  // Back into the tile it opened from; dragged down, it slides away
  // instead, carrying on at the drag's `velocity` (px/ms) while the tile
  // forms again (lib/morph-modal.ts).
  const animateClose = useCallback((how?: 'slide', velocity?: number) => {
    if (closingRef.current) return
    closingRef.current = true
    if (morphRef.current) {
      if (how === 'slide') morphRef.current.slide(onClose, velocity)
      else morphRef.current.close(onClose)
      return
    }
    if (modalRef.current) {
      modalRef.current.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out'
      modalRef.current.style.transform = 'translateY(100%)'
      modalRef.current.style.opacity = '0'
    }
    setTimeout(onClose, 300)
  }, [onClose])

  // Lets go of a drag: far or fast enough, it slides away; else it springs
  // back.
  const endDrag = useCallback((dy: number, dt: number) => {
    const velocity = dy / Math.max(dt, 1)
    if (dy > 100 || velocity > 0.4) {
      animateClose('slide', velocity)
      return
    }
    if (modalRef.current) {
      modalRef.current.style.transition = 'transform 0.3s cubic-bezier(0.2, 0, 0, 1)'
      modalRef.current.style.transform = 'translateY(0)'
    }
  }, [animateClose])

  const dragTo = (dy: number) => {
    if (modalRef.current) {
      modalRef.current.style.transform = `translateY(${dy < 0 ? dy * 0.15 : dy}px)`
      modalRef.current.style.transition = 'none'
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (closingRef.current) return
    const target = e.target as HTMLElement
    if (target.closest('button, a, input, select')) return
    const isHandle = !!target.closest('[data-drag-handle]')
    const scrollEl = scrollRef.current
    const isAtTop = !scrollEl || scrollEl.scrollTop <= 0
    if (!isHandle && !isAtTop) return
    dragState.current = {
      phase: isHandle ? 'dragging' : 'pending',
      startY: e.touches[0].clientY,
      currentY: e.touches[0].clientY,
      startTime: Date.now(),
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const s = dragState.current
    if (s.phase === 'idle') return
    const clientY = e.touches[0].clientY
    const dy = clientY - s.startY
    if (s.phase === 'pending') {
      if (dy > 8) s.phase = 'dragging'
      else if (dy < -8) { s.phase = 'idle'; return }
      else return
    }
    s.currentY = clientY
    dragTo(dy)
  }

  const handleTouchEnd = () => {
    const s = dragState.current
    if (s.phase !== 'dragging') { s.phase = 'idle'; return }
    s.phase = 'idle'
    endDrag(s.currentY - s.startY, Date.now() - s.startTime)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (closingRef.current) return
    const target = e.target as HTMLElement
    if (!target.closest('[data-drag-handle]') || target.closest('button')) return
    e.preventDefault()
    const startY = e.clientY
    const startTime = Date.now()
    let currentY = startY
    const onMove = (ev: MouseEvent) => {
      currentY = ev.clientY
      dragTo(currentY - startY)
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove, true)
      window.removeEventListener('mouseup', onUp, true)
      endDrag(currentY - startY, Date.now() - startTime)
    }
    // Caught on the way down: the view stops mouse events going up to the
    // page behind it, the window included.
    window.addEventListener('mousemove', onMove, true)
    window.addEventListener('mouseup', onUp, true)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') animateClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [animateClose])

  if (!mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label={t('quiz.review.title')}
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
      {/* One layout whatever it holds: the cards load after it opens, and
          the result is shorter than a question. */}
      <div
        ref={modalRef}
        className={`absolute inset-0 flex flex-col bg-black/40 backdrop-blur-xl transition-all duration-300 select-none ${
          shown ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
        }`}
        style={{ WebkitTapHighlightColor: 'transparent' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        {/* Full width, so it holds its place while the view grows (the
            column inside centres itself). */}
        <div
          className="flex-1 min-h-0 w-full flex flex-col"
          style={{
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 24px)',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
          }}
        >
          <div className="flex-1 min-h-0 w-full max-w-lg mx-auto px-5 flex flex-col">
            <div data-drag-handle className="shrink-0 pb-6" style={{ touchAction: 'none' }}>
              <h2 className="text-white font-semibold text-lg flex items-center justify-center gap-2 mb-4">
                <Icon icon="solar:book-2-bold" width="22" className="text-cyan-400" />
                {t('quiz.review.title')}
              </h2>

              {/* Counter + progress bar, their room kept while there are none,
                  so the question doesn't move when the cards come. */}
              <div className={sessionState !== "complete" && cards.length > 0 ? "" : "invisible"}>
                <div className="text-sm text-white/50 mb-2">
                  {t('quiz.progress', { current: currentIndex + 1, total: cards.length })}
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-300"
                    style={{
                      width: `${cards.length ? ((currentIndex + (sessionState === "answered" ? 1 : 0)) / cards.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div ref={scrollRef} className="overflow-y-auto flex-1 min-h-0 flex flex-col" style={{ overscrollBehaviorY: 'none' }}>
              {sessionState === "loading" && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-white/50 text-lg">{t('quiz.review.loading')}</div>
                </div>
              )}

              {(sessionState === "quiz" || sessionState === "answered") &&
                cards[currentIndex] && (
                  <div className="flex-1 flex flex-col justify-center gap-6">
                    {/* Question card */}
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-8 text-center relative">
                      <div className="text-sm text-white/50 mb-2">
                        {t('quiz.question')}
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
                        aria-label={isPlayingAudio ? t('quiz.aria.stopAudio') : t('quiz.aria.playWord', { word: cards[currentIndex].targetWord })}
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
                            aria-label={t('quiz.aria.answer', { option })}
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
                      {cards.length === 0 ? t('quiz.review.noWords') : t('quiz.review.complete')}
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
                        <div className="text-white/50 text-sm">
                          {t('quiz.accuracy', { pct: Math.round((correctCount / cards.length) * 100) })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Within the thumb's reach: the ✕, or Done once there's a result,
                in a slot of one height so nothing above moves. */}
            <div className="shrink-0 h-14 mt-4 flex justify-center">
              {sessionState === "complete" && cards.length > 0 ? (
                <button
                  onClick={() => { hapticsLight(); animateClose() }}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl text-white font-semibold text-base hover:opacity-90 transition-opacity"
                >
                  {t('common.done')}
                </button>
              ) : (
                <button
                  onClick={() => { hapticsLight(); animateClose() }}
                  className="w-14 h-14 rounded-full bg-white/10 border border-white/15 flex items-center justify-center"
                  aria-label={t('quiz.review.aria.close')}
                >
                  <Icon icon="solar:close-circle-bold" width="28" height="28" className="text-white/50" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
