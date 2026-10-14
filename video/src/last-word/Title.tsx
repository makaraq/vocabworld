import React from 'react'
import { interpolate, spring } from 'remotion'
import { FONT } from '../theme'
import { P, clamp } from './palette'

/** A caption over the film: white, with one phrase in amber. */
export const Title: React.FC<{
  frame: number
  fps: number
  from: number
  to: number
  text: string
  accent?: string
  top: number
  size: number
}> = ({ frame, fps, from, to, text, accent, top, size }) => {
  if (frame < from || frame >= to) return null
  const enter = spring({ frame: frame - from, fps, config: { damping: 14, stiffness: 180 } })
  const exit = interpolate(frame, [to - 6, to], [1, 0], clamp)
  const i = accent ? text.indexOf(accent) : -1
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: 40,
        right: 40,
        textAlign: 'center',
        fontFamily: FONT.display,
        fontWeight: 700,
        fontSize: size,
        lineHeight: 1.05,
        letterSpacing: '-0.035em',
        color: '#fff',
        textShadow: '0 6px 36px rgba(20,6,10,0.55)',
        opacity: Math.min(1, enter * 1.5) * exit,
        transform: `translateY(${(1 - enter) * 30}px) scale(${1.12 - 0.12 * enter})`,
      }}
    >
      {i < 0 ? (
        text
      ) : (
        <>
          {text.slice(0, i)}
          <span style={{ color: P.amberSoft }}>{accent}</span>
          {text.slice(i + accent!.length)}
        </>
      )}
    </div>
  )
}
