import React from 'react'
import { Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { GlobeAnimation } from '../components/GlobeAnimation'
import { LiquidGlass } from '../components/LiquidGlass'
import { ParticleField } from '../components/ParticleField'
import { rise } from '../components/SceneTransition'
import { SprindLogo } from '../components/SprindLogo'
import { COLOR, FONT, amber } from '../theme'
import { Stage, clamp01 } from './shared'

// Scene 8 — Discover Sprind (930–1109).
// Letters and light converge into the globe; a clean amber circle draws
// round it; the globe resolves into the app's icon and the wordmark. Two
// lines, the call to action and where to get it. From frame 120 nothing
// moves but the glow, which settles back into the dark.
//
// The App Store link and sprind.uk are the ones the app itself uses
// (lib/app-store-link.ts, app/layout.tsx).

const CX = 540
const CY = 560
const R = 200

export const S8Discover: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const converge = (i: number) => clamp01(spring({ frame: frame - 2 - (i % 30) * 1.1, fps, config: { damping: 200, mass: 1.3 } }))
  const resolve = interpolate(frame, [46, 70], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) })
  const icon = spring({ frame: frame - 54, fps, config: { damping: 200 } })
  const ring = interpolate(frame, [16, 56], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })
  const wordmark = spring({ frame: frame - 66, fps, config: { damping: 200 } })
  const cta = spring({ frame: frame - 106, fps, config: { damping: 14, stiffness: 140, mass: 0.8 } })
  const glow = interpolate(frame, [0, 60, 120, 180], [0.4, 1.1, 1, 0.55], { extrapolateRight: 'clamp' })

  const ringR = R * 1.22
  const circumference = 2 * Math.PI * ringR

  return (
    <Stage glow={[{ x: CX, y: CY, size: 1400, strength: glow }]}>
      <ParticleField frame={frame + 2400} count={36} seed="s8" opacity={interpolate(frame, [0, 60, 120], [1, 0.6, 0.35], { extrapolateRight: 'clamp' })} />

      {/* Lines of light converging on the centre */}
      <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0 }} aria-hidden>
        {Array.from({ length: 10 }, (_, i) => {
          const a = (i / 10) * Math.PI * 2 + 0.3
          const p = clamp01(interpolate(frame, [4 + i * 2, 34 + i * 2], [0, 1], { easing: Easing.in(Easing.cubic) }))
          const far = 1100
          const near = ringR
          const r0 = far - (far - near) * p
          const r1 = r0 + 260 * (1 - p)
          return (
            <line
              key={i}
              x1={CX + Math.cos(a) * r1}
              y1={CY + Math.sin(a) * r1}
              x2={CX + Math.cos(a) * r0}
              y2={CY + Math.sin(a) * r0}
              stroke={COLOR.amberSoft}
              strokeWidth={2}
              strokeLinecap="round"
              opacity={p > 0 && p < 1 ? 0.8 * Math.sin(Math.PI * p) : 0}
            />
          )
        })}
        <circle
          cx={CX}
          cy={CY}
          r={ringR}
          fill="none"
          stroke={amber(0.85)}
          strokeWidth={2}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ring)}
          transform={`rotate(-90 ${CX} ${CY})`}
          style={{ filter: 'drop-shadow(0 0 8px rgba(245,158,11,0.7))' }}
        />
      </svg>

      {/* The globe, assembling then resolving into the mark */}
      <div
        style={{
          position: 'absolute',
          left: CX - R * 1.3,
          top: CY - R * 1.3,
          transform: `scale(${1 - 0.55 * resolve})`,
          opacity: 1 - resolve,
        }}
      >
        <GlobeAnimation frame={frame} radius={R} count={64} spin={0.02} assemble={converge} scatter={2.4} orbits={0} grid={0.5} fontSize={30} seed="s8" />
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: CY - 115,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <SprindLogo
          iconSize={230}
          wordmarkSize={128}
          gap={140}
          iconOpacity={icon}
          wordmarkOpacity={wordmark}
          tracking={0.1 * (1 - wordmark)}
          glow={icon * glow}
          style={{ transform: `scale(${0.7 + 0.3 * icon})`, transformOrigin: '50% 115px' }}
        />
      </div>

      <div style={{ position: 'absolute', top: 1040, left: 0, right: 0, textAlign: 'center' }}>
        <div style={{ fontFamily: FONT.serif, fontSize: 76, color: COLOR.text, lineHeight: 1.1, ...rise(frame, fps, 80, { distance: 24 }) }}>
          The world is full of words.
        </div>
        <div style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 76, color: COLOR.amberSoft, lineHeight: 1.1, ...rise(frame, fps, 86, { distance: 24 }) }}>
          Go discover them.
        </div>
        <div style={{ fontFamily: FONT.ui, fontSize: 32, color: COLOR.text2, marginTop: 30, ...rise(frame, fps, 96, { distance: 16 }) }}>
          Your next language starts with one word.
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 1408,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          opacity: clamp01(cta * 1.6),
          transform: `scale(${0.95 + 0.05 * cta})`,
        }}
      >
        <LiquidGlass
          radius={9999}
          fill={0.06}
          tint="rgba(245,158,11,0.88)"
          style={{
            padding: '30px 74px',
            boxShadow: `0 18px 50px ${amber(0.35)}, 0 0 0 1px rgba(255,236,200,0.35)`,
          }}
        >
          <span style={{ fontFamily: FONT.ui, fontWeight: 600, fontSize: 44, color: COLOR.bg, letterSpacing: '-0.01em' }}>
            Discover Sprind
          </span>
        </LiquidGlass>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 1600,
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 22,
          ...rise(frame, fps, 114, { distance: 14 }),
        }}
      >
        <Img src={staticFile('app/app-store-badge.png')} style={{ height: 86 }} />
        <div style={{ fontFamily: FONT.mono, fontSize: 26, letterSpacing: '0.12em', color: COLOR.text2 }}>
          sprind.uk · iPhone &amp; iPad
        </div>
      </div>
    </Stage>
  )
}
