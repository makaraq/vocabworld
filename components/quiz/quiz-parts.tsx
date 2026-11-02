"use client"
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { Icon } from "@iconify/react"
import { hapticsLight, hapticsMedium, hapticsWarning } from "@/lib/haptics"
import { hasWordImage } from "@/lib/word-images"
import { loadWordImage } from "@/lib/offline/word-image-cache"
import { useWordImage } from "@/hooks/use-word-image"
import { useT } from "@/components/providers/translation-provider"
import type { PictureCoins } from "@/lib/picture-coins"
import { PixelCoin } from "./pixel-coin"

// Pieces the review and topic quizzes share, dressed as the lesson is: the
// question on a card like the lesson's flashcard, answers as glass pills.

// The answers' block is one height, whether it holds four answers, their
// stand-ins or the result's buttons, so the card above never resizes.
export const ANSWERS_HEIGHT = "h-[16.25rem]"

export function QuizProgress({ current, total, done, suffix }: { current: number; total: number; done: number; suffix?: ReactNode }) {
  const { t } = useT()
  return (
    <div className={`shrink-0 pb-4 ${total > 0 ? "" : "invisible"}`}>
      <div className="flex items-baseline justify-between text-sm text-white/50 mb-2 tabular-nums">
        <span>{t("quiz.progress", { current, total })}{suffix}</span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-white/75 rounded-full transition-all duration-300"
          style={{ width: `${total ? (done / total) * 100 : 0}%` }}
        />
      </div>
    </div>
  )
}

// The lesson flashcard's look (globals.css/liquid-glass.css dress
// .flashcard-scale), filling what the answers leave.
export function QuizCardFrame({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flashcard-scale relative bg-black/40 border border-white/20 rounded-2xl px-6 py-5 shadow-lg flex-1 min-h-0 flex flex-col items-center text-center ${className}`}>
      {children}
    </div>
  )
}

// Longer words and phrases step down a size so they stay on one line where
// they can, as on the lesson card. CJK characters count double.
const wordSize = (word: string) => {
  const length = [...word].reduce(
    (n, ch) => n + (/[ᄀ-ᅟ⺀-꓏가-힣豈-﫿＀-｠]/.test(ch) ? 2 : 1),
    0
  )
  return length <= 10 ? "text-4xl" : length <= 14 ? "text-3xl" : "text-2xl"
}

const FLIP = "perspective(900px) rotateY"

interface QuizQuestionCardProps {
  vocabularyId: number
  word: string
  playing: boolean
  onPlay: () => void
  coins: PictureCoins
  // A purchase that found no coin left: the sheet nudges the purse.
  onBroke: () => void
  // A coin was spent: the purse marks it.
  onSpent: () => void
}

// The word to translate, and, when the word has art, a coin's worth of
// picture on the back: tapping "Show picture" spends one of the day's coins
// and turns the card over to the illustration; tapping the picture turns it
// back. Keyed by card in the quiz, so every word starts face up.
export function QuizQuestionCard({ vocabularyId, word, playing, onPlay, coins, onBroke, onSpent }: QuizQuestionCardProps) {
  const { t } = useT()
  const [flipped, setFlipped] = useState(false)
  const turning = useRef(false)
  const flipRef = useRef<HTMLDivElement>(null)
  const hasArt = hasWordImage(vocabularyId)
  const owned = coins.owns(vocabularyId)
  const canBuy = hasArt && (owned || coins.left > 0)
  const src = useWordImage(hasArt && (flipped || owned) ? vocabularyId : null)

  // Fetch the art ahead while it can be bought, so the flip lands on it.
  useEffect(() => {
    if (canBuy) loadWordImage(vocabularyId)
  }, [canBuy, vocabularyId])

  // Edge-on halfway, where the faces swap. Timed by the clock rather than
  // the animations' finish, so a stalled frame never leaves the card
  // standing edge-on.
  const turn = (to: boolean) => {
    const el = flipRef.current
    if (!el || turning.current) return
    turning.current = true
    const away = el.animate(
      [{ transform: `${FLIP}(0deg)` }, { transform: `${FLIP}(90deg)` }],
      { duration: 170, easing: "cubic-bezier(0.4, 0, 1, 1)" }
    )
    setTimeout(() => {
      away.cancel()
      setFlipped(to)
      const back = el.animate(
        [{ transform: `${FLIP}(-90deg)` }, { transform: `${FLIP}(0deg)` }],
        { duration: 300, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
      )
      setTimeout(() => {
        back.cancel()
        turning.current = false
      }, 300)
    }, 170)
  }

  const showPicture = () => {
    if (turning.current) return
    if (!owned) {
      if (!coins.buy(vocabularyId)) {
        hapticsWarning()
        onBroke()
        return
      }
      onSpent()
    }
    hapticsMedium()
    turn(true)
  }

  return (
    <div ref={flipRef} className="flex-1 min-h-0 flex flex-col">
      {flipped ? (
        <QuizCardFrame className="p-0">
          <button
            onClick={() => { hapticsLight(); turn(false) }}
            className="absolute inset-0 w-full h-full flex flex-col items-center px-6 py-5 rounded-[inherit] focus:outline-none"
            aria-label={t("quiz.picture.aria.hide")}
          >
            <div className="relative flex-1 min-h-0 w-full mb-3">
              {src && (
                <img
                  src={src}
                  alt=""
                  draggable={false}
                  className="absolute inset-0 block h-full w-full object-contain select-none pointer-events-none"
                />
              )}
            </div>
            <p className={`font-medium leading-tight text-white/95 ${wordSize(word) === "text-4xl" ? "text-3xl" : "text-2xl"}`}>{word}</p>
          </button>
        </QuizCardFrame>
      ) : (
        <QuizCardFrame>
          <button
            onClick={onPlay}
            className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95 ${
              playing ? "bg-blue-500/30" : "bg-white/10 hover:bg-white/20"
            }`}
            aria-label={playing ? t("quiz.aria.stopAudio") : t("quiz.aria.playWord", { word })}
          >
            <Icon
              icon={playing ? "solar:volume-loud-bold" : "solar:volume-bold"}
              width="18"
              height="18"
              className={playing ? "text-blue-300" : "text-white/70"}
            />
          </button>

          <div className="flex-1" />
          <p
            data-speaking={playing || undefined}
            className={`flashcard-word font-medium leading-tight text-white/95 ${wordSize(word)}`}
          >
            {word}
          </p>
          <div className="w-12 h-px bg-white/20 my-3.5" aria-hidden="true" />
          <p className="text-base text-white/55">{t("quiz.question")}</p>
          <div className="flex-1" />

          {/* Its room is kept for words without art too, so the word sits at
              the same height on every card. */}
          <div className={`shrink-0 h-10 flex items-center justify-center ${hasArt ? "" : "invisible"}`}>
            <button
              onClick={showPicture}
              disabled={!hasArt}
              aria-disabled={!canBuy || undefined}
              className={`h-10 pl-3 pr-4 rounded-full bg-white/10 flex items-center gap-2 text-sm font-medium transition-all active:scale-95 ${
                canBuy ? "text-white/90 hover:bg-white/20" : "text-white/45"
              }`}
              aria-label={owned ? t("quiz.picture.show") : canBuy ? t("quiz.picture.aria.buy") : t("quiz.coins.none")}
            >
              {owned ? (
                <Icon icon="solar:gallery-bold" width="18" height="18" className="text-white/80" />
              ) : (
                <PixelCoin size={18} spent={!canBuy} />
              )}
              {canBuy ? t("quiz.picture.show") : t("quiz.coins.none")}
            </button>
          </div>
        </QuizCardFrame>
      )}
    </div>
  )
}

type AnswerState = "idle" | "correct" | "wrong" | "faded"

// Correct and wrong tint the pill; the glass skin paints its fill from
// --lg-fill, so the tint is set there as well as in the plain style.
const ANSWER_STYLE: Record<AnswerState, { className: string; style?: CSSProperties }> = {
  idle: { className: "bg-black/20 border-white/10 text-white hover:bg-white/15 active:scale-[0.97]" },
  correct: {
    className: "bg-emerald-500/35 border-emerald-300/50 text-white",
    style: { "--lg-fill": "rgba(16, 185, 129, 0.42)" } as CSSProperties,
  },
  wrong: {
    className: "bg-red-500/35 border-red-300/50 text-white",
    style: { "--lg-fill": "rgba(239, 68, 68, 0.42)" } as CSSProperties,
  },
  faded: { className: "bg-black/20 border-white/10 text-white/40" },
}

export function QuizAnswers({
  options,
  loading,
  answerFor,
  onAnswer,
  locked,
}: {
  options: string[]
  loading: boolean
  answerFor: (option: string) => AnswerState
  onAnswer: (option: string) => void
  locked: boolean
}) {
  const { t } = useT()
  return (
    <div className={`shrink-0 ${ANSWERS_HEIGHT} pt-4 grid grid-rows-4 gap-2.5`}>
      {loading
        ? Array.from({ length: 4 }).map((_, i) => (
            <button key={i} disabled tabIndex={-1} aria-hidden="true" className="w-full rounded-2xl border bg-black/20 border-white/10" />
          ))
        : options.map((option, i) => {
            const look = ANSWER_STYLE[answerFor(option)]
            return (
              <button
                key={`${option}-${i}`}
                onClick={() => onAnswer(option)}
                disabled={locked}
                style={look.style}
                className={`w-full px-5 rounded-2xl border text-[15px] leading-tight font-medium transition-all flex items-center justify-center ${look.className}`}
                aria-label={t("quiz.aria.answer", { option })}
              >
                <span className="line-clamp-2">{option}</span>
              </button>
            )
          })}
    </div>
  )
}

// The result, on the same card, with the score as two counts.
export function QuizResult({ icon, title, correct, total, children }: { icon: string; title: string; correct: number; total: number; children?: ReactNode }) {
  const { t } = useT()
  return (
    <QuizCardFrame className="justify-center gap-5">
      <div className="w-20 h-20 rounded-full bg-white/10 border border-white/15 flex items-center justify-center">
        <Icon icon={icon} width="42" height="42" className="text-yellow-300" />
      </div>
      <div className="text-2xl font-bold text-white">{title}</div>
      {total > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-10">
            <div className="flex items-center gap-2.5">
              <Icon icon="solar:check-circle-bold" width="30" height="30" className="text-emerald-400" />
              <span className="text-emerald-300 font-bold text-2xl tabular-nums">{correct}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Icon icon="solar:close-circle-bold" width="30" height="30" className="text-red-400" />
              <span className="text-red-300 font-bold text-2xl tabular-nums">{total - correct}</span>
            </div>
          </div>
          <div className="text-white/50 text-sm">{t("quiz.accuracy", { pct: Math.round((correct / total) * 100) })}</div>
          {children}
        </div>
      )}
    </QuizCardFrame>
  )
}

// The result's buttons, at the foot of the answers' block.
export function QuizResultActions({ children }: { children: ReactNode }) {
  return <div className={`shrink-0 ${ANSWERS_HEIGHT} pt-4 flex flex-col justify-end gap-2.5`}>{children}</div>
}

// The purse in the header: a spent coin hops as it greys; a purchase with
// none left shakes the purse.
export function usePurseMotion() {
  const ref = useRef<HTMLDivElement>(null)
  const spent = (index: number) => {
    const coin = ref.current?.children[index] as HTMLElement | undefined
    coin?.animate(
      [{ transform: "none" }, { transform: "translateY(-7px) scale(1.3)", offset: 0.4 }, { transform: "none" }],
      { duration: 520, easing: "cubic-bezier(0.34, 1.4, 0.64, 1)" }
    )
  }
  const broke = () => {
    ref.current?.animate(
      [0, -5, 5, -4, 4, -2, 0].map((x) => ({ transform: `translateX(${x}px)` })),
      { duration: 420, easing: "ease-out" }
    )
  }
  return { ref, spent, broke }
}

export const QUIZ_BUTTON = "w-full h-[52px] bg-white/10 backdrop-blur-sm rounded-2xl text-white font-semibold text-base hover:bg-white/15 transition-all flex items-center justify-center gap-2"
