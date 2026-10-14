import React from 'react'
import { random } from 'remotion'
import { COLOR } from '../theme'

// Thin amber bars that move with a simulated voice. Every height is a pure
// function of the frame, the bar's index and a fixed seed.

export const AudioWaveform: React.FC<{
  frame: number
  width: number
  height: number
  bars?: number
  /** 0 → 1: how loud the voice is right now. */
  level: number
  /** 0 → 1: bars to the left of this are played (amber), the rest are muted. */
  progress?: number
  seed?: string
  style?: React.CSSProperties
}> = ({ frame, width, height, bars = 56, level, progress = 1, seed = 'wave', style }) => {
  const gap = width / bars
  const barWidth = Math.max(2, gap * 0.42)
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={style} aria-hidden>
      <defs>
        <linearGradient id={`wf-${seed}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={COLOR.amberSoft} />
          <stop offset="1" stopColor={COLOR.amber} />
        </linearGradient>
      </defs>
      {Array.from({ length: bars }, (_, i) => {
        const r = random(`${seed}-${i}`)
        const center = 1 - Math.abs(i / (bars - 1) - 0.5) * 1.3
        const shape = 0.35 + 0.65 * Math.max(0, center) * (0.6 + 0.4 * r)
        const motion =
          0.55 * Math.abs(Math.sin(frame * 0.31 + i * 0.57 + r * 6.28)) +
          0.45 * Math.abs(Math.sin(frame * 0.12 + i * 0.19 + r * 3.1))
        const idle = 0.06 + 0.03 * Math.sin(frame * 0.05 + i * 0.4)
        const h = Math.max(barWidth, height * (idle + (1 - idle) * level * shape * motion))
        const played = i / bars < progress
        return (
          <rect
            key={i}
            x={i * gap + (gap - barWidth) / 2}
            y={(height - h) / 2}
            width={barWidth}
            height={h}
            rx={barWidth / 2}
            fill={played ? `url(#wf-${seed})` : 'rgba(250,250,249,0.22)'}
          />
        )
      })}
    </svg>
  )
}

/**
 * A speech envelope for the waveform: rises as a word starts, holds, falls
 * at its end. `t` is frames into the word, `length` its spoken frames.
 */
export function speechLevel(t: number, length: number): number {
  if (t < 0 || t > length) return 0
  const attack = Math.min(1, t / 3)
  const release = Math.min(1, (length - t) / 4)
  return Math.min(attack, release) * (0.75 + 0.25 * Math.sin(t * 0.9))
}
