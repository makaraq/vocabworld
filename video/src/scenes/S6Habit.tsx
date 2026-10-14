import React from 'react'
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { AppScreen } from '../app-ui/AppScreen'
import { TopicMenu } from '../app-ui/TopicMenu'
import { sectionIndex } from '../app-ui/app-data'
import { ProgressDashboard } from '../components/ProgressDashboard'
import { rise } from '../components/SceneTransition'
import { ACCOUNT_SAMPLE, WEEK_SAMPLE } from '../data/sample'
import { Headline, PhoneOnStage, Stage, clamp01 } from './shared'

// Scene 6 — Make It a Habit (660–779).
// The ACCOUNT page of the topic menu: language progress, words learned,
// the day streak, today's words, review and badges, counting up from zero.
// The camera starts close on the progress card and pulls back to the whole
// phone; underneath, the week lights up day by day.

export const S6Habit: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const pull = spring({ frame: frame - 4, fps, config: { damping: 200, mass: 2.2 } })
  const count = interpolate(frame, [8, 46], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  })
  const n = (v: number) => Math.round(v * count)

  const account = {
    ...ACCOUNT_SAMPLE,
    percentage: ACCOUNT_SAMPLE.percentage * count,
    wordsLearned: n(ACCOUNT_SAMPLE.wordsLearned),
    streak: n(ACCOUNT_SAMPLE.streak),
    wordsToday: n(ACCOUNT_SAMPLE.wordsToday),
    dueCount: n(ACCOUNT_SAMPLE.dueCount),
    badgesUnlocked: n(ACCOUNT_SAMPLE.badgesUnlocked),
  }

  return (
    <Stage glow={[{ x: 540, y: 900, size: 1500, strength: 0.75 }]}>
      <Headline lines={['A little every day', 'adds up.']} frame={frame} fps={fps} delay={2} top={104} size={100} />

      <PhoneOnStage top={330} scale={1.04 + 0.74 * (1 - pull)} origin="50% 3%">
        <AppScreen>
          <TopicMenu
            section={sectionIndex('ACCOUNT')}
            iconTime={frame / fps}
            account={account}
            nativeLanguage="English"
            targetLanguage="French"
          />
        </AppScreen>
      </PhoneOnStage>

      <div style={{ position: 'absolute', top: 1404, left: 0, right: 0, display: 'flex', justifyContent: 'center', ...rise(frame, fps, 30, { distance: 30 }) }}>
        <ProgressDashboard
          week={WEEK_SAMPLE}
          lit={interpolate(frame, [42, 84], [0, 7], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
          bars={clamp01(spring({ frame: frame - 36, fps, config: { damping: 200 } }))}
          streak={clamp01(spring({ frame: frame - 82, fps, config: { damping: 200 } }))}
        />
      </div>
    </Stage>
  )
}
