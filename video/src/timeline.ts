import { VIDEO } from './theme'

// The film's timeline. Each scene owns an explicit window on the master
// timeline; a transition overlaps the first frames of the next scene's
// window, so each scene starts exactly at `from` and the cut lands on time.

export type SceneId =
  | 'world'
  | 'meet'
  | 'hear'
  | 'topics'
  | 'languages'
  | 'habit'
  | 'life'
  | 'discover'

export type TransitionKind = 'fade-scale' | 'light-sweep' | 'zoom-through'

export interface SceneSlot {
  id: SceneId
  from: number
  durationInFrames: number
  /** How the film leaves this scene for the next one. */
  exit?: { kind: TransitionKind; durationInFrames: number }
}

export const SCENES: SceneSlot[] = [
  { id: 'world', from: 0, durationInFrames: 120, exit: { kind: 'light-sweep', durationInFrames: 18 } },
  { id: 'meet', from: 120, durationInFrames: 120, exit: { kind: 'fade-scale', durationInFrames: 14 } },
  { id: 'hear', from: 240, durationInFrames: 150, exit: { kind: 'fade-scale', durationInFrames: 14 } },
  { id: 'topics', from: 390, durationInFrames: 150, exit: { kind: 'zoom-through', durationInFrames: 16 } },
  { id: 'languages', from: 540, durationInFrames: 120, exit: { kind: 'fade-scale', durationInFrames: 14 } },
  { id: 'habit', from: 660, durationInFrames: 120, exit: { kind: 'fade-scale', durationInFrames: 14 } },
  { id: 'life', from: 780, durationInFrames: 150, exit: { kind: 'light-sweep', durationInFrames: 18 } },
  { id: 'discover', from: 930, durationInFrames: 180 },
]

// The windows must tile the timeline exactly: no gaps, no overlaps, 1,110 frames.
SCENES.forEach((scene, i) => {
  const expected = i === 0 ? 0 : SCENES[i - 1].from + SCENES[i - 1].durationInFrames
  if (scene.from !== expected) throw new Error(`Scene ${scene.id} starts at ${scene.from}, expected ${expected}`)
})
const end = SCENES[SCENES.length - 1].from + SCENES[SCENES.length - 1].durationInFrames
if (end !== VIDEO.durationInFrames) throw new Error(`Timeline ends at ${end}, expected ${VIDEO.durationInFrames}`)

export const sceneStart = (id: SceneId) => SCENES.find((s) => s.id === id)!.from
