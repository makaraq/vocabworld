import React from 'react'
import { P } from '../palette'

// A flat, paper-cut figure in profile, about 440px tall at scale 1 with the
// feet at (0, 0), facing +x. Limbs are two segments each, rotated at hip,
// knee, shoulder and elbow; the walk is a pure function of the frame.

export interface Look {
  skin: string
  hair: string
  top: string
  topShade: string
  trousers: string
  shoes: string
  hairStyle: 'short' | 'bun'
  backpack?: string
  scarf?: string
  apron?: string
}

export const TRAVELER: Look = {
  skin: '#c98d6b',
  hair: '#2b1a14',
  top: '#22304d',
  topShade: '#18213a',
  trousers: '#2a1f2b',
  shoes: '#1a1216',
  hairStyle: 'short',
  backpack: P.teal,
  scarf: P.amber,
}

export const OWNER: Look = {
  skin: '#e0a882',
  hair: '#8c7f7a',
  top: '#33415c',
  topShade: '#26314a',
  trousers: '#2b2226',
  shoes: '#1a1216',
  hairStyle: 'bun',
  apron: '#f3e3c3',
}

export interface Pose {
  /** Thigh swing of the near leg, degrees; + is forward. The far leg mirrors it. */
  leg: number
  /** Extra knee bend of the near and far leg, degrees. */
  knee: [number, number]
  /** Upper-arm swing of the near and far arm, degrees; + is forward. */
  arm: [number, number]
  /** Elbow bend of the near and far arm, degrees. */
  elbow: [number, number]
  /** Body raised by this many px (the walk's bounce). */
  lift: number
  /** -1 looks back over the shoulder, 1 straight ahead. */
  look: number
  /** Head tipped down, degrees. */
  nod: number
  /** 0 closed → 1 open. */
  mouth: number
}

export const STAND: Pose = { leg: 0, knee: [4, 4], arm: [-4, 6], elbow: [12, 14], lift: 0, look: 1, nod: 0, mouth: 0 }

/** A walk in which a heel strikes the ground on every `period / 2` frames from `start`. */
export function walkPose(frame: number, start: number, period = 30, stride = 24): Pose {
  const phase = (2 * Math.PI * (frame - start)) / period
  const c = Math.cos(phase)
  const s = Math.sin(phase)
  return {
    leg: stride * c,
    // The trailing leg bends as it swings through.
    knee: [6 + 30 * Math.max(0, s), 6 + 30 * Math.max(0, -s)],
    arm: [-stride * 0.8 * c, stride * 0.8 * c],
    elbow: [18 + 8 * Math.max(0, -c), 18 + 8 * Math.max(0, c)],
    lift: 9 * (1 - Math.abs(c)),
    look: 1,
    nod: 0,
    mouth: 0,
  }
}

/** Blend two poses, 0 → a, 1 → b. */
export function mixPose(a: Pose, b: Pose, t: number): Pose {
  const m = (x: number, y: number) => x + (y - x) * t
  return {
    leg: m(a.leg, b.leg),
    knee: [m(a.knee[0], b.knee[0]), m(a.knee[1], b.knee[1])],
    arm: [m(a.arm[0], b.arm[0]), m(a.arm[1], b.arm[1])],
    elbow: [m(a.elbow[0], b.elbow[0]), m(a.elbow[1], b.elbow[1])],
    lift: m(a.lift, b.lift),
    look: m(a.look, b.look),
    nod: m(a.nod, b.nod),
    mouth: m(a.mouth, b.mouth),
  }
}

const HIP = -212
const THIGH = 104
const SHIN = 100
const SHOULDER = -372
const UPPER = 86
const FORE = 80

const Leg: React.FC<{ swing: number; knee: number; color: string; shoe: string }> = ({ swing, knee, color, shoe }) => (
  // SVG rotation is clockwise; a forward swing (+x) of a hanging leg is anticlockwise.
  <g transform={`translate(0 ${HIP}) rotate(${-swing})`}>
    <rect x={-19} y={-6} width={38} height={THIGH + 12} rx={18} fill={color} />
    <g transform={`translate(0 ${THIGH}) rotate(${knee})`}>
      <rect x={-17} y={-8} width={34} height={SHIN + 8} rx={16} fill={color} />
      <path d={`M -16 ${SHIN - 10} h 30 a 16 14 0 0 1 16 14 v 4 h -50 z`} fill={shoe} />
    </g>
  </g>
)

const Arm: React.FC<{ swing: number; elbow: number; color: string; skin: string }> = ({ swing, elbow, color, skin }) => (
  <g transform={`translate(0 ${SHOULDER}) rotate(${-swing})`}>
    <rect x={-15} y={-10} width={30} height={UPPER + 12} rx={15} fill={color} />
    <g transform={`translate(0 ${UPPER}) rotate(${-elbow})`}>
      <rect x={-13} y={-8} width={26} height={FORE + 4} rx={13} fill={color} />
      <circle cx={0} cy={FORE + 6} r={13} fill={skin} />
    </g>
  </g>
)

export const Person: React.FC<{
  look: Look
  pose: Pose
  x: number
  y: number
  scale?: number
  /** 1 faces right, -1 left; values between squash the figure as it turns. */
  facing?: number
  /** The owner's raised pointing arm replaces the near arm: [shoulder, elbow] degrees. */
  point?: [number, number]
}> = ({ look, pose, x, y, scale = 1, facing = 1, point }) => {
  const nearArm = point ? { swing: point[0], elbow: point[1] } : { swing: pose.arm[0], elbow: pose.elbow[0] }
  return (
    <g transform={`translate(${x} ${y}) scale(${scale * facing} ${scale})`}>
      {/* contact shadow */}
      <ellipse cx={0} cy={4} rx={70} ry={10} fill="rgba(20,6,10,0.35)" />
      <g transform={`translate(0 ${-pose.lift})`}>
        {/* far side, in shade */}
        <Arm swing={pose.arm[1]} elbow={pose.elbow[1]} color={look.topShade} skin={look.skin} />
        <Leg swing={-pose.leg} knee={pose.knee[1]} color={shade(look.trousers)} shoe={look.shoes} />

        {look.backpack && (
          <g>
            <rect x={-84} y={-372} width={56} height={150} rx={20} fill={look.backpack} />
            <rect x={-80} y={-300} width={44} height={46} rx={10} fill="rgba(0,0,0,0.18)" />
          </g>
        )}

        {/* torso */}
        <path d="M -36 -390 Q -40 -300 -34 -206 L 34 -206 Q 40 -300 34 -390 Q 0 -404 -36 -390 Z" fill={look.top} />
        {look.apron && (
          <g>
            <path d="M 4 -360 L 40 -360 L 46 -150 L 0 -150 Z" fill={look.apron} />
            <rect x={-36} y={-236} width={82} height={12} rx={6} fill={look.apron} />
          </g>
        )}
        {look.backpack && <path d="M 30 -384 Q 10 -320 -30 -290" stroke={shade(look.backpack)} strokeWidth={9} fill="none" strokeLinecap="round" />}

        <Leg swing={pose.leg} knee={pose.knee[0]} color={look.trousers} shoe={look.shoes} />

        {/* head */}
        <g transform={`translate(4 -392) rotate(${pose.nod}) translate(-4 392)`}>
          <rect x={-9} y={-414} width={20} height={30} rx={8} fill={look.skin} />
          <g transform={`translate(4 0) scale(${pose.look} 1) translate(-4 0)`}>
            <circle cx={6} cy={-446} r={42} fill={look.skin} />
            {/* nose and ear */}
            <path d="M 44 -452 q 12 8 2 16" fill={look.skin} />
            <ellipse cx={-6} cy={-444} rx={8} ry={11} fill={shade(look.skin, 0.88)} />
            <circle cx={30} cy={-454} r={4.5} fill={P.ink} />
            {pose.mouth > 0.05 ? (
              <ellipse cx={34} cy={-424} rx={6} ry={2 + 5 * pose.mouth} fill="#5a1d24" />
            ) : (
              <path d="M 28 -424 q 6 3 12 0" stroke="#5a1d24" strokeWidth={3} fill="none" strokeLinecap="round" />
            )}
            {look.hairStyle === 'short' ? (
              <path d="M -38 -440 Q -40 -496 12 -492 Q 52 -488 50 -458 Q 30 -470 14 -462 Q 10 -446 -4 -444 Q -12 -430 -22 -420 Q -38 -424 -38 -440 Z" fill={look.hair} />
            ) : (
              <g fill={look.hair}>
                <circle cx={-34} cy={-470} r={22} />
                <path d="M -38 -436 Q -42 -494 10 -492 Q 50 -490 48 -462 Q 20 -474 0 -466 Q -14 -450 -26 -424 Q -40 -424 -38 -436 Z" />
              </g>
            )}
          </g>
        </g>

        {look.scarf && (
          <g>
            <rect x={-30} y={-404} width={64} height={26} rx={12} fill={look.scarf} />
            <path
              d={`M -26 -392 q -30 ${10 + 6 * Math.sin(pose.leg / 6)} -48 ${40} l 18 4 q 14 -24 36 -36 z`}
              fill={shade(look.scarf, 0.85)}
            />
          </g>
        )}

        <Arm swing={nearArm.swing} elbow={nearArm.elbow} color={look.top} skin={look.skin} />
      </g>
    </g>
  )
}

/** A darker version of a hex colour. */
export function shade(hex: string, k = 0.72) {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.round(((n >> 16) & 255) * k)
  const g = Math.round(((n >> 8) & 255) * k)
  const b = Math.round((n & 255) * k)
  return `rgb(${r},${g},${b})`
}
