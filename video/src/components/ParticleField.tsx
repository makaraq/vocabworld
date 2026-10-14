import React from 'react'
import { random } from 'remotion'

// Sparse, slow particles: warm dust drifting up through the dark. Positions
// come from a seeded random, motion from the frame, so every render matches.

export const ParticleField: React.FC<{
  frame: number
  count?: number
  seed?: string
  width?: number
  height?: number
  /** Pixels per frame of upward drift. */
  speed?: number
  opacity?: number
  /** 0 → 1: share of amber particles; the rest are warm white. */
  amberShare?: number
}> = ({ frame, count = 46, seed = 'dust', width = 1080, height = 1920, speed = 0.35, opacity = 1, amberShare = 0.6 }) => (
  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity }}>
    {Array.from({ length: count }, (_, i) => {
      const rx = random(`${seed}-x-${i}`)
      const ry = random(`${seed}-y-${i}`)
      const rs = random(`${seed}-s-${i}`)
      const rp = random(`${seed}-p-${i}`)
      const size = 2 + rs * 4.5
      const drift = speed * (0.4 + rs)
      const y = (((ry * height - frame * drift) % height) + height) % height
      const x = rx * width + Math.sin(frame * 0.02 + rp * 6.28) * 14
      const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(frame * 0.04 + rp * 9))
      const amberDot = rp < amberShare
      return (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: x,
            top: y,
            width: size,
            height: size,
            borderRadius: '50%',
            background: amberDot ? 'rgba(251,191,36,0.9)' : 'rgba(250,250,249,0.8)',
            boxShadow: amberDot ? `0 0 ${size * 3}px rgba(245,158,11,0.6)` : 'none',
            opacity: twinkle * (0.25 + 0.5 * rs),
            filter: size > 5 ? 'blur(0.6px)' : undefined,
          }}
        />
      )
    })}
  </div>
)

/** Faint grid lines that fade out toward the edges. */
export const GridLines: React.FC<{ opacity: number; spacing?: number; offset?: number }> = ({
  opacity,
  spacing = 90,
  offset = 0,
}) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      opacity,
      backgroundImage: `linear-gradient(rgba(250,250,249,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(250,250,249,0.07) 1px, transparent 1px)`,
      backgroundSize: `${spacing}px ${spacing}px`,
      backgroundPosition: `${offset}px ${offset}px`,
      WebkitMaskImage: 'radial-gradient(ellipse 60% 45% at 50% 45%, #000 0%, transparent 100%)',
      maskImage: 'radial-gradient(ellipse 60% 45% at 50% 45%, #000 0%, transparent 100%)',
    }}
  />
)
