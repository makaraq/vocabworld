import React from 'react'
import { AbsoluteFill } from 'remotion'
import { TransitionSeries, springTiming } from '@remotion/transitions'
import { BackgroundMusic, SoundEffects, type SoundCue } from './components/BackgroundMusic'
import { sceneTransition } from './components/SceneTransition'
import { SCENES, sceneStart, type SceneId } from './timeline'
import { COLOR } from './theme'
import { S1World } from './scenes/S1World'
import { S2Meet } from './scenes/S2Meet'
import { S3Hear } from './scenes/S3Hear'
import { S4Topics } from './scenes/S4Topics'
import { S5Languages } from './scenes/S5Languages'
import { S6Habit } from './scenes/S6Habit'
import { S7Life } from './scenes/S7Life'
import { S8Discover } from './scenes/S8Discover'

// SprindLaunch: the 37-second launch film, 1080 × 1920 at 30fps.
//
// Scenes play in their windows from src/timeline.ts. Each scene's sequence
// runs on past its window by its exit transition, which overlaps the start
// of the next window, so every scene still begins exactly on its frame and
// the whole film is exactly 1,110 frames.

const SCENE_COMPONENTS: Record<SceneId, React.FC> = {
  world: S1World,
  meet: S2Meet,
  hear: S3Hear,
  topics: S4Topics,
  languages: S5Languages,
  habit: S6Habit,
  life: S7Life,
  discover: S8Discover,
}

// Interface sounds, used sparingly: the light sweep, two taps, the move
// into the globe, and the mark arriving.
const SOUND_CUES: SoundCue[] = [
  { frame: sceneStart('meet') - 6, src: 'audio/sfx-sweep.mp3', volume: 0.32 },
  { frame: sceneStart('meet') + 50, src: 'audio/sfx-tap.mp3', volume: 0.45 },
  { frame: sceneStart('hear') + 8, src: 'audio/sfx-tap.mp3', volume: 0.45 },
  { frame: sceneStart('topics') + 54, src: 'audio/sfx-select.mp3', volume: 0.3 },
  { frame: sceneStart('languages') - 8, src: 'audio/sfx-sweep.mp3', volume: 0.26 },
  { frame: sceneStart('discover') + 54, src: 'audio/sfx-shimmer.mp3', volume: 0.32 },
]

export const SprindLaunch: React.FC = () => (
  <AbsoluteFill style={{ background: COLOR.bg }}>
    <TransitionSeries>
      {SCENES.flatMap((scene) => {
        const Scene = SCENE_COMPONENTS[scene.id]
        const exit = scene.exit
        const items = [
          <TransitionSeries.Sequence
            key={scene.id}
            name={scene.id}
            durationInFrames={scene.durationInFrames + (exit?.durationInFrames ?? 0)}
          >
            <Scene />
          </TransitionSeries.Sequence>,
        ]
        if (exit) {
          items.push(
            <TransitionSeries.Transition
              key={`${scene.id}-exit`}
              presentation={sceneTransition(exit.kind)}
              timing={springTiming({ config: { damping: 200 }, durationInFrames: exit.durationInFrames })}
            />,
          )
        }
        return items
      })}
    </TransitionSeries>
    <BackgroundMusic />
    <SoundEffects cues={SOUND_CUES} />
  </AbsoluteFill>
)
