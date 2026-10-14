import React from 'react'
import { Audio, Sequence, interpolate, staticFile, useVideoConfig } from 'remotion'

// The score and its volume automation: up from silence over the first
// second, steady at about 40%, down to nothing over the last two seconds.
// The track is original, synthesised by scripts/compose-audio.py.

export const BackgroundMusic: React.FC<{
  src?: string
  volume?: number
  fadeInFrames?: number
  fadeOutFrames?: number
}> = ({ src = 'audio/sprind-theme.mp3', volume = 0.4, fadeInFrames = 30, fadeOutFrames = 60 }) => {
  const { durationInFrames } = useVideoConfig()
  return (
    <Audio
      src={staticFile(src)}
      volume={(f) =>
        interpolate(f, [0, fadeInFrames, durationInFrames - fadeOutFrames, durationInFrames], [0, volume, volume, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      }
    />
  )
}

export interface SoundCue {
  frame: number
  src: string
  volume: number
}

/** Interface sounds, each starting on its frame. */
export const SoundEffects: React.FC<{ cues: SoundCue[] }> = ({ cues }) => (
  <>
    {cues.map((cue, i) => (
      <Sequence key={i} from={cue.frame} layout="none" name={`sfx ${cue.src}`}>
        <Audio src={staticFile(cue.src)} volume={cue.volume} />
      </Sequence>
    ))}
  </>
)
