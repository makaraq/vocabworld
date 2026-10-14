import React from 'react'
import { FONT } from '../../theme'
import { P, view, type Camera } from '../palette'
import { Building, FAR, MID, NEAR } from '../shapes/Building'
import { Person, TRAVELER, type Pose } from '../shapes/Person'
import { Cobbles, Defs, Lamp, Pavement, Signpost, Sky, Sun, type Blade } from '../shapes/Street'

// The fork: a domed corner building splits the street in two. The left-hand
// street runs toward the low sun; the right-hand one into shadow. A
// fingerpost stands at the corner. World units are px at zoom 1.

export const GROUND = 1508 // where feet stand
const PAVE = 1480
export const POST = { x: 520, y: 1504, top: 780 }
export const BLADE_Y = { plate: 822, left: 902, right: 982 }
export const TRAVELER_SCALE = 0.85
export const STEP = 62 // px per step at that scale

/** A street running away from us between two near corners. */
const Corridor: React.FC<{
  x0: number
  x1: number
  far: [number, number]
  farTop: number
  farBottom: number
  top: number
  lit: boolean
  seed: string
}> = ({ x0, x1, far, farTop, farBottom, top, lit, seed }) => {
  const [f0, f1] = far
  const rows = 6
  const wall = (xa: number, xb: number, key: string) => {
    const els: React.ReactNode[] = [
      <path key={`${key}w`} d={`M ${xa} ${top} L ${xb} ${farTop} L ${xb} ${farBottom} L ${xa} ${PAVE + 74} Z`} fill={lit ? '#7c2f2f' : P.midShade} />,
    ]
    // Window rows, shrinking toward the far end.
    for (let r = 0; r < rows; r++) {
      const t0 = (r + 0.3) / rows
      const t1 = (r + 0.62) / rows
      const y = (t: number, near: number, farY: number) => near + (farY - near) * t
      for (let c = 0; c < 4; c++) {
        const u0 = c / 4 + 0.05
        const u1 = c / 4 + 0.15
        const xA = xa + (xb - xa) * u0
        const xB = xa + (xb - xa) * u1
        const yTop = (u: number, t: number) => {
          const nearTop = top + (PAVE - top) * t
          const farY = farTop + (farBottom - farTop) * t
          return y(u, nearTop, farY)
        }
        const on = (r * 7 + c * 3 + seed.length) % 5 === 0
        els.push(
          <path
            key={`${key}${r}-${c}`}
            d={`M ${xA} ${yTop(u0, t0)} L ${xB} ${yTop(u1, t0)} L ${xB} ${yTop(u1, t1)} L ${xA} ${yTop(u0, t1)} Z`}
            fill={on ? P.glassLit : P.glassDark}
            opacity={on ? 0.85 : 0.7}
          />,
        )
      }
    }
    return els
  }
  return (
    <g>
      {lit && <Sun cx={(f0 + f1) / 2} cy={farTop + 60} r={46} />}
      <g transform={`translate(${f0} ${farBottom}) scale(${(f1 - f0) / 330})`}>
        <Building x={0} y={0} w={330} tone={FAR} seed={`${seed}-far`} detail="low" />
      </g>
      <path d={`M ${x0} ${PAVE + 74} L ${f0} ${farBottom} L ${f1} ${farBottom} L ${x1} ${PAVE + 74} Z`} fill={P.street} />
      {lit && <path d={`M ${x0} ${PAVE + 74} L ${f0} ${farBottom} L ${f1} ${farBottom} L ${x1} ${PAVE + 74} Z`} fill="url(#streetDepth)" />}
      {wall(x0, f0, `${seed}l`)}
      {wall(x1, f1, `${seed}r`)}
    </g>
  )
}

export const ForkWorld: React.FC<{
  cam: Camera
  blades: Blade[]
  traveler: { x: number; pose: Pose; facing: number }
  /** "gauche" over the left street, 0 → 1. */
  label?: number
  /** The route drawn on the ground toward it, 0 → 1. */
  route?: number
  /** Question marks over the traveler, 0 → 1. */
  puzzled?: number
  frame: number
  style?: React.CSSProperties
}> = ({ cam, blades, traveler, label = 0, route = 0, puzzled = 0, frame, style }) => {
  const head = GROUND - 470 * TRAVELER_SCALE
  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: 'absolute', inset: 0, ...style }}>
      <Defs />
      <g transform={view(cam, 0.15)}>
        <Sky />
      </g>
      <g transform={view(cam, 1)}>
        {/* The two streets, behind the corners. */}
        <Corridor x0={130} x1={380} far={[205, 305]} farTop={1060} farBottom={1360} top={640} lit seed="left" />
        <Corridor x0={700} x1={950} far={[790, 870]} farTop={1110} farBottom={1370} top={640} lit={false} seed="right" />

        {/* The corners and the domed building between the streets. */}
        <Building x={-760} y={PAVE + 2} w={890} tone={NEAR} seed="fork-left" floors={6} />
        <Building x={950} y={PAVE + 2} w={900} tone={NEAR} seed="fork-right" floors={6} />
        <Building x={380} y={PAVE + 2} w={320} tone={MID} seed="fork-dome" bay={106} dome />

        <Pavement x0={-800} x1={1900} y={PAVE} />
        <Cobbles x0={-800} x1={1900} y={PAVE + 74} seed="fork" to={2300} />
        <Lamp x={880} y={PAVE + 40} />
        <Lamp x={70} y={PAVE + 40} />

        {/* The route on the ground, toward the lit street. */}
        {route > 0 && (
          <path
            d={`M ${traveler.x - 10} ${GROUND + 30} C ${traveler.x - 160} ${GROUND + 60} 300 ${GROUND + 40} 255 ${PAVE + 40}`}
            stroke={P.amberSoft}
            strokeWidth={10}
            strokeLinecap="round"
            fill="none"
            pathLength={1}
            style={{ strokeDasharray: '0.001 0.05', strokeDashoffset: -frame * 0.004 }}
            opacity={route}
          />
        )}

        <Signpost x={POST.x} y={POST.y} top={POST.top} blades={blades} />

        <Person look={TRAVELER} pose={traveler.pose} x={traveler.x} y={GROUND} scale={TRAVELER_SCALE} facing={traveler.facing} />

        {puzzled > 0 &&
          [0, 1].map((i) => {
            const p = Math.max(0, Math.min(1, puzzled * 2 - i * 0.6))
            return (
              <text
                key={i}
                x={traveler.x + (i ? 44 : -18)}
                y={head - 30 - i * 40 - 12 * p}
                fontFamily={FONT.display}
                fontWeight={700}
                fontSize={i ? 58 : 72}
                fill={P.cream}
                textAnchor="middle"
                opacity={p}
                transform={`rotate(${i ? 14 : -10} ${traveler.x} ${head})`}
              >
                ?
              </text>
            )
          })}

        {/* The word, lit over the street it names. */}
        {label > 0 && (
          <g transform={`translate(255 1230) scale(${0.6 + 0.4 * label})`} opacity={Math.min(1, label * 1.6)}>
            <rect x={-150} y={-56} width={300} height={112} rx={56} fill={P.amber} opacity={0.22 + 0.1 * Math.sin(frame * 0.4)} style={{ filter: 'blur(18px)' }} />
            <rect x={-134} y={-44} width={268} height={88} rx={44} fill="rgba(26,10,14,0.55)" stroke={P.amberSoft} strokeWidth={4} />
            <path d="M -112 0 h 40 M -112 0 l 18 -16 M -112 0 l 18 16" stroke={P.amberSoft} strokeWidth={8} strokeLinecap="round" fill="none" />
            <text x={34} y={17} textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={50} fill="#fff" style={{ filter: 'drop-shadow(0 0 10px rgba(251,191,36,0.9))' }}>
              gauche
            </text>
          </g>
        )}
      </g>
    </svg>
  )
}
