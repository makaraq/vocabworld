import React from 'react'
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from 'remotion'
import { BackgroundMusic, SoundEffects, type SoundCue } from './components/BackgroundMusic'
import { AppDemo } from './scenes/AppDemo'
import { EndCard } from './scenes/EndCard'
import { Hook } from './scenes/Hook'
import { DEMO, END, HOOK, HOOK_FLIPS, HOOK_LAND, T } from './timeline'
import { COLOR } from './theme'

// SprindLaunch: the 30-second launch film, 1080 × 1920 at 30fps.
// Three sequences on explicit frames (src/timeline.ts): the hook, the app
// as one continuous session, the end card. The hook sits on top of the app
// and fades to reveal it; the end card fades in over the app's last frames.

const tap = (frame: number, volume = 0.32): SoundCue => ({ frame, src: 'audio/sfx-tap.mp3', volume })

const SOUND_CUES: SoundCue[] = [
  // The hook: a tick per word, a hit as "bonjour" lands, air into the app.
  ...HOOK_FLIPS.slice(0, -1).map((frame) => ({ frame, src: 'audio/sfx-tick.mp3', volume: 0.3 })),
  { frame: HOOK_LAND, src: 'audio/sfx-hit.mp3', volume: 0.5 },
  { frame: HOOK.durationInFrames - 12, src: 'audio/sfx-sweep.mp3', volume: 0.3 },
  // The app, tap by tap.
  tap(T.tapFrench),
  tap(T.tapDirections),
  tap(T.tapPlay),
  tap(T.tapStop),
  tap(T.tapGear),
  tap(T.tapSlow),
  tap(T.tapFast),
  tap(T.tapDone, 0.24),
  ...T.tapPrev.map((frame) => tap(frame, 0.22)),
  tap(T.longPress, 0.24),
  tap(T.tapNext, 0.24),
  tap(T.tapAdd),
  tap(T.tapRow),
  { frame: T.added, src: 'audio/sfx-select.mp3', volume: 0.3 },
  { frame: T.complete, src: 'audio/sfx-shimmer.mp3', volume: 0.34 },
  tap(T.tapLeaderboard),
  { frame: END.from + 6, src: 'audio/sfx-shimmer.mp3', volume: 0.3 },
]

export const SprindLaunch: React.FC = () => {
  const frame = useCurrentFrame()
  const hookOpacity = interpolate(frame, [HOOK.durationInFrames - 6, HOOK.durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  return (
    <AbsoluteFill style={{ background: COLOR.bg }}>
      <Sequence from={DEMO.from} durationInFrames={DEMO.durationInFrames} name="The app">
        <AppDemo />
      </Sequence>
      <Sequence from={HOOK.from} durationInFrames={HOOK.durationInFrames} name="Hook">
        <AbsoluteFill style={{ opacity: hookOpacity }}>
          <Hook />
        </AbsoluteFill>
      </Sequence>
      <Sequence from={END.from} durationInFrames={END.durationInFrames} name="End card">
        <EndCard />
      </Sequence>
      <BackgroundMusic />
      <SoundEffects cues={SOUND_CUES} />
    </AbsoluteFill>
  )
}
