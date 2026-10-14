import React from 'react'
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { FONT } from '../theme'

// The close, on the same warm backdrop the film opened on: the app icon,
// the name, the line from the landing page, and where to get it. The App
// Store badge and sprind.uk are the ones the app itself links to
// (lib/app-store-link.ts, app/layout.tsx).

export const EndCard: React.FC<{ line?: string }> = ({ line: copy = 'Learn the words you actually use.' }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const fade = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' })
  const icon = spring({ frame: frame - 6, fps, config: { damping: 13, stiffness: 120 } })
  const name = spring({ frame: frame - 14, fps, config: { damping: 200 } })
  const line = spring({ frame: frame - 20, fps, config: { damping: 200 } })
  const badge = spring({ frame: frame - 28, fps, config: { damping: 15, stiffness: 140 } })
  const zoom = interpolate(frame, [0, 90], [1.12, 1.02])

  return (
    <AbsoluteFill style={{ opacity: fade, overflow: 'hidden', background: '#000' }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
        <Img src={staticFile('app/bg.jpeg')} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '62% 50%' }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.05) 45%, rgba(0,0,0,0.35) 100%)' }} />

      <AbsoluteFill style={{ alignItems: 'center', paddingTop: 470 }}>
        <Img
          src={staticFile('app/app-icon.png')}
          style={{
            width: 300,
            height: 300,
            borderRadius: 300 * 0.2237,
            boxShadow: '0 40px 90px rgba(120,30,0,0.45), 0 0 0 1px rgba(255,255,255,0.25)',
            transform: `scale(${0.6 + 0.4 * icon})`,
            opacity: Math.min(1, icon * 1.5),
          }}
        />
        <div
          style={{
            marginTop: 60,
            fontFamily: FONT.display,
            fontWeight: 700,
            fontSize: 150,
            lineHeight: 1,
            letterSpacing: '-0.045em',
            color: '#fff',
            textShadow: '0 8px 40px rgba(0,0,0,0.25)',
            opacity: name,
            transform: `translateY(${(1 - name) * 26}px)`,
          }}
        >
          Sprind
        </div>
        <div
          style={{
            marginTop: 30,
            fontFamily: FONT.display,
            fontWeight: 600,
            fontSize: 48,
            letterSpacing: '-0.02em',
            color: 'rgba(255,255,255,0.92)',
            opacity: line,
            transform: `translateY(${(1 - line) * 20}px)`,
          }}
        >
          {copy}
        </div>

        <div
          style={{
            marginTop: 110,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 28,
            opacity: Math.min(1, badge * 1.4),
            transform: `scale(${0.92 + 0.08 * badge})`,
          }}
        >
          <Img src={staticFile('app/app-store-badge.png')} style={{ height: 110 }} />
          <div style={{ fontFamily: FONT.display, fontWeight: 600, fontSize: 32, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.85)' }}>
            sprind.uk · iPhone &amp; iPad
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
