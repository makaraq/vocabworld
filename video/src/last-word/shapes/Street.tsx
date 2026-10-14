import React from 'react'
import { random } from 'remotion'
import { FONT } from '../../theme'
import { P } from '../palette'

// Shared scenery: the sky, the low sun, the cobbles, a Paris lamp post, the
// fingerpost at the fork, and the film's grain.

/** Gradients every scene uses; put once inside each <svg>. */
export const Defs: React.FC = () => (
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={P.skyTop} />
      <stop offset="0.28" stopColor={P.skyHigh} />
      <stop offset="0.52" stopColor={P.skyMid} />
      <stop offset="0.74" stopColor={P.skyLow} />
      <stop offset="0.9" stopColor={P.skyGlow} />
      <stop offset="1" stopColor={P.horizon} />
    </linearGradient>
    <radialGradient id="sunGlow">
      <stop offset="0" stopColor={P.sunCore} stopOpacity="1" />
      <stop offset="0.18" stopColor={P.sun} stopOpacity="0.95" />
      <stop offset="0.45" stopColor={P.horizon} stopOpacity="0.45" />
      <stop offset="1" stopColor={P.skyGlow} stopOpacity="0" />
    </radialGradient>
    <radialGradient id="lampGlow">
      <stop offset="0" stopColor="#fff1b8" stopOpacity="0.95" />
      <stop offset="0.3" stopColor={P.amberSoft} stopOpacity="0.45" />
      <stop offset="1" stopColor={P.amber} stopOpacity="0" />
    </radialGradient>
    <linearGradient id="streetDepth" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#ffb347" stopOpacity="0.55" />
      <stop offset="0.5" stopColor={P.skyLow} stopOpacity="0.25" />
      <stop offset="1" stopColor={P.street} stopOpacity="0" />
    </linearGradient>
    <linearGradient id="interior" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#ffd98a" />
      <stop offset="1" stopColor="#ff9a3c" />
    </linearGradient>
  </defs>
)

export const Sky: React.FC<{ x?: number; y?: number; w?: number; h?: number }> = ({ x = -2000, y = -1200, w = 6000, h = 2800 }) => (
  <rect x={x} y={y} width={w} height={h} fill="url(#sky)" />
)

export const Sun: React.FC<{ cx: number; cy: number; r: number }> = ({ cx, cy, r }) => (
  <g>
    <circle cx={cx} cy={cy} r={r * 4.2} fill="url(#sunGlow)" />
    <circle cx={cx} cy={cy} r={r} fill={P.sun} />
    <circle cx={cx} cy={cy} r={r * 0.82} fill={P.sunCore} opacity={0.55} />
  </g>
)

/** Pavement and cobbled road from `y` down, between x0 and x1. */
export const Cobbles: React.FC<{ x0: number; x1: number; y: number; seed: string; to?: number }> = ({ x0, x1, y, seed, to = y + 700 }) => {
  const els: React.ReactNode[] = []
  els.push(<rect key="road" x={x0} y={y} width={x1 - x0} height={to - y} fill={P.street} />)
  let ry = y + 6
  let row = 0
  while (ry < to) {
    const h = 14 + row * 5
    const w = h * 1.9
    const offset = (row % 2) * w * 0.5 - w
    for (let cx = x0 + offset; cx < x1; cx += w + 4) {
      const k = random(`${seed}-${row}-${Math.round(cx)}`)
      els.push(
        <rect
          key={`${row}-${Math.round(cx)}`}
          x={cx}
          y={ry}
          width={w}
          height={h}
          rx={h * 0.4}
          fill={k > 0.82 ? P.cobbleLight : P.cobble}
          opacity={0.75 + 0.25 * k}
        />,
      )
    }
    ry += h + 4
    row++
  }
  return <g>{els}</g>
}

/** The pavement band with its stone curb. */
export const Pavement: React.FC<{ x0: number; x1: number; y: number; h?: number }> = ({ x0, x1, y, h = 56 }) => (
  <g>
    <rect x={x0} y={y} width={x1 - x0} height={h} fill={P.cobbleLight} />
    <rect x={x0} y={y + h} width={x1 - x0} height={12} fill={P.curb} />
    <rect x={x0} y={y + h + 12} width={x1 - x0} height={6} fill="rgba(0,0,0,0.25)" />
  </g>
)

/** A cast-iron Paris lamp post with a lit lantern. */
export const Lamp: React.FC<{ x: number; y: number; h?: number; glow?: number }> = ({ x, y, h = 560, glow = 1 }) => {
  const top = y - h
  return (
    <g>
      <circle cx={x} cy={top + 30} r={150} fill="url(#lampGlow)" opacity={0.8 * glow} />
      <path d={`M ${x - 26} ${y} L ${x - 14} ${y - 70} L ${x + 14} ${y - 70} L ${x + 26} ${y} Z`} fill={P.tealDark} />
      <rect x={x - 7} y={top + 60} width={14} height={h - 120} fill={P.tealDark} />
      <rect x={x - 12} y={top + 56} width={24} height={10} fill={P.tealDark} />
      <path d={`M ${x - 24} ${top + 56} L ${x - 30} ${top + 6} L ${x + 30} ${top + 6} L ${x + 24} ${top + 56} Z`} fill="#ffe08a" />
      <path d={`M ${x - 36} ${top + 8} L ${x} ${top - 22} L ${x + 36} ${top + 8} Z`} fill={P.tealDark} />
      <circle cx={x} cy={top - 28} r={6} fill={P.tealDark} />
    </g>
  )
}

// ── The fingerpost ─────────────────────────────────────────────────────

export interface Blade {
  /** The words it shows, the one it ends on first. */
  words: string[]
  /** Final pointing: -1 left, 1 right, 0 a plate facing us (with an up arrow). */
  dir: -1 | 0 | 1
  /** Height of the blade's centre line. */
  y: number
  /** Turn left to go, radians; 0 at rest. */
  yaw: number
}

const BLADE_L = 270
const BLADE_H = 70

/** Which word a blade shows at a yaw: a new one each half turn. */
export function bladeWord(b: Blade) {
  const half = Math.floor((b.yaw + Math.PI / 2) / Math.PI)
  return b.words[((half % b.words.length) + b.words.length) % b.words.length]
}

export const Signpost: React.FC<{ x: number; y: number; top: number; blades: Blade[] }> = ({ x, y, top, blades }) => (
  <g>
    {/* post */}
    <path d={`M ${x - 22} ${y} L ${x - 14} ${y - 60} L ${x + 14} ${y - 60} L ${x + 22} ${y} Z`} fill={P.tealDark} />
    <rect x={x - 9} y={top} width={18} height={y - top - 50} fill={P.tealDark} />
    <circle cx={x} cy={top - 6} r={14} fill={P.tealDark} />
    <circle cx={x} cy={top - 24} r={7} fill={P.tealDark} />
    {blades.map((b, i) => {
      const c = Math.cos(b.yaw)
      const word = bladeWord(b)
      const light = 0.78 + 0.22 * Math.abs(c)
      if (b.dir === 0) {
        // A plate on the post, turning on its own axis.
        const w = 300
        return (
          <g key={i} transform={`translate(${x} ${b.y}) scale(${c} 1)`}>
            <rect x={-w / 2} y={-BLADE_H / 2} width={w} height={BLADE_H} rx={10} fill={P.signFace} opacity={light} />
            <rect x={-w / 2 + 6} y={-BLADE_H / 2 + 6} width={w - 12} height={BLADE_H - 12} rx={7} fill="none" stroke={P.signInk} strokeWidth={4} />
            <g transform={`scale(${Math.sign(c) || 1} 1)`}>
              <path d="M -112 14 V -8 M -124 2 L -112 -14 L -100 2" stroke={P.signInk} strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <text x={18} y={13} textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={38} fill={P.signInk}>
                {word}
              </text>
            </g>
          </g>
        )
      }
      // A blade fixed at the post, pointing out; its far end sweeps through
      // the post as it turns, so it reads as turning in depth.
      const reach = b.dir * c
      return (
        <g key={i} transform={`translate(${x} ${b.y}) scale(${reach} 1)`}>
          <path
            d={`M 10 ${-BLADE_H / 2} H ${BLADE_L - 36} L ${BLADE_L} 0 L ${BLADE_L - 36} ${BLADE_H / 2} H 10 Z`}
            fill={P.signFace}
            opacity={light}
          />
          <path
            d={`M 18 ${-BLADE_H / 2 + 7} H ${BLADE_L - 40} L ${BLADE_L - 12} 0 L ${BLADE_L - 40} ${BLADE_H / 2 - 7} H 18 Z`}
            fill="none"
            stroke={P.signInk}
            strokeWidth={4}
          />
          <g transform={`translate(${(BLADE_L - 10) / 2 + 4} 0) scale(${Math.sign(reach) || 1} 1)`}>
            <text y={13} textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={40} fill={P.signInk}>
              {word}
            </text>
          </g>
        </g>
      )
    })}
  </g>
)

/** Film grain and a soft vignette, over everything. */
export const Grain: React.FC<{ frame: number; strength?: number }> = ({ frame, strength = 0.07 }) => (
  <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
    <defs>
      <filter id={`grain${frame}`} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={frame % 97} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <radialGradient id="vignette" cx="0.5" cy="0.5" r="0.75">
        <stop offset="0.55" stopColor="#000" stopOpacity="0" />
        <stop offset="1" stopColor="#12060a" stopOpacity="0.55" />
      </radialGradient>
    </defs>
    <rect width={1080} height={1920} filter={`url(#grain${frame})`} opacity={strength} style={{ mixBlendMode: 'overlay' }} />
    <rect width={1080} height={1920} fill="url(#vignette)" />
  </svg>
)
