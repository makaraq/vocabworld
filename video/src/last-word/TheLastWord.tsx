import React from 'react'
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from 'remotion'
import { BackgroundMusic, SoundEffects, type SoundCue } from '../components/BackgroundMusic'
import { EndCard } from '../scenes/EndCard'
import { K, SCENE } from './timeline'
import { P, clamp } from './palette'
import { Grain, bladeWord } from './shapes/Street'
import { CafeScene } from './scenes/CafeScene'
import { DoorScene } from './scenes/DoorScene'
import { ForkScene, bladesAt } from './scenes/ForkScene'
import { VistaScene } from './scenes/VistaScene'

// "The Last Word": a traveler lost at a fork in Paris, the word they learned
// that morning, and the way it takes them. 19.5 seconds, 1080 × 1920.
// The street sounds land on the score's beats (src/last-word/timeline.ts).

/** A tick each time a turning blade flips to a new word. */
function signTicks(): number[] {
  const ticks: number[] = []
  for (let f = 1; f <= K.signSettle; f++) {
    const before = bladesAt(f - 1).map(bladeWord)
    const now = bladesAt(f).map(bladeWord)
    if (now.some((w, i) => w !== before[i]) && (ticks.length === 0 || f - ticks[ticks.length - 1] >= 2)) ticks.push(f)
  }
  return ticks
}

const steps = [...K.enterSteps, K.stop, ...K.walkSteps, ...K.vistaSteps, ...K.cafeSteps, K.cafeStop, ...K.doorSteps, K.doorStop]

const SOUND_CUES: SoundCue[] = [
  ...signTicks().map((frame) => ({ frame, src: 'audio/sfx-tick.mp3', volume: 0.22 })),
  { frame: K.signSettle, src: 'audio/sfx-hit.mp3', volume: 0.32 },
  ...steps.map((frame, i) => ({ frame, src: `audio/lw-step-${i % 2 ? 'b' : 'a'}.mp3`, volume: 0.55 })),
  { frame: K.tapPlay, src: 'audio/sfx-tap.mp3', volume: 0.35 },
  { frame: 195, src: 'audio/sfx-select.mp3', volume: 0.3 },
  { frame: 255, src: 'audio/sfx-sweep.mp3', volume: 0.32 },
  { frame: K.bell, src: 'audio/lw-church-bell.mp3', volume: 0.5 },
  ...K.clinks.map((frame) => ({ frame, src: 'audio/lw-clink.mp3', volume: 0.4 })),
  { frame: K.doorStop, src: 'audio/lw-door-bell.mp3', volume: 0.42 },
  { frame: SCENE.end.from + 6, src: 'audio/sfx-shimmer.mp3', volume: 0.3 },
]

/** A dark corner sweeping past close to the lens, hiding the cut to the quai. */
const Wipe: React.FC = () => {
  const frame = useCurrentFrame()
  const [a, b] = K.wipe
  const x = interpolate(frame, [a, b], [-1400, 1080], clamp)
  if (frame < a || frame > b) return null
  return (
    <div style={{ position: 'absolute', top: -40, bottom: -40, left: x, width: 1400 }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(90deg, rgba(36,16,26,0) 0%, ${P.nearShade} 9%, #24101a 50%, ${P.nearShade} 91%, rgba(36,16,26,0) 100%)`,
        }}
      />
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ position: 'absolute', left: 520, top: 420 + i * 460, width: 200, height: 300, background: i === 1 ? P.glassLit : P.glassDark, opacity: 0.9 }} />
      ))}
    </div>
  )
}

export const TheLastWord: React.FC = () => {
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill style={{ background: P.skyTop }}>
      <Sequence from={0} durationInFrames={SCENE.vista.from} name="Fork">
        <ForkScene />
      </Sequence>
      <Sequence from={SCENE.vista.from} durationInFrames={SCENE.vista.durationInFrames} name="Vista">
        <VistaScene />
      </Sequence>
      <Sequence from={SCENE.cafe.from} durationInFrames={SCENE.cafe.durationInFrames} name="Café">
        <CafeScene />
      </Sequence>
      <Sequence from={SCENE.door.from} durationInFrames={SCENE.door.durationInFrames} name="Door">
        <DoorScene />
      </Sequence>
      <Wipe />
      {frame < SCENE.end.from + 12 && <Grain frame={frame} />}
      <Sequence from={SCENE.end.from} durationInFrames={SCENE.end.durationInFrames} name="End card">
        <EndCard line="Learn the words you’ll actually use." />
      </Sequence>
      <BackgroundMusic src="audio/last-word-score.mp3" volume={0.5} fadeInFrames={2} fadeOutFrames={40} />
      <SoundEffects cues={SOUND_CUES} />
    </AbsoluteFill>
  )
}
