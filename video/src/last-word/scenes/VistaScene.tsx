import React from 'react'
import { AbsoluteFill, Easing, random, useCurrentFrame } from 'remotion'
import { K, SCENE } from '../timeline'
import { P, cameraAt, view } from '../palette'
import { Building, FAR } from '../shapes/Building'
import { Person, TRAVELER, walkPose } from '../shapes/Person'
import { Defs, Lamp, Sky, Sun } from '../shapes/Street'
import { STEP, TRAVELER_SCALE } from './ForkWorld'

// Frames 270–360: out of the side street and onto the quai. The camera
// cranes up from the traveler to the river, the far bank, the tower and
// the low sun. A bell sounds as it opens.

const HORIZON = 1370
const QUAI = 1690 // where feet stand
const SCALE = 0.6
const STEP_HERE = (STEP / TRAVELER_SCALE) * SCALE

const Tower: React.FC<{ x: number; y: number; h: number }> = ({ x, y, h }) => {
  // Built at 760 tall, base 300 wide, then scaled.
  const k = h / 760
  const fill = '#3a1a26'
  return (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
      <path
        fillRule="evenodd"
        fill={fill}
        d={[
          'M -150 0 Q -112 -70 -96 -140 L -48 -300 L -14 -600 L -4 -730 L 0 -770 L 4 -730 L 14 -600 L 48 -300 L 96 -140 Q 112 -70 150 0 L 100 0',
          'Q 60 -96 0 -104 Q -60 -96 -100 0 Z',
        ].join(' ')}
      />
      <rect x={-112} y={-150} width={224} height={16} fill={fill} />
      <rect x={-58} y={-310} width={116} height={14} fill={fill} />
      <rect x={-20} y={-612} width={40} height={14} fill={fill} />
      {/* lattice, catching the light */}
      <g stroke={P.skyGlow} strokeWidth={2.5} opacity={0.35}>
        {[-1, 1].map((s) => (
          <g key={s}>
            <path d={`M ${s * 140} -10 L ${s * 70} -140 M ${s * 100} -10 L ${s * 120} -130`} />
            <path d={`M ${s * 90} -150 L ${s * 30} -290 M ${s * 50} -150 L ${s * 80} -290`} />
            <path d={`M ${s * 44} -320 L ${s * 8} -590 M ${s * 20} -320 L ${s * 34} -500`} />
          </g>
        ))}
      </g>
    </g>
  )
}

/** Rooftops of the far bank: a ragged line of roofs, chimneys and two domes. */
const Skyline: React.FC = () => {
  const pts: string[] = [`M -1400 ${HORIZON}`]
  let x = -1400
  let i = 0
  while (x < 2600) {
    const w = 60 + 90 * random(`sky-w-${i}`)
    const h = 70 + 110 * random(`sky-h-${i}`)
    pts.push(`L ${x} ${HORIZON - h} L ${x + w * 0.15} ${HORIZON - h - 26} L ${x + w * 0.85} ${HORIZON - h - 26} L ${x + w} ${HORIZON - h}`)
    if (random(`sky-c-${i}`) > 0.5) {
      const cx = x + w * (0.3 + 0.4 * random(`sky-cx-${i}`))
      pts.push(`L ${cx} ${HORIZON - h - 26} L ${cx} ${HORIZON - h - 54} L ${cx + 16} ${HORIZON - h - 54} L ${cx + 16} ${HORIZON - h - 26}`)
    }
    x += w
    i++
  }
  pts.push(`L 2600 ${HORIZON} Z`)
  return (
    <g>
      <path d={pts.join(' ')} fill="#6a2a33" />
      {/* the domes: one gilded, one plain */}
      <g transform={`translate(1180 ${HORIZON - 150})`}>
        <rect x={-50} y={-30} width={100} height={40} fill="#6a2a33" />
        <path d="M -62 -28 Q -62 -130 0 -136 Q 62 -130 62 -28 Z" fill="#c9862f" />
        <path d="M -30 -40 Q -30 -110 0 -122" stroke="#ffd27a" strokeWidth={6} fill="none" opacity={0.7} />
        <rect x={-8} y={-176} width={16} height={44} fill="#c9862f" />
      </g>
      <g transform={`translate(-420 ${HORIZON - 170})`}>
        <path d="M -70 0 Q -70 -110 0 -116 Q 70 -110 70 0 Z" fill="#5c2430" />
        <rect x={-10} y={-150} width={20} height={40} fill="#5c2430" />
      </g>
    </g>
  )
}

const River: React.FC<{ frame: number; sunX: number }> = ({ frame, sunX }) => {
  const streaks: React.ReactNode[] = []
  for (let r = 0; r < 16; r++) {
    const y = HORIZON + 14 + r * 13
    const w = 40 + r * 16 + 30 * Math.sin(frame * 0.12 + r)
    const dx = 18 * Math.sin(frame * 0.07 + r * 1.7)
    streaks.push(<rect key={r} x={sunX - w / 2 + dx} y={y} width={w} height={4 + r * 0.3} rx={2} fill={P.sun} opacity={0.75 - r * 0.035} />)
  }
  return (
    <g>
      <rect x={-1400} y={HORIZON} width={4000} height={260} fill="#7a2d33" />
      <rect x={-1400} y={HORIZON} width={4000} height={260} fill="url(#streetDepth)" />
      {streaks}
    </g>
  )
}

const Bird: React.FC<{ x: number; y: number; frame: number; seed: number }> = ({ x, y, frame, seed }) => {
  const flap = 14 * Math.sin(frame * 0.55 + seed)
  return <path d={`M ${x - 18} ${y - flap} Q ${x - 8} ${y - 4} ${x} ${y} Q ${x + 8} ${y - 4} ${x + 18} ${y - flap}`} stroke="#3a1a26" strokeWidth={4} fill="none" strokeLinecap="round" />
}

export const VistaScene: React.FC = () => {
  const local = useCurrentFrame()
  const frame = local + SCENE.vista.from
  const cam = cameraAt(
    frame,
    [
      [270, { x: 760, y: 1520, zoom: 1.75 }],
      [334, { x: 540, y: 1080, zoom: 1.0 }],
      [360, { x: 520, y: 1064, zoom: 0.98 }],
    ],
    Easing.inOut(Easing.cubic),
  )
  const start = K.vistaSteps[0]
  const x = 910 - (STEP_HERE * (frame - start + 7.5)) / 15
  const sun = { x: 300, y: 1210 }

  return (
    <AbsoluteFill>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: 'absolute', inset: 0 }}>
        <Defs />
        <g transform={view(cam, 0.1)}>
          <Sky />
        </g>
        <g transform={view(cam, 0.2)}>
          <Sun cx={sun.x} cy={sun.y} r={140} />
          {[0, 1, 2, 3].map((i) => (
            <Bird key={i} x={700 + i * 46 - local * 2.2} y={760 + (i % 2) * 34 + i * 8} frame={frame} seed={i * 1.7} />
          ))}
        </g>
        <g transform={view(cam, 0.35)}>
          <Skyline />
          <Tower x={250} y={HORIZON} h={760} />
        </g>
        <g transform={view(cam, 0.5)}>
          {[-900, -560, 820, 1160, 1500].map((bx, i) => (
            <g key={bx} transform={`translate(${bx} ${HORIZON + 6}) scale(0.34)`}>
              <Building x={0} y={0} w={900} tone={FAR} seed={`bank${i}`} detail="low" />
            </g>
          ))}
        </g>
        <g transform={view(cam, 0.7)}>
          <River frame={frame} sunX={sun.x} />
        </g>
        <g transform={view(cam, 1)}>
          {/* the quai: parapet, walk, wall down to the water */}
          <rect x={-1400} y={1580} width={4000} height={70} fill="#8a3f33" />
          <rect x={-1400} y={1572} width={4000} height={16} fill="#b0583f" />
          {Array.from({ length: 40 }, (_, i) => (
            <rect key={i} x={-1400 + i * 100} y={1590} width={3} height={60} fill="#6a2c2a" />
          ))}
          <rect x={-1400} y={1650} width={4000} height={60} fill={P.cobbleLight} />
          <rect x={-1400} y={1710} width={4000} height={500} fill={P.street} />
          <Lamp x={140} y={1666} h={520} />
          <Lamp x={1040} y={1666} h={520} />
          <Person look={TRAVELER} pose={walkPose(frame, start)} x={x} y={QUAI} scale={SCALE} facing={-1} />
        </g>
      </svg>
    </AbsoluteFill>
  )
}
