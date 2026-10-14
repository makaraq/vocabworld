import React from 'react'
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { GlobeAnimation } from '../components/GlobeAnimation'
import { LanguageChip } from '../components/LanguageChip'
import { ParticleField } from '../components/ParticleField'
import { GLOBE_LANGUAGES } from '../data/languages'
import { LANGUAGE_CODES } from '../app-ui/app-data'
import { COLOR, FONT } from '../theme'
import { Headline, Stage, Subtitle, clamp01 } from './shared'

// Scene 5 — One App, Many Languages (540–659).
// A large globe of letter tiles turns slowly; language names, each in its
// own script, orbit it at different depths; amber light runs round the rim;
// the camera eases in.

const CX = 540
const CY = 1090
const R = 330

export const S5Languages: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const push = interpolate(frame, [0, 134], [1, 1.12])
  const globeIn = spring({ frame, fps, config: { damping: 200, mass: 1.2 } })
  const rim = frame * 0.05

  // Three rings of labels at different heights, each turning at its own pace.
  const rings = [
    { dy: -300, rx: 420, ry: 70, speed: 0.012 },
    { dy: 0, rx: 440, ry: 90, speed: -0.009 },
    { dy: 300, rx: 410, ry: 70, speed: 0.011 },
  ]
  const labels = GLOBE_LANGUAGES.map((lang, i) => {
    const ring = rings[i % 3]
    const slot = Math.floor(i / 3)
    const perRing = Math.ceil(GLOBE_LANGUAGES.length / 3)
    const a = (slot / perRing) * Math.PI * 2 + (i % 3) * 0.55 + frame * ring.speed
    const depth = (Math.sin(a) + 1) / 2 // 1 = in front of the globe
    return {
      lang,
      x: CX + Math.cos(a) * ring.rx,
      y: CY + ring.dy + Math.sin(a) * ring.ry,
      depth,
      appear: clamp01(spring({ frame: frame - 10 - i * 2.5, fps, config: { damping: 200 } })),
    }
  })

  const renderLabel = (l: (typeof labels)[number]) => (
    <div
      key={l.lang.name}
      style={{
        position: 'absolute',
        left: l.x,
        top: l.y,
        transform: `translate(-50%, -50%) scale(${(0.62 + 0.38 * l.depth) * (0.9 + 0.1 * l.appear)})`,
        opacity: l.appear * (0.25 + 0.75 * l.depth ** 1.4),
        filter: l.depth < 0.35 ? 'blur(1.2px)' : undefined,
      }}
    >
      <LanguageChip label={l.lang.name} code={l.lang.code} fontSize={30} active={l.lang.code === 'fr' ? 1 : 0} />
    </div>
  )

  return (
    <Stage glow={[{ x: CX, y: CY, size: 1500, strength: 0.9 }]}>
      <ParticleField frame={frame + 900} count={40} seed="s5" opacity={0.8} />
      <Headline lines={['One world.', 'Many ways to speak.']} frame={frame} fps={fps} delay={4} top={110} size={100} />
      <Subtitle
        text={'Explore languages and build your vocabulary,\none word at a time.'}
        frame={frame}
        fps={fps}
        delay={14}
        top={330}
        size={32}
      />

      <div style={{ position: 'absolute', inset: 0, transform: `scale(${push})`, transformOrigin: `${CX}px ${CY}px` }}>
        {labels.filter((l) => l.depth < 0.5).map(renderLabel)}

        <div
          style={{
            position: 'absolute',
            left: CX - R * 1.3,
            top: CY - R * 1.3,
            transform: `scale(${0.9 + 0.1 * globeIn})`,
            opacity: globeIn,
          }}
        >
          <GlobeAnimation frame={frame + 120} radius={R} count={96} spin={0.008} tiles orbits={0.85} grid={0.7} fontSize={34} seed="s5" />
        </div>

        {/* Amber light running round the circumference */}
        <div
          style={{
            position: 'absolute',
            left: CX - R * 1.12,
            top: CY - R * 1.12,
            width: R * 2.24,
            height: R * 2.24,
            borderRadius: '50%',
            padding: 3,
            background: `conic-gradient(from ${rim}rad, transparent 0deg, rgba(245,158,11,0) 200deg, rgba(251,191,36,0.9) 300deg, rgba(255,240,210,1) 318deg, transparent 330deg)`,
            WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            filter: 'drop-shadow(0 0 10px rgba(245,158,11,0.8))',
            opacity: globeIn,
          }}
        />

        {labels.filter((l) => l.depth >= 0.5).map(renderLabel)}
      </div>

      <div
        style={{
          position: 'absolute',
          top: 1736,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: FONT.mono,
          fontSize: 26,
          letterSpacing: '0.2em',
          color: COLOR.text2,
          opacity: interpolate(frame, [40, 56], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}
      >
        <span style={{ color: COLOR.amberSoft }}>{LANGUAGE_CODES.length}</span> LANGUAGES · ONE APP
      </div>
    </Stage>
  )
}
