"use client"

// An avatar wearing its rank's border. Everything is sized in `em` off the
// wrapper's font-size (= the avatar's diameter), so one component draws every
// size from a 40px gallery chip to the 150px level-up hero. The animations
// are transform/opacity only — on iPhone anything that repaints per frame
// janks (see lib/morph-modal.ts) — and live in app/leveling.css.

import React from "react"
import { RANKS, rankForLevel, type BorderId } from "@/lib/leveling/definitions"

interface LevelAvatarProps {
  /** Level to draw; picks the border unless `border` is given. */
  level: number
  border?: BorderId
  size: number
  src?: string | null
  initials?: string
  /** Show the level number pill. */
  showLevel?: boolean
  /** false holds every animation still (gallery chips that aren't selected). */
  animated?: boolean
  className?: string
}

const GLYPHS = ["A", "あ", "Ж", "ع", "한", "ñ", "字", "Ω", "ß", "अ"]

export function LevelAvatar({
  level,
  border,
  size,
  src,
  initials,
  showLevel = true,
  animated = true,
  className = "",
}: LevelAvatarProps) {
  const rank = border ? RANKS.find((r) => r.id === border)! : rankForLevel(level)
  const id = rank.id
  return (
    <div
      className={`lvl-av lvl-${id} ${animated ? "" : "lvl-still"} ${className}`}
      style={{ fontSize: size, ["--c" as string]: rank.color, ["--a" as string]: rank.accent }}
    >
      <Back id={id} />
      <div className="lvl-ring" />
      {(id === "wordsmith" || id === "ages" || id === "omniglot") && <div className="lvl-ring2" />}
      <div className="lvl-face">
        {src ? (
          <img src={src} alt="" draggable={false} />
        ) : (
          <span className="lvl-initials">{initials}</span>
        )}
      </div>
      <Front id={id} />
      {showLevel && (
        <span className="lvl-pill">
          <span>{level}</span>
        </span>
      )}
    </div>
  )
}

function Back({ id }: { id: BorderId }) {
  switch (id) {
    case "wordsmith":
    case "storyteller":
      return <div className="lvl-glow" />
    case "polyglot":
      return (
        <div className="lvl-flames">
          {Array.from({ length: 14 }, (_, i) => (
            <span key={i} style={{ ["--i" as string]: i, ["--n" as string]: 14 }} />
          ))}
        </div>
      )
    case "linguist":
      return <div className="lvl-prism" />
    case "lexicon":
      return (
        <>
          <div className="lvl-aurora lvl-aurora-a" />
          <div className="lvl-aurora lvl-aurora-b" />
        </>
      )
    case "babel":
      return <div className="lvl-cosmos" />
    case "ages":
      return <div className="lvl-rays" />
    case "omniglot":
      return (
        <>
          <div className="lvl-rays lvl-rays-rainbow" />
          <div className="lvl-aura" />
        </>
      )
    default:
      return null
  }
}

function Front({ id }: { id: BorderId }) {
  switch (id) {
    case "backpacker":
      return (
        <div className="lvl-studs">
          {[45, 135, 225, 315].map((d) => (
            <i key={d} style={{ ["--d" as string]: `${d}deg` }} />
          ))}
        </div>
      )
    case "conversationalist":
      return <Laurel />
    case "wordsmith":
      return (
        <div className="lvl-gems">
          {[0, 90, 180, 270].map((d) => (
            <i key={d} style={{ ["--d" as string]: `${d}deg` }} />
          ))}
        </div>
      )
    case "interpreter":
      return (
        <>
          <svg className="lvl-orbit-dash" viewBox="0 0 100 100" aria-hidden>
            <circle cx="50" cy="50" r="47" />
          </svg>
          <div className="lvl-spark-orbit">
            <i />
            <i />
          </div>
        </>
      )
    case "storyteller":
      return (
        <div className="lvl-shards">
          {Array.from({ length: 8 }, (_, i) => (
            <i key={i} style={{ ["--d" as string]: `${i * 45}deg` }} />
          ))}
        </div>
      )
    case "linguist":
      return <Sparkles />
    case "lexicon":
      return <GlyphOrbit />
    case "babel":
      return (
        <>
          <div className="lvl-planet-orbit lvl-po-a"><div><i /></div></div>
          <div className="lvl-planet-orbit lvl-po-b"><div><i /></div></div>
        </>
      )
    case "ages":
      return (
        <>
          <Wings />
          <div className="lvl-halo" />
        </>
      )
    case "omniglot":
      return (
        <>
          <Wings />
          <GlyphOrbit />
          <Sparkles />
          <Crown />
        </>
      )
    default:
      return null
  }
}

function Laurel() {
  // One branch, mirrored. Leaves climb from the bottom up the left side,
  // each tilted off the stem; the mirror makes the right one.
  const leaves = Array.from({ length: 6 }, (_, i) => {
    const deg = 250 - i * 19
    const a = deg * (Math.PI / 180)
    const x = 50 + Math.cos(a) * 55
    const y = 50 - Math.sin(a) * 55
    const rot = -deg - 90 - 30
    return <ellipse key={i} cx={x} cy={y} rx={8.5 - i * 0.7} ry={3.4 - i * 0.25} transform={`rotate(${rot} ${x} ${y})`} />
  }).concat(
    <path key="stem" d="M 36 101.7 A 53 53 0 0 1 4.1 23.5" fill="none" stroke="url(#lvl-laurel-g)" strokeWidth="1.6" strokeLinecap="round" />,
  )
  return (
    <svg className="lvl-laurel" viewBox="-10 -10 120 120" aria-hidden>
      <defs>
        <linearGradient id="lvl-laurel-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="1" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <g fill="url(#lvl-laurel-g)">{leaves}</g>
      <g fill="url(#lvl-laurel-g)" transform="translate(100 0) scale(-1 1)">{leaves}</g>
    </svg>
  )
}

function Sparkles() {
  const spots = [
    [8, 18, 0], [88, 12, 0.5], [96, 62, 1.1], [4, 72, 1.6], [70, 96, 0.8], [34, -2, 1.3],
  ]
  return (
    <div className="lvl-sparkles">
      {spots.map(([x, y, d], i) => (
        <svg key={i} viewBox="0 0 20 20" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${d}s` }} aria-hidden>
          <path d="M10 0 C11 7 13 9 20 10 C13 11 11 13 10 20 C9 13 7 11 0 10 C7 9 9 7 10 0Z" />
        </svg>
      ))}
    </div>
  )
}

function GlyphOrbit() {
  return (
    <div className="lvl-glyphs">
      {GLYPHS.slice(0, 8).map((g, i) => (
        <span key={i} style={{ ["--d" as string]: `${i * 45}deg` }}>
          <b>{g}</b>
        </span>
      ))}
    </div>
  )
}

function Wings() {
  const feathers = (
    <g>
      <path d="M50 52 C30 30 12 26 2 30 C14 34 22 40 30 50 Z" />
      <path d="M50 58 C30 44 10 44 0 50 C12 52 22 56 30 62 Z" opacity=".9" />
      <path d="M50 64 C34 58 16 62 6 70 C18 70 28 70 36 72 Z" opacity=".8" />
    </g>
  )
  return (
    <>
      <svg className="lvl-wing lvl-wing-l" viewBox="0 0 50 100" aria-hidden>
        <defs>
          <linearGradient id="lvl-wing-g" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0" stopColor="#fffbeb" />
            <stop offset="1" stopColor="#fbbf24" />
          </linearGradient>
        </defs>
        <g fill="url(#lvl-wing-g)">{feathers}</g>
      </svg>
      <svg className="lvl-wing lvl-wing-r" viewBox="0 0 50 100" aria-hidden>
        <g fill="url(#lvl-wing-g)">{feathers}</g>
      </svg>
    </>
  )
}

function Crown() {
  return (
    <svg className="lvl-crown" viewBox="0 0 60 40" aria-hidden>
      <defs>
        <linearGradient id="lvl-crown-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff7c2" />
          <stop offset=".5" stopColor="#facc15" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
      </defs>
      <path d="M4 34 L8 10 L20 22 L30 4 L40 22 L52 10 L56 34 Z" fill="url(#lvl-crown-g)" stroke="#fff7c2" strokeWidth="1" />
      <circle cx="30" cy="25" r="4" fill="#f472b6" />
      <circle cx="16" cy="28" r="2.6" fill="#22d3ee" />
      <circle cx="44" cy="28" r="2.6" fill="#a78bfa" />
    </svg>
  )
}
