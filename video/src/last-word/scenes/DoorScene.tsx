import React from 'react'
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion'
import { FONT } from '../../theme'
import { K, SCENE } from '../timeline'
import { P, cameraAt, clamp, view } from '../palette'
import { Person, STAND, TRAVELER, mixPose, walkPose } from '../shapes/Person'
import { Cobbles, Defs, Lamp } from '../shapes/Street'

// Frames 480–537: the address. A tall green Paris door with a fanlight and a
// blue enamel number; the traveler stops, and it opens onto warm light.

const PAVE = 1500
const FEET = 1560
const DOOR = { x0: 360, x1: 720, top: 760 }
const STOP_X = 800
const STRIDE = 70

const Stone: React.FC = () => {
  const rows: React.ReactNode[] = []
  for (let r = 0; r < 22; r++) {
    const y = 300 + r * 56
    rows.push(<rect key={`h${r}`} x={-300} y={y} width={1700} height={3} fill="#7a3328" opacity={0.6} />)
    for (let c = 0; c < 9; c++) {
      const x = -300 + c * 220 + (r % 2) * 110
      rows.push(<rect key={`v${r}-${c}`} x={x} y={y} width={3} height={56} fill="#7a3328" opacity={0.5} />)
    }
  }
  return (
    <g>
      <rect x={-300} y={200} width={1700} height={PAVE - 200} fill="#9a4a36" />
      {rows}
    </g>
  )
}

export const DoorScene: React.FC = () => {
  const local = useCurrentFrame()
  const frame = local + SCENE.door.from
  const cam = cameraAt(
    frame,
    [
      [480, { x: 600, y: 1220, zoom: 1.05 }],
      [K.doorStop, { x: 590, y: 1210, zoom: 1.1 }],
      [537, { x: 540, y: 1160, zoom: 1.42 }],
    ],
    Easing.inOut(Easing.cubic),
  )
  const open = interpolate(frame, [K.doorOpen[0], K.doorOpen[1]], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) })
  const tx = STOP_X + (STRIDE * Math.max(0, K.doorStop - frame)) / 15
  const pose = mixPose(walkPose(frame, K.doorSteps[0]), STAND, interpolate(frame, [K.doorStop - 2, K.doorStop + 6], [0, 1], clamp))
  const mid = (DOOR.x0 + DOOR.x1) / 2
  const leafW = (DOOR.x1 - DOOR.x0) / 2

  const Leaf: React.FC<{ side: -1 | 1 }> = ({ side }) => {
    // Each leaf swings inward on its hinge, foreshortening as it goes.
    const hinge = side < 0 ? DOOR.x0 : DOOR.x1
    const k = 1 - 0.86 * open
    return (
      <g transform={`translate(${hinge} 0) scale(${k} 1) translate(${-hinge} 0)`}>
        <g transform={side < 0 ? '' : `translate(${2 * mid} 0) scale(-1 1)`}>
          <rect x={DOOR.x0} y={DOOR.top + 140} width={leafW} height={PAVE - DOOR.top - 140} fill={P.teal} />
          <rect x={DOOR.x0 + 22} y={DOOR.top + 170} width={leafW - 44} height={250} rx={6} fill={P.tealDark} />
          <rect x={DOOR.x0 + 22} y={DOOR.top + 446} width={leafW - 44} height={250} rx={6} fill={P.tealDark} />
          <rect x={DOOR.x0 + leafW - 8} y={DOOR.top + 140} width={8} height={PAVE - DOOR.top - 140} fill="#064a3d" />
        </g>
      </g>
    )
  }

  return (
    <AbsoluteFill style={{ background: P.street }}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: 'absolute', inset: 0 }}>
        <Defs />
        <g transform={view(cam, 1)}>
          <Stone />
          {/* the doorway: warm light inside, the fanlight above */}
          <path d={`M ${DOOR.x0 - 40} ${PAVE} V ${DOOR.top + 140} A ${leafW + 40} ${leafW + 40} 0 0 1 ${DOOR.x1 + 40} ${DOOR.top + 140} V ${PAVE} Z`} fill="#c06a48" />
          <path d={`M ${DOOR.x0} ${PAVE} V ${DOOR.top + 140} A ${leafW} ${leafW} 0 0 1 ${DOOR.x1} ${DOOR.top + 140} V ${PAVE} Z`} fill="url(#interior)" />
          <g opacity={1 - 0.6 * open}>
            <path d={`M ${DOOR.x0} ${DOOR.top + 140} A ${leafW} ${leafW} 0 0 1 ${DOOR.x1} ${DOOR.top + 140} Z`} fill={P.tealDark} />
            {[-60, -30, 0, 30, 60].map((a) => (
              <line
                key={a}
                x1={mid}
                y1={DOOR.top + 140}
                x2={mid + Math.sin((a * Math.PI) / 180) * leafW}
                y2={DOOR.top + 140 - Math.cos((a * Math.PI) / 180) * leafW}
                stroke="#ffd27a"
                strokeWidth={5}
                opacity={0.8}
              />
            ))}
            <path d={`M ${DOOR.x0 + 30} ${DOOR.top + 140} A ${leafW - 30} ${leafW - 30} 0 0 1 ${DOOR.x1 - 30} ${DOOR.top + 140}`} stroke="#ffd27a" strokeWidth={4} fill="none" opacity={0.5} />
          </g>
          <rect x={DOOR.x0} y={DOOR.top + 128} width={DOOR.x1 - DOOR.x0} height={14} fill="#064a3d" />
          <Leaf side={-1} />
          <Leaf side={1} />
          {/* the knob, in the middle as on Paris doors */}
          {open < 0.05 && <circle cx={mid} cy={DOOR.top + 430} r={20} fill="#e0a640" />}

          {/* the number */}
          <g transform={`translate(${mid} ${DOOR.top - 60})`}>
            <rect x={-62} y={-44} width={124} height={88} rx={14} fill={P.enamel} stroke="#fff" strokeWidth={5} />
            <text y={24} textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={64} fill="#fff">
              12
            </text>
          </g>
          <Lamp x={150} y={PAVE + 40} h={560} />
          <Lamp x={930} y={PAVE + 40} h={560} />

          <rect x={-300} y={PAVE} width={1700} height={110} fill={P.cobbleLight} />
          <rect x={DOOR.x0 - 30} y={PAVE - 6} width={DOOR.x1 - DOOR.x0 + 60} height={20} fill="#b0583f" />
          <rect x={-300} y={PAVE + 110} width={1700} height={12} fill={P.curb} />
          <Cobbles x0={-300} x1={1400} y={PAVE + 122} seed="door" to={2300} />
          {/* light spilling out over the step and the street */}
          <path
            d={`M ${DOOR.x0} ${PAVE} L ${DOOR.x1} ${PAVE} L ${DOOR.x1 + 260} ${PAVE + 420} L ${DOOR.x0 - 260} ${PAVE + 420} Z`}
            fill="#ffc65a"
            opacity={0.32 * open}
            style={{ mixBlendMode: 'screen' }}
          />
          <Person look={TRAVELER} pose={pose} x={tx} y={FEET} scale={1} facing={-1} />
        </g>
      </svg>
      <AbsoluteFill style={{ background: '#ffd98a', opacity: interpolate(frame, [512, 537], [0, 0.55], clamp), mixBlendMode: 'screen' }} />
    </AbsoluteFill>
  )
}
