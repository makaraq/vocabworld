import React from 'react'
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { FONT } from '../../theme'
import { K, LINE, SCENE } from '../timeline'
import { P, cameraAt, clamp, view } from '../palette'
import { Building, MID } from '../shapes/Building'
import { OWNER, Person, STAND, TRAVELER, mixPose, walkPose } from '../shapes/Person'
import { Cobbles, Defs, Lamp, Sky } from '../shapes/Street'

// Frames 360–480: a café on the way. The owner turns, points down the street
// and gives the way, one word per beat: "à gauche, puis tout droit." The
// words the traveler learned light up amber in the subtitles.

const PAVE = 1500
const FEET = 1612
const DOOR_FEET = 1524
const STOP_X = 600
const STRIDE = 70

const Table: React.FC<{ x: number }> = ({ x }) => (
  <g>
    {/* chairs */}
    {[-1, 1].map((s) => (
      <g key={s} stroke="#2a1218" strokeWidth={6} fill="none" strokeLinecap="round">
        <path d={`M ${x + s * 70} ${DOOR_FEET + 10} L ${x + s * 64} ${DOOR_FEET - 70} L ${x + s * 40} ${DOOR_FEET - 70}`} />
        <path d={`M ${x + s * 64} ${DOOR_FEET - 70} Q ${x + s * 92} ${DOOR_FEET - 120} ${x + s * 74} ${DOOR_FEET - 160}`} />
        <path d={`M ${x + s * 44} ${DOOR_FEET + 10} L ${x + s * 44} ${DOOR_FEET - 70}`} />
      </g>
    ))}
    <rect x={x - 5} y={DOOR_FEET - 104} width={10} height={110} fill="#2a1218" />
    <ellipse cx={x} cy={DOOR_FEET + 6} rx={34} ry={8} fill="#2a1218" />
    <ellipse cx={x} cy={DOOR_FEET - 106} rx={62} ry={14} fill="#c9a27a" />
    {/* a cup and saucer */}
    <ellipse cx={x + 12} cy={DOOR_FEET - 118} rx={18} ry={5} fill="#fff4e0" />
    <path d={`M ${x + 2} ${DOOR_FEET - 142} h 22 v 14 a 11 8 0 0 1 -22 0 z`} fill="#fff4e0" />
  </g>
)

const Cafe: React.FC<{ frame: number }> = ({ frame }) => {
  const top = 1060
  const stripes: React.ReactNode[] = []
  const a0 = 390
  const a1 = 1110
  const n = 12
  for (let i = 0; i < n; i++) {
    const x0 = a0 + ((a1 - a0) * i) / n
    const x1 = a0 + ((a1 - a0) * (i + 1)) / n
    const spread = 22
    stripes.push(
      <path
        key={i}
        d={`M ${x0} ${top + 92} L ${x1} ${top + 92} L ${x1 + spread * ((i + 1) / n - 0.5)} ${top + 200} L ${x0 + spread * (i / n - 0.5)} ${top + 200} Z`}
        fill={i % 2 ? P.cream : P.awningRed}
      />,
    )
  }
  const scallops = Array.from({ length: n }, (_, i) => {
    const x0 = a0 - 11 + ((a1 - a0 + 22) * i) / n
    const w = (a1 - a0 + 22) / n
    return <path key={i} d={`M ${x0} ${top + 200} h ${w} v 14 a ${w / 2} 14 0 0 1 ${-w} 0 z`} fill={i % 2 ? P.cream : P.awningRed} />
  })
  return (
    <g>
      {/* storefront */}
      <rect x={-200} y={top} width={1480} height={PAVE - top} fill={P.tealDark} />
      <rect x={-200} y={top} width={1480} height={84} fill="#06382f" />
      <text x={740} y={top + 60} textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={50} letterSpacing="0.22em" fill="#f5c26b">
        CHEZ MARGOT
      </text>
      {/* the window, warm inside */}
      <rect x={420} y={top + 210} width={640} height={PAVE - top - 250} fill="url(#interior)" />
      {[0, 1].map((i) => {
        const px = 600 + i * 260
        const bob = 3 * Math.sin(frame * 0.2 + i * 2)
        return (
          <g key={i} fill="#7a3324" opacity={0.75}>
            <circle cx={px} cy={top + 300 + bob} r={30} />
            <path d={`M ${px - 50} ${PAVE - 40} Q ${px - 50} ${top + 340} ${px} ${top + 336 + bob} Q ${px + 50} ${top + 340} ${px + 50} ${PAVE - 40} Z`} />
          </g>
        )
      })}
      {[560, 900].map((lx) => (
        <g key={lx}>
          <line x1={lx} y1={top + 210} x2={lx} y2={top + 250} stroke="#5a2a1c" strokeWidth={3} />
          <circle cx={lx} cy={top + 262} r={14} fill="#fff1b8" />
          <circle cx={lx} cy={top + 262} r={60} fill="url(#lampGlow)" opacity={0.7} />
        </g>
      ))}
      <rect x={734} y={top + 210} width={12} height={PAVE - top - 250} fill={P.tealDark} />
      <rect x={410} y={PAVE - 48} width={660} height={48} fill="#06382f" />
      {/* the door, open */}
      <rect x={140} y={top + 120} width={200} height={PAVE - top - 120} fill="url(#interior)" />
      <path d={`M 140 ${top + 120} L 104 ${top + 104} L 104 ${PAVE + 8} L 140 ${PAVE}`} fill="#0a5e4c" />
      <rect x={128} y={top + 110} width={224} height={12} fill="#06382f" />
      {/* awning */}
      <path d={`M ${a0} ${top + 84} L ${a1} ${top + 84} L ${a1} ${top + 96} L ${a0} ${top + 96} Z`} fill="#3a0f12" />
      {stripes}
      {scallops}
      {/* planters */}
      {[30, 1150].map((px) => (
        <g key={px}>
          <rect x={px - 50} y={PAVE - 70} width={100} height={70} fill="#5a2a1c" />
          {[-30, 0, 30].map((dx, i) => (
            <circle key={i} cx={px + dx} cy={PAVE - 86 - (i % 2) * 18} r={34} fill={i === 1 ? P.tealLight : P.teal} />
          ))}
        </g>
      ))}
    </g>
  )
}

const Subtitles: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  if (frame < K.words[0] - 2) return null
  const out = interpolate(frame, [SCENE.cafe.from + SCENE.cafe.durationInFrames - 6, SCENE.cafe.from + SCENE.cafe.durationInFrames], [1, 0], clamp)
  const shown = (i: number) => spring({ frame: frame - K.words[i], fps, config: { damping: 13, stiffness: 190 } })
  return (
    <div
      style={{
        position: 'absolute',
        left: 40,
        right: 40,
        top: 1440,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 18,
        opacity: out,
        fontFamily: FONT.display,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '16px 46px 20px',
          borderRadius: 36,
          background: 'rgba(18,6,10,0.62)',
          backdropFilter: 'blur(10px)',
        }}
      >
        {[[0, 1], [2, 3, 4]].map((row) => (
          <div key={row[0]} style={{ display: 'flex', gap: 28, lineHeight: 1.12 }}>
            {row.map((i) => {
              const w = LINE[i]
              const s = shown(i)
              return (
                <span
                  key={i}
                  style={{
                    fontWeight: 700,
                    fontSize: 104,
                    letterSpacing: '-0.035em',
                    color: w.learned ? P.amberSoft : '#fff',
                    textShadow: w.learned ? `0 0 ${24 * s}px rgba(245,158,11,0.75)` : 'none',
                    opacity: Math.min(1, s * 1.6),
                    transform: `translateY(${(1 - s) * 26}px) scale(${0.85 + 0.15 * s})`,
                    display: 'inline-block',
                  }}
                >
                  {w.fr}
                </span>
              )
            })}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        {LINE.filter((w) => w.en).map((w) => {
          const s = shown(LINE.indexOf(w))
          return (
            <span
              key={w.en}
              style={{
                fontWeight: 600,
                fontSize: 54,
                color: 'rgba(255,255,255,0.9)',
                textShadow: '0 4px 20px rgba(18,6,10,0.8)',
                opacity: Math.min(1, s * 1.6),
                transform: `translateY(${(1 - s) * 16}px)`,
                display: 'inline-block',
              }}
            >
              {w.en}
            </span>
          )
        })}
      </div>
    </div>
  )
}

export const CafeScene: React.FC = () => {
  const local = useCurrentFrame()
  const { fps } = useVideoConfig()
  const frame = local + SCENE.cafe.from
  const cam = cameraAt(
    frame,
    [
      [360, { x: 560, y: 1250, zoom: 1.0 }],
      [480, { x: 520, y: 1290, zoom: 1.1 }],
    ],
    Easing.inOut(Easing.quad),
  )

  // The traveler walks in and stops, then nods.
  const tx = STOP_X + (STRIDE * Math.max(0, K.cafeStop - frame)) / 15
  const nod = interpolate(frame, [K.nod, K.nod + 5, K.nod + 10, K.nod + 15], [0, 16, 2, 0], clamp)
  const travelerPose = { ...mixPose(walkPose(frame, K.cafeSteps[0]), STAND, interpolate(frame, [K.cafeStop - 2, K.cafeStop + 6], [0, 1], clamp)), nod }

  // The owner turns to the street to point, and back.
  const [, w1, , w3, w4] = K.words
  const ownerFacing = interpolate(frame, [w1 - 6, w1, w4 + 12, w4 + 18], [1, -1, -1, 1], clamp)
  const reach = interpolate(frame, [w1 - 4, w1 + 4, w3 - 2, w3 + 3, w4 - 2, w4 + 3, w4 + 12, w4 + 18], [0, 1, 1, 0.82, 0.82, 1.05, 1.05, 0], clamp)
  const point: [number, number] | undefined = reach > 0.01 ? [-4 + 98 * reach, 30 * (1 - reach)] : undefined
  const mouth = Math.max(0, ...K.words.map((w) => (frame >= w && frame < w + 9 ? Math.sin(((frame - w) / 9) * Math.PI) : 0)))
  const ownerPose = { ...STAND, mouth }

  const glad = interpolate(frame, [K.nod, K.nod + 6, 476, 480], [0, 1, 1, 0], clamp)

  return (
    <AbsoluteFill>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: 'absolute', inset: 0 }}>
        <Defs />
        <g transform={view(cam, 0.2)}>
          <Sky />
        </g>
        <g transform={view(cam, 1)}>
          <Building x={-200} y={1060} w={1480} tone={MID} seed="cafe" floors={4} groundH={0} noGround bay={120} />
          <Cafe frame={frame} />
          <rect x={-400} y={PAVE} width={2000} height={150} fill={P.cobbleLight} />
          <rect x={-400} y={PAVE + 150} width={2000} height={14} fill={P.curb} />
          <Cobbles x0={-400} x1={1600} y={PAVE + 164} seed="cafe" to={2400} />
          <Table x={790} />
          <Table x={1000} />
          <Lamp x={-20} y={PAVE + 120} h={600} />
          <Person look={OWNER} pose={ownerPose} x={250} y={DOOR_FEET} scale={0.92} facing={ownerFacing} point={point} />
          <Person look={TRAVELER} pose={travelerPose} x={tx} y={FEET} scale={1} facing={-1} />
          {glad > 0 && (
            <g transform={`translate(${tx + 10} ${FEET - 650}) scale(${0.6 + 0.4 * glad})`} opacity={glad}>
              <circle r={38} fill={P.amber} />
              <path d="M -16 2 L -4 14 L 18 -12" stroke="#fff" strokeWidth={9} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          )}
        </g>
      </svg>
      <Subtitles frame={frame} fps={fps} />
    </AbsoluteFill>
  )
}
