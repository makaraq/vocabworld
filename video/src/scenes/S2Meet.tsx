import React from 'react'
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { AppScreen, dipStyle } from '../app-ui/AppScreen'
import { LanguagePicker } from '../app-ui/LanguagePicker'
import { TopicMenu } from '../app-ui/TopicMenu'
import { sectionIndex, topicWords } from '../app-ui/app-data'
import { pulseOpacity } from '../app-ui/motion'
import { AudioWaveform, speechLevel } from '../components/AudioWaveform'
import { VocabularyCard } from '../components/VocabularyCard'
import { ACCOUNT_SAMPLE } from '../data/sample'
import { Headline, PhoneOnStage, Stage, Subtitle, cardScale, clamp01 } from './shared'

// Scene 2 — Meet Sprind (120–239).
// The headline, then the app: the "I want to learn" page with English as the
// main language. French is tapped; the page dips and hands over to the topic
// menu, as handleLanguageSelect does. The first Greetings word rises out in
// front, playing: "bonjour", "hello".

const TAP = 50 // finger lands on French
const RELEASE = 62 // handleLanguageSelect: the page starts to dip
const SWAP = RELEASE + 6 // 200ms later the topic menu replaces it
const CARD_IN = 70
const PLAY_TARGET = 84
const PLAY_NATIVE = 104

export const S2Meet: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const phoneIn = spring({ frame: frame - 6, fps, config: { damping: 200 } })
  const cardIn = spring({ frame: frame - CARD_IN, fps, config: { damping: 18, mass: 0.9, stiffness: 120 } })
  const settle = clamp01(cardIn)

  const holding = frame >= TAP + 2 && frame < RELEASE ? clamp01((frame - TAP - 2) / 3) : frame >= RELEASE ? clamp01(1 - (frame - RELEASE) / 4) : 0
  const focus = interpolate(frame, [TAP, TAP + 8, SWAP], [0, 1, 0.9], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const dip = frame >= RELEASE && frame < SWAP ? (frame - RELEASE) / (SWAP - RELEASE) : 0

  const bonjour = topicWords(1)[0]
  const intervals = { target: [[PLAY_TARGET, PLAY_NATIVE]] as [number, number][], native: [[PLAY_NATIVE, 200]] as [number, number][] }
  const step = frame >= PLAY_NATIVE ? 'main' : frame >= PLAY_TARGET ? 'training' : 'idle'
  const level =
    step === 'training' ? speechLevel(frame - PLAY_TARGET, 16) : step === 'main' ? speechLevel(frame - PLAY_NATIVE, 12) : 0

  return (
    <Stage glow={[{ x: 540, y: 1100, size: 1500, strength: 0.8 }]}>
      <Headline lines={['Learn words.', 'Open worlds.']} frame={frame} fps={fps} delay={4} top={150} size={116} />
      <Subtitle text="Your everyday companion for learning languages." frame={frame} fps={fps} delay={16} top={410} />

      <PhoneOnStage
        top={520}
        scale={1.2 * (0.94 + 0.06 * phoneIn) * (1 - 0.04 * settle)}
        opacity={phoneIn * (1 - 0.5 * settle)}
      >
        <AppScreen transitioning={dip > 0}>
          {frame < SWAP ? (
            <LanguagePicker
              question="I want to learn"
              exclude="en"
              holding={{ code: 'fr', press: holding, touch: clamp01((frame - TAP) / 14), focus }}
              contentStyle={dipStyle(dip)}
            />
          ) : (
            <TopicMenu
              section={sectionIndex('FIRST AID KIT')}
              account={ACCOUNT_SAMPLE}
              nativeLanguage="English"
              targetLanguage="French"
            />
          )}
        </AppScreen>
      </PhoneOnStage>

      {frame >= CARD_IN - 2 && (
        <div
          style={{
            position: 'absolute',
            left: 540 - 220,
            top: 1150,
            transformOrigin: 'center top',
            transform: `translateY(${(1 - cardIn) * 420}px) scale(1.72)`,
            opacity: clamp01(cardIn * 1.4),
          }}
        >
          <VocabularyCard
            word={bonjour}
            targetLanguage="French"
            nativeLanguage="English"
            audioStep={step}
            cardScale={[cardScale(frame, intervals.target), cardScale(frame, intervals.native)]}
            pulse={pulseOpacity(frame, fps)}
          />
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          left: 540 - 170,
          top: 1806,
          opacity: interpolate(frame, [PLAY_TARGET - 6, PLAY_TARGET], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}
      >
        <AudioWaveform frame={frame} width={340} height={64} bars={34} level={level} seed="s2" />
      </div>
    </Stage>
  )
}
