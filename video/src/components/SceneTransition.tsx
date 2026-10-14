import React from 'react'
import { AbsoluteFill, interpolate, spring } from 'remotion'
import type { TransitionPresentation, TransitionPresentationComponentProps } from '@remotion/transitions'
import type { TransitionKind } from '../timeline'

// One motion language for the whole film.
//
// Between scenes (a TransitionSeries presentation): the outgoing scene eases
// to 0.95 and fades while the incoming one grows from 0.95 and fades in.
// Two accents on the same base: a band of amber light that sweeps across as
// the next scene arrives, and a push through the frame for the move from the
// topic grid into the globe.

type Props = { kind: TransitionKind }

const SceneTransitionPresentation: React.FC<TransitionPresentationComponentProps<Props>> = ({
  children,
  presentationDirection,
  presentationProgress: p,
  passedProps: { kind },
}) => {
  const entering = presentationDirection === 'entering'
  let style: React.CSSProperties
  if (kind === 'zoom-through') {
    style = entering
      ? { opacity: p, transform: `scale(${1.06 - 0.06 * p})` }
      : { opacity: 1 - p ** 1.6, transform: `scale(${1 + 0.4 * p})` }
  } else {
    style = entering
      ? { opacity: p, transform: `scale(${0.95 + 0.05 * p})` }
      : { opacity: 1 - p, transform: `scale(${1 - 0.05 * p})` }
  }
  return (
    <AbsoluteFill style={style}>
      {children}
      {entering && kind === 'light-sweep' && <LightSweep p={p} />}
    </AbsoluteFill>
  )
}

/** A soft diagonal band of amber light crossing the frame, 0 → 1. */
export const LightSweep: React.FC<{ p: number }> = ({ p }) => {
  const x = interpolate(p, [0, 1], [-60, 160])
  const strength = Math.sin(Math.PI * Math.min(1, Math.max(0, p)))
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        mixBlendMode: 'screen',
        opacity: strength,
        background: `linear-gradient(105deg, transparent ${x - 28}%, rgba(245,158,11,0.10) ${x - 14}%, rgba(255,236,200,0.38) ${x}%, rgba(245,158,11,0.10) ${
          x + 10
        }%, transparent ${x + 22}%)`,
      }}
    />
  )
}

export const sceneTransition = (kind: TransitionKind): TransitionPresentation<Props> => ({
  component: SceneTransitionPresentation,
  props: { kind },
})

/**
 * Within a scene: an element arriving on the same spring, rising a little
 * as it fades in. Text lines use it 3–6 frames apart.
 */
export function rise(
  frame: number,
  fps: number,
  delay: number,
  { distance = 28, scaleFrom = 1, damping = 200 }: { distance?: number; scaleFrom?: number; damping?: number } = {},
): React.CSSProperties {
  const s = spring({ frame: frame - delay, fps, config: { damping, mass: 0.9 } })
  return {
    opacity: s,
    transform: `translateY(${(1 - s) * distance}px) scale(${scaleFrom + (1 - scaleFrom) * s})`,
  }
}
