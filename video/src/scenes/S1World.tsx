import React from 'react'
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { GlobeAnimation } from '../components/GlobeAnimation'
import { GridLines, ParticleField } from '../components/ParticleField'
import { SprindLogo } from '../components/SprindLogo'
import { Stage, clamp01 } from './shared'

// Scene 1 — The World of Words (0–119).
// Near-black, a faint warm glow; letters from many scripts drift in on
// curved paths and settle into a sphere; amber lights orbit it; the wordmark
// arrives beneath.

export const S1World: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const scale = 0.85 + 0.15 * spring({ frame: frame - 4, fps, config: { damping: 200, mass: 1.4 } })
  const glow = interpolate(frame, [0, 70], [0.25, 1], { extrapolateRight: 'clamp' })
  const grid = interpolate(frame, [0, 24, 100, 120], [0, 1, 1, 0.6], { extrapolateRight: 'clamp' })
  const orbits = interpolate(frame, [34, 60], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const wordmark = spring({ frame: frame - 66, fps, config: { damping: 200 } })

  const R = 320
  return (
    <Stage glow={[{ x: 540, y: 820, size: 1300, strength: glow }]}>
      <GridLines opacity={grid * 0.9} offset={frame * 0.2} />
      <ParticleField frame={frame + 400} count={54} seed="s1" opacity={interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' })} />

      <AbsoluteFill>
        <div style={{ position: 'absolute', left: 540 - R * 1.3, top: 820 - R * 1.3, transform: `scale(${scale})` }}>
          <GlobeAnimation
            frame={frame}
            radius={R}
            count={112}
            spin={0.012}
            orbits={orbits}
            grid={interpolate(frame, [20, 60], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
            assemble={(i) =>
              clamp01(
                spring({
                  frame: frame - 6 - (i % 28) * 1.6,
                  fps,
                  config: { damping: 200, mass: 1.2 },
                }),
              )
            }
            scatter={1.1}
            fontSize={36}
          />
        </div>
      </AbsoluteFill>

      <div style={{ position: 'absolute', top: 1270, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <SprindLogo
          showIcon={false}
          wordmarkSize={150}
          wordmarkOpacity={wordmark}
          tracking={0.12 * (1 - wordmark)}
          style={{ transform: `translateY(${(1 - wordmark) * 24}px)` }}
        />
      </div>
    </Stage>
  )
}
