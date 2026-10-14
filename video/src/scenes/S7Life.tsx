import React from 'react'
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { AppScreen } from '../app-ui/AppScreen'
import { LearningView } from '../app-ui/LearningView'
import { topicById, topicWords, wordIndex } from '../app-ui/app-data'
import { pulseOpacity } from '../app-ui/motion'
import { AudioWaveform, speechLevel } from '../components/AudioWaveform'
import { LiquidGlass } from '../components/LiquidGlass'
import { ParticleField } from '../components/ParticleField'
import { rise } from '../components/SceneTransition'
import { COLOR, FONT } from '../theme'
import { Eyebrow, PhoneOnStage, Stage, autoplayAt, autoplayIntervals, cardScale } from './shared'

// Scene 7 — Designed for Real Life (780–929).
// The phone floats on its own, playing the Directions topic at its places
// for transportation — the words for getting around town. Three short
// benefits arrive beside it; light runs along the phone's edges; it turns
// to face the viewer before the close.

const AUTOPLAY = { start: 4, training: 14, main: 11, pause: 8 }
const FIRST_WORD = 'train station'

const stroke = { fill: 'none', stroke: COLOR.amberSoft, strokeWidth: 2.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

const Headphones = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden>
    <path d="M9 30v-6a15 15 0 0 1 30 0v6" {...stroke} />
    <rect x="7" y="28" width="9" height="13" rx="3.5" {...stroke} />
    <rect x="32" y="28" width="9" height="13" rx="3.5" {...stroke} />
  </svg>
)

const Pace = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden>
    <path d="M8 33a17 17 0 1 1 32 0" {...stroke} />
    <path d="M24 31l8-10" {...stroke} />
    <circle cx="24" cy="31" r="2.6" fill={COLOR.amberSoft} />
    <path d="M13 22.5l2.2 1.3M24 15v2.6M35 22.5l-2.2 1.3" {...stroke} />
  </svg>
)

const Discover = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden>
    <circle cx="24" cy="24" r="16" {...stroke} />
    <path d="M30.5 17.5l-3.6 9.4-9.4 3.6 3.6-9.4z" {...stroke} />
    <path d="M24 5v3M24 40v3M5 24h3M40 24h3" {...stroke} />
  </svg>
)

const BENEFITS = [
  { icon: <Headphones />, text: 'Listen anywhere.' },
  { icon: <Pace />, text: 'Learn at your pace.' },
  { icon: <Discover />, text: 'Keep discovering.' },
]

export const S7Life: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const enter = spring({ frame, fps, config: { damping: 16, mass: 1, stiffness: 90 } })
  const face = interpolate(frame, [96, 150], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) })
  const float = Math.sin(frame * 0.06) * 8

  const words = topicWords(4)
  const first = wordIndex(4, FIRST_WORD)
  const play = autoplayAt(frame, AUTOPLAY)
  const index = Math.min(words.length - 1, first + play.word)
  const { target, native } = autoplayIntervals(AUTOPLAY, 6)
  const level =
    play.step === 'training'
      ? speechLevel(play.stepFrame, AUTOPLAY.training)
      : play.step === 'main'
      ? 0.85 * speechLevel(play.stepFrame, AUTOPLAY.main)
      : 0

  return (
    <Stage glow={[{ x: 540, y: 700, size: 1300, strength: 0.85 }]}>
      <ParticleField frame={frame + 1500} count={50} seed="s7" speed={0.5} amberShare={0.85} />
      <Eyebrow text="DESIGNED FOR REAL LIFE" frame={frame} fps={fps} delay={6} top={96} />

      <PhoneOnStage
        top={190 + float + (1 - enter) * 160}
        scale={1.0 + 0.06 * face}
        rotateY={-16 * (1 - face) + 6 * (1 - enter)}
        rotateX={4 * (1 - face)}
        rotateZ={-2.5 * (1 - face)}
        opacity={Math.min(1, enter * 1.5)}
        glare={interpolate(frame, [20, 84], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
        origin="center center"
      >
        <AppScreen>
          <LearningView
            topic={topicById(4)}
            word={words[index]}
            index={index}
            total={words.length}
            targetLanguage="French"
            nativeLanguage="English"
            audioStep={play.step}
            playing
            cardScale={[cardScale(frame, target), cardScale(frame, native)]}
            pulse={pulseOpacity(frame, fps)}
            wordOpacity={Math.min(1, play.wordFrame / 3)}
          />
        </AppScreen>
      </PhoneOnStage>

      <div style={{ position: 'absolute', top: 1214, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: enter }}>
        <AudioWaveform frame={frame} width={560} height={78} bars={48} level={level} seed="s7" />
      </div>

      <div style={{ position: 'absolute', top: 1356, left: 150, right: 110, display: 'flex', flexDirection: 'column', gap: 40 }}>
        {BENEFITS.map((b, i) => (
          <div key={b.text} style={{ display: 'flex', alignItems: 'center', gap: 34, ...rise(frame, fps, 26 + i * 16, { distance: 26 }) }}>
            <LiquidGlass radius={30} fill={0.07} style={{ width: 96, height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {b.icon}
            </LiquidGlass>
            <span style={{ fontFamily: FONT.serif, fontSize: 70, color: COLOR.text, lineHeight: 1 }}>{b.text}</span>
          </div>
        ))}
      </div>
    </Stage>
  )
}
