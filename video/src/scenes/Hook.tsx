import React from 'react'
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { AppIcon } from '../app-ui/icons'
import { flagIcon } from '../app-ui/app-data'
import { HELLO_WORDS } from '../data/demo'
import { HOOK_FLIPS, HOOK_LAND } from '../timeline'
import { COLOR, FONT } from '../theme'

// The first three seconds have to stop a thumb. Full-bleed, on the app's own
// warm backdrop: "hello" flips through twelve languages, faster and faster,
// each with its flag, and lands hard on "bonjour" — the word the app teaches
// first in French.

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

export const Hook: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const current = HOOK_FLIPS.reduce((acc, start, i) => (frame >= start ? i : acc), 0)
  const word = HELLO_WORDS[current]
  const since = frame - HOOK_FLIPS[current]
  const landed = frame >= HOOK_LAND

  // Each flip lands with a small punch; "bonjour" with a big one.
  const punch = landed
    ? 1 + 0.28 * Math.exp(-since / 3.2) * Math.cos(since * 0.5)
    : interpolate(since, [0, 3], [1.09, 1], clamp)
  const flash = landed ? interpolate(since, [0, 7], [0.45, 0], clamp) : 0
  const tagline = spring({ frame: frame - HOOK_LAND - 6, fps, config: { damping: 14, stiffness: 160 } })
  const zoom = interpolate(frame, [0, 102], [1.18, 1.03])
  // The words leave first; then the backdrop dissolves into the phone's own.
  const text = interpolate(frame, [90, 96], [1, 0], clamp)

  // Long words step down so every one fits the width.
  const length = [...word.word].length
  const cjk = /[぀-ヿ一-鿿가-힯]/.test(word.word)
  const size = cjk ? Math.min(210, 900 / length) : Math.min(230, 1500 / Math.max(4, length))

  return (
    <AbsoluteFill style={{ background: COLOR.bg, overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
        <Img src={staticFile('app/bg.jpeg')} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '62% 50%' }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.35) 100%)' }} />

      <AbsoluteFill style={{ opacity: text }}>
      <div
        style={{
          position: 'absolute',
          top: 230,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: FONT.display,
          fontWeight: 700,
          fontSize: 76,
          lineHeight: 1,
          letterSpacing: '-0.03em',
          color: '#fff',
          textShadow: '0 4px 30px rgba(0,0,0,0.35)',
        }}
      >
        <span style={{ opacity: landed ? 1 : 0.92 }}>{landed ? '50 languages.' : 'How do you say'}</span>
      </div>

      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `scale(${punch})` }}>
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              overflow: 'hidden',
              boxShadow: '0 12px 40px rgba(0,0,0,0.35), 0 0 0 4px rgba(255,255,255,0.85)',
              marginBottom: 40,
            }}
          >
            <AppIcon icon={flagIcon(word.code)} width={120} height={120} />
          </div>
          <div
            style={{
              fontFamily: FONT.display,
              fontWeight: 700,
              fontSize: size,
              lineHeight: 1.05,
              letterSpacing: cjk ? 0 : '-0.04em',
              color: '#fff',
              textShadow: '0 6px 40px rgba(0,0,0,0.35)',
              whiteSpace: 'nowrap',
            }}
          >
            {word.word}
          </div>
          <div
            style={{
              marginTop: 26,
              fontFamily: FONT.display,
              fontWeight: 600,
              fontSize: 36,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.8)',
            }}
          >
            {word.language}
          </div>
        </div>
      </AbsoluteFill>

      {landed && (
        <div
          style={{
            position: 'absolute',
            top: 1450,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            opacity: Math.min(1, tagline * 1.4),
            transform: `translateY(${(1 - tagline) * 30}px)`,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 22,
              padding: '18px 34px 18px 18px',
              borderRadius: 9999,
              background: 'rgba(12,10,9,0.55)',
              border: '1px solid rgba(255,255,255,0.25)',
              boxShadow: '0 18px 50px rgba(0,0,0,0.3)',
              backdropFilter: 'blur(14px)',
            }}
          >
            <Img src={staticFile('app/app-icon.png')} style={{ width: 72, height: 72, borderRadius: 16 }} />
            <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 46, color: '#fff', letterSpacing: '-0.02em' }}>
              One app. Start with one word.
            </span>
          </div>
        </div>
      )}
      </AbsoluteFill>

      <AbsoluteFill style={{ background: '#fff', opacity: flash, pointerEvents: 'none' }} />
    </AbsoluteFill>
  )
}
