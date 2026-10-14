import React from 'react'
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { AppScreen } from '../../app-ui/AppScreen'
import { LearningView } from '../../app-ui/LearningView'
import { topicById, topicWords } from '../../app-ui/app-data'
import { pulseOpacity } from '../../app-ui/motion'
import { PhoneOnStage, cardScale } from '../../scenes/shared'
import { K } from '../timeline'
import { cameraAt, clamp, type Camera } from '../palette'
import { STAND, mixPose, walkPose, type Pose } from '../shapes/Person'
import type { Blade } from '../shapes/Street'
import { BLADE_Y, ForkWorld, STEP } from './ForkWorld'
import { Title } from '../Title'

// Frames 0–270 of the master: the spinning fingerpost, the pull back to
// the fork, the phone with this morning's word, and the turn to the left.

const IN_OUT = Easing.inOut(Easing.cubic)
const STAND_X = 640

/** A blade spinning down to rest on the settle beat, with a little wobble. */
function yaw(frame: number, turns: number) {
  const settle = K.signSettle
  if (frame < settle) {
    const t = frame / settle
    return turns * Math.PI * Math.pow(1 - t, 3)
  }
  const s = frame - settle
  return 0.28 * Math.exp(-s / 5) * Math.sin(s * 0.95)
}

export function bladesAt(frame: number): Blade[] {
  return [
    { dir: 0, y: BLADE_Y.plate, words: ['tout droit', 'gauche', 'droite'], yaw: yaw(frame, 5) },
    { dir: -1, y: BLADE_Y.left, words: ['gauche', 'droite', 'tout droit'], yaw: yaw(frame, 7) },
    { dir: 1, y: BLADE_Y.right, words: ['droite', 'tout droit', 'gauche'], yaw: yaw(frame, 6) },
  ]
}

function travelerAt(frame: number): { x: number; pose: Pose; facing: number } {
  if (frame < 180) {
    // Walking in from the right, stopping on 90; a look back, then a turn
    // to face the right-hand street.
    const x = STAND_X + (STEP * Math.max(0, K.stop - frame)) / 15
    const walking = walkPose(frame, K.enterSteps[0])
    let pose = mixPose(walking, STAND, interpolate(frame, [K.stop - 2, K.stop + 6], [0, 1], clamp))
    const look = interpolate(frame, [K.lookBack, K.lookBack + 4, K.faceRight, K.faceRight + 6], [1, -1, -1, 1], clamp)
    pose = { ...pose, look }
    const facing = interpolate(frame, [K.faceRight, K.faceRight + 6], [-1, 1], clamp)
    return { x, pose, facing }
  }
  // The turn: face left again, then walk toward the lit street.
  const facing = interpolate(frame, [K.turn, K.turn + 6], [1, -1], clamp)
  const start = K.walkSteps[0]
  const x = STAND_X - (STEP * Math.max(0, frame - (start - 7.5))) / 15
  const pose = mixPose(STAND, walkPose(frame, start), interpolate(frame, [start - 9, start - 3], [0, 1], clamp))
  return { x, pose, facing }
}

function cameraFor(frame: number): Camera {
  if (frame < 180) {
    return cameraAt(
      frame,
      [
        [0, { x: 520, y: 900, zoom: 1.95 }],
        [K.pullBack[0], { x: 520, y: 912, zoom: 1.84 }],
        [K.pullBack[1], { x: 540, y: 1110, zoom: 1.12 }],
        [180, { x: 556, y: 1124, zoom: 1.18 }],
      ],
      IN_OUT,
    )
  }
  // The cut: closer, then following the traveler into the left street.
  return cameraAt(
    frame,
    [
      [180, { x: 505, y: 1200, zoom: 1.34 }],
      [200, { x: 495, y: 1195, zoom: 1.36 }],
      [270, { x: 330, y: 1160, zoom: 1.62 }],
    ],
    IN_OUT,
  )
}

const directions = topicById(4)
const directionsWords = topicWords(4)

export const ForkScene: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const cam = cameraFor(frame)
  const traveler = travelerAt(frame)
  const label = frame >= K.label ? spring({ frame: frame - K.label, fps, config: { damping: 12, stiffness: 150 } }) : 0
  const route = interpolate(frame, [K.label + 6, K.label + 26], [0, 1], clamp)
  const puzzled = frame < 180 ? interpolate(frame, [K.stop, K.stop + 10, K.phoneUp + 6, K.phoneUp + 12], [0, 1, 1, 0], clamp) : 0

  // The phone: up on a spring, down fast before the cut.
  const up = spring({ frame: frame - K.phoneUp, fps, config: { damping: 17, stiffness: 120 } })
  const down = interpolate(frame, [K.phoneDown, 180], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) })
  const phoneTop = 1960 - (1960 - 175) * up + 1900 * down
  const phoneOn = frame >= K.phoneUp && frame < 180
  const blur = interpolate(frame, [K.phoneUp, K.phoneUp + 12, K.phoneDown, 180], [0, 9, 9, 0], clamp)
  const dim = interpolate(frame, [K.phoneUp, K.phoneUp + 12, K.phoneDown, 180], [0, 0.4, 0.4, 0], clamp)

  const playing = frame >= K.tapPlay + 2 && frame < K.native[1] + 4
  const step = frame >= K.target[0] && frame < K.target[1] ? 'training' : frame >= K.native[0] && frame < K.native[1] ? 'main' : 'idle'
  const press = interpolate(frame, [K.tapPlay, K.tapPlay + 3, K.tapPlay + 8, K.tapPlay + 12], [0, 1, 1, 0], clamp)
  const touch = frame >= K.tapPlay && frame < K.tapPlay + 14 ? (frame - K.tapPlay) / 14 : undefined

  // The hook's word, bigger than anything else on screen.
  const lost = interpolate(frame, [0, 4], [1.14, 1], { ...clamp, easing: Easing.out(Easing.back(2)) })
  const lostOut = interpolate(frame, [K.pullBack[0], K.pullBack[0] + 10], [1, 0], clamp)

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <ForkWorld
        cam={cam}
        blades={bladesAt(frame)}
        traveler={traveler}
        label={frame >= 180 ? label : 0}
        route={frame >= 180 ? route : 0}
        puzzled={puzzled}
        frame={frame}
        style={{ filter: blur > 0.1 ? `blur(${blur}px)` : undefined }}
      />
      <AbsoluteFill style={{ background: '#12060a', opacity: dim }} />

      {lostOut > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 150,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontFamily: '"Space Grotesk", sans-serif',
            fontWeight: 700,
            fontSize: 210,
            lineHeight: 1,
            letterSpacing: '-0.05em',
            color: '#fff',
            textShadow: '0 10px 50px rgba(20,6,10,0.6)',
            opacity: lostOut,
            transform: `scale(${lost}) translateY(${(1 - lostOut) * -40}px)`,
          }}
        >
          Lost?
        </div>
      )}

      {phoneOn && (
        <PhoneOnStage top={phoneTop} scale={2.2} rotateZ={(1 - up) * -7 + down * 6}>
          <AppScreen>
            <LearningView
              topic={directions}
              word={directionsWords[0]}
              index={0}
              total={directionsWords.length}
              targetLanguage="French"
              nativeLanguage="English"
              audioStep={step}
              playing={playing}
              cardScale={[cardScale(frame, [[K.target[0], K.target[1]]]), cardScale(frame, [[K.native[0], K.native[1]]])]}
              pulse={pulseOpacity(frame, fps)}
              playPress={press}
              playTouch={touch}
            />
          </AppScreen>
        </PhoneOnStage>
      )}
      <Title frame={frame} fps={fps} from={K.phoneUp + 8} to={K.phoneDown + 4} text="This morning’s word." accent="word." top={78} size={84} />
    </AbsoluteFill>
  )
}
