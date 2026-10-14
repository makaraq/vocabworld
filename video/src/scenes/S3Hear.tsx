import React from 'react'
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { AppScreen } from '../app-ui/AppScreen'
import { LearningView } from '../app-ui/LearningView'
import { topicById, topicWords, wordIndex } from '../app-ui/app-data'
import { pulseOpacity } from '../app-ui/motion'
import { AudioWaveform, speechLevel } from '../components/AudioWaveform'
import { COLOR, FONT } from '../theme'
import { Headline, PhoneOnStage, Stage, Subtitle, autoplayAt, autoplayIntervals, cardScale, clamp01 } from './shared'

// Scene 3 — Hear Every Word (240–389).
// The Greetings topic, resumed at its polite expressions. Play is tapped and
// autoplay runs as the app runs it: the French card swells while its audio
// plays, then the English card, a short pause, the next word. The counter
// and progress bar move on with each word.

const TAP = 8
const AUTOPLAY = { start: 16, training: 12, main: 9, pause: 5 }
const FIRST_WORD = 'please'

export const S3Hear: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const words = topicWords(1)
  const first = wordIndex(1, FIRST_WORD)
  const play = autoplayAt(frame, AUTOPLAY)
  const index = Math.min(words.length - 1, first + play.word)
  const playing = frame >= AUTOPLAY.start - 2
  const { target, native } = autoplayIntervals(AUTOPLAY, 8)

  const press = interpolate(frame, [TAP, TAP + 3, TAP + 7, TAP + 11], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const level =
    play.step === 'training'
      ? speechLevel(play.stepFrame, AUTOPLAY.training)
      : play.step === 'main'
      ? 0.85 * speechLevel(play.stepFrame, AUTOPLAY.main)
      : 0
  const per = AUTOPLAY.training + AUTOPLAY.main + AUTOPLAY.pause
  const phoneIn = spring({ frame, fps, config: { damping: 200 } })

  return (
    <Stage glow={[{ x: 540, y: 1000, size: 1500, strength: 0.75 }]}>
      <Headline lines={['Hear every word.']} frame={frame} fps={fps} delay={2} top={128} size={104} />
      <Subtitle
        text="Each word in French, then in English. Hands-free."
        frame={frame}
        fps={fps}
        delay={8}
        top={262}
      />

      <PhoneOnStage top={392} scale={1.2 * (0.97 + 0.03 * phoneIn)}>
        <AppScreen>
          <LearningView
            topic={topicById(1)}
            word={words[index]}
            index={index}
            total={words.length}
            targetLanguage="French"
            nativeLanguage="English"
            audioStep={frame < AUTOPLAY.start ? 'idle' : play.step}
            playing={playing}
            cardScale={[cardScale(frame, target), cardScale(frame, native)]}
            pulse={pulseOpacity(frame, fps)}
            playPress={press}
            playTouch={clamp01((frame - TAP) / 16)}
            wordOpacity={frame < AUTOPLAY.start ? 1 : clamp01(play.wordFrame / 3)}
          />
        </AppScreen>
      </PhoneOnStage>

      <div style={{ position: 'absolute', top: 1640, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <AudioWaveform
          frame={frame}
          width={760}
          height={112}
          bars={64}
          level={level}
          progress={frame < AUTOPLAY.start ? 0 : play.wordFrame / per}
          seed="s3"
        />
      </div>
      <div
        style={{
          position: 'absolute',
          top: 1784,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: FONT.mono,
          fontSize: 24,
          letterSpacing: '0.16em',
          color: COLOR.text2,
          opacity: interpolate(frame, [AUTOPLAY.start, AUTOPLAY.start + 10], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        AUTOPLAY · FR → EN · <span style={{ color: COLOR.amberSoft }}>1.0×</span>
      </div>
    </Stage>
  )
}
