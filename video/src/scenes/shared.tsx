import React from 'react'
import { AbsoluteFill, Easing } from 'remotion'
import { COLOR, amber } from '../theme'
import { PHONE_OUTER, PhoneMockup } from '../components/PhoneMockup'
import type { AudioStep } from '../app-ui/LearningView'

/** The dark stage every scene stands on, with a warm light where it looks. */
export const Stage: React.FC<{
  children?: React.ReactNode
  glow?: { x: number; y: number; size: number; strength: number }[]
}> = ({ children, glow = [] }) => (
  <AbsoluteFill style={{ background: COLOR.bg, overflow: 'hidden' }}>
    {glow.map((g, i) => (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: g.x - g.size / 2,
          top: g.y - g.size / 2,
          width: g.size,
          height: g.size,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${amber(0.22 * g.strength)} 0%, ${amber(0.08 * g.strength)} 38%, transparent 70%)`,
        }}
      />
    ))}
    {children}
  </AbsoluteFill>
)

/**
 * The phone, centred on `x`, its top edge at `top`, scaled from the app's
 * 1pt = 1px. Rotations are in degrees, around the phone's centre.
 */
export const PhoneOnStage: React.FC<{
  children: React.ReactNode
  x?: number
  top: number
  scale: number
  rotateX?: number
  rotateY?: number
  rotateZ?: number
  opacity?: number
  glare?: number
  origin?: string
}> = ({ children, x = 540, top, scale, rotateX = 0, rotateY = 0, rotateZ = 0, opacity = 1, glare, origin = 'center top' }) => (
  <div
    style={{
      position: 'absolute',
      left: x - PHONE_OUTER.width / 2,
      top,
      width: PHONE_OUTER.width,
      height: PHONE_OUTER.height,
      transformOrigin: origin,
      transform: `perspective(2400px) scale(${scale}) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`,
      opacity,
    }}
  >
    <PhoneMockup glare={glare}>{children}</PhoneMockup>
  </div>
)

// ── Autoplay ─────────────────────────────────────────────────────────
// The learning view's autoplay loop: target-language audio, the pause
// between translations, the main-language audio, the pause before the next
// word. Durations are frames.

export interface AutoplayTiming {
  start: number
  training: number
  main: number
  pause: number
}

export function autoplayAt(frame: number, timing: AutoplayTiming) {
  const per = timing.training + timing.main + timing.pause
  const t = frame - timing.start
  if (t < 0) return { word: 0, step: 'idle' as AudioStep, stepFrame: 0, wordFrame: 0 }
  const word = Math.floor(t / per)
  const within = t - word * per
  const step: AudioStep =
    within < timing.training ? 'training' : within < timing.training + timing.main ? 'main' : 'pause'
  const stepFrame =
    step === 'training' ? within : step === 'main' ? within - timing.training : within - timing.training - timing.main
  return { word, step, stepFrame, wordFrame: within }
}

// The app's flashcard curves (app/globals.css .flashcard-scale): out to 1.05
// on cubic-bezier(0.34, 1.45, 0.64, 1) over 340ms, back on
// cubic-bezier(0.22, 1, 0.36, 1) over 420ms.
const SWELL = Easing.bezier(0.34, 1.45, 0.64, 1)
const SETTLE = Easing.bezier(0.22, 1, 0.36, 1)

/** --flashcard-scale for a card that plays over [on, off) (frames). */
export function cardScale(frame: number, intervals: [number, number][], fps = 30): number {
  const swellFrames = 0.34 * fps
  const settleFrames = 0.42 * fps
  let scale = 1
  for (const [on, off] of intervals) {
    if (frame >= on && frame < off) {
      const p = Math.min(1, (frame - on) / swellFrames)
      scale = 1 + 0.05 * SWELL(p)
    } else if (frame >= off && frame < off + settleFrames) {
      const p = (frame - off) / settleFrames
      scale = 1.05 - 0.05 * SETTLE(p)
    }
  }
  return scale
}

/** Intervals during which each card plays, for `words` words of autoplay. */
export function autoplayIntervals(timing: AutoplayTiming, words: number) {
  const per = timing.training + timing.main + timing.pause
  const target: [number, number][] = []
  const native: [number, number][] = []
  for (let w = 0; w < words; w++) {
    const s = timing.start + w * per
    target.push([s, s + timing.training])
    native.push([s + timing.training, s + timing.training + timing.main])
  }
  return { target, native }
}

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
