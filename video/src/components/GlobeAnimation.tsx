import React from 'react'
import { random } from 'remotion'
import { COLOR, FONT } from '../theme'
import { GLOBE_CHARS } from '../data/languages'

// A sphere of letterforms from many scripts, turning on its vertical axis.
// Points sit on a Fibonacci lattice; each frame they are spun, tilted toward
// the viewer and projected, so depth drives size, brightness and stacking.
// Thin amber lights travel two orbits and light the letters they pass.

const GOLDEN = Math.PI * (3 - Math.sqrt(5))

interface Vec {
  x: number
  y: number
  z: number
}

function tiltX({ x, y, z }: Vec, t: number): Vec {
  return { x, y: y * Math.cos(t) - z * Math.sin(t), z: y * Math.sin(t) + z * Math.cos(t) }
}

function rotZ({ x, y, z }: Vec, a: number): Vec {
  return { x: x * Math.cos(a) - y * Math.sin(a), y: x * Math.sin(a) + y * Math.cos(a), z }
}

/** A point on the unit sphere from latitude/longitude, z toward the viewer. */
const onSphere = (lat: number, lon: number): Vec => ({
  x: Math.cos(lat) * Math.sin(lon),
  y: Math.sin(lat),
  z: Math.cos(lat) * Math.cos(lon),
})

export interface GlobeProps {
  frame: number
  radius: number
  count?: number
  /** Radians the north pole leans toward the viewer. */
  tilt?: number
  /** Radians per frame. */
  spin?: number
  spinOffset?: number
  /** Per letter, 0 (scattered far out) → 1 (in place on the sphere). */
  assemble?: (index: number) => number
  /** How far out letters start, in radii. */
  scatter?: number
  /** Draw each letter on a small tile. */
  tiles?: boolean
  /** 0 → 1: opacity of the orbit lines and their lights. */
  orbits?: number
  /** 0 → 1: opacity of the latitude / longitude grid. */
  grid?: number
  fontSize?: number
  /** Overall opacity of the letters. */
  opacity?: number
  seed?: string
}

export const GlobeAnimation: React.FC<GlobeProps> = ({
  frame,
  radius: R,
  count = 84,
  tilt = 0.34,
  spin = 0.011,
  spinOffset = 0,
  assemble = () => 1,
  scatter = 1,
  tiles = false,
  orbits = 1,
  grid = 1,
  fontSize = 34,
  opacity = 1,
  seed = 'globe',
}) => {
  const angle = spinOffset + frame * spin

  // Orbit lights: heads travelling the equator and a 62° inclined circle.
  const lights = [
    { incline: 0, head: frame * 0.055 },
    { incline: 1.08, head: frame * 0.047 + Math.PI * 0.8 },
  ]
  const orbitPoint = (incline: number, a: number, r = 1.07) => {
    const p = tiltX(rotZ(onSphere(0, a), incline), tilt)
    return { x: p.x * r, y: p.y * r, z: p.z }
  }
  const lightHeads = lights.map((l) => orbitPoint(l.incline, l.head, 1))

  const letters = Array.from({ length: count }, (_, i) => {
    const yy = 1 - (2 * (i + 0.5)) / count
    const lat = Math.asin(yy)
    const lon = i * GOLDEN + angle
    const p = tiltX(onSphere(lat, lon), tilt)
    const depth = (p.z + 1) / 2

    const illum = Math.max(
      ...lightHeads.map((h) => {
        const d2 = (p.x - h.x) ** 2 + (p.y - h.y) ** 2 + (p.z - h.z) ** 2
        return Math.exp(-d2 / 0.05) * (h.z > -0.2 ? 1 : 0.3)
      }),
    ) * orbits

    const k = Math.max(0, Math.min(1, assemble(i)))
    const a = random(`${seed}-a-${i}`) * Math.PI * 2
    const dist = R * (1.5 + random(`${seed}-d-${i}`) * 1.8) * scatter
    const sx = p.x * R * k + Math.cos(a) * dist * (1 - k)
    const sy = -p.y * R * k + Math.sin(a) * dist * (1 - k)
    const size = fontSize * (0.5 + 0.55 * depth) * (1 + 0.18 * illum)
    const alpha = (0.12 + 0.88 * depth ** 1.6) * k * opacity

    return { i, char: GLOBE_CHARS[i % GLOBE_CHARS.length], sx, sy, depth, size, alpha, illum }
  }).sort((a, b) => a.depth - b.depth)

  // Grid: parallels and spinning meridians, front strokes brighter than back.
  const gridSegments: { x1: number; y1: number; x2: number; y2: number; front: boolean }[] = []
  if (grid > 0) {
    const pushPath = (pts: Vec[]) => {
      for (let j = 0; j < pts.length - 1; j++) {
        const a = pts[j]
        const b = pts[j + 1]
        gridSegments.push({ x1: a.x * R, y1: -a.y * R, x2: b.x * R, y2: -b.y * R, front: a.z + b.z > 0 })
      }
    }
    for (const lat of [-0.75, -0.38, 0, 0.38, 0.75]) {
      pushPath(Array.from({ length: 49 }, (_, j) => tiltX(onSphere(lat, (j / 48) * Math.PI * 2), tilt)))
    }
    for (let m = 0; m < 6; m++) {
      const lon = (m / 6) * Math.PI + angle
      pushPath(Array.from({ length: 33 }, (_, j) => tiltX(onSphere(-Math.PI / 2 + (j / 32) * Math.PI, lon), tilt)))
    }
  }

  const orbitPaths = lights.map((l) => {
    const pts = Array.from({ length: 97 }, (_, j) => orbitPoint(l.incline, (j / 96) * Math.PI * 2))
    return pts.map((p, j) => `${j ? 'L' : 'M'}${(p.x * R).toFixed(1)},${(-p.y * R).toFixed(1)}`).join(' ')
  })

  const tails = lights.map((l) =>
    Array.from({ length: 16 }, (_, j) => {
      const a0 = l.head - (j + 1) * 0.06
      const a1 = l.head - j * 0.06
      const p0 = orbitPoint(l.incline, a0)
      const p1 = orbitPoint(l.incline, a1)
      const front = (p0.z + p1.z) / 2
      return { p0, p1, alpha: (1 - j / 16) * (front > 0 ? 1 : 0.25) }
    }),
  )

  const box = R * 2.6
  return (
    <div style={{ position: 'relative', width: box, height: box }}>
      <svg
        width={box}
        height={box}
        viewBox={`${-box / 2} ${-box / 2} ${box} ${box}`}
        style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
        aria-hidden
      >
        <g opacity={grid}>
          {gridSegments.map((s, j) => (
            <line
              key={j}
              x1={s.x1}
              y1={s.y1}
              x2={s.x2}
              y2={s.y2}
              stroke={s.front ? 'rgba(250,250,249,0.10)' : 'rgba(250,250,249,0.035)'}
              strokeWidth={1}
            />
          ))}
        </g>
        <g opacity={orbits}>
          {orbitPaths.map((d, j) => (
            <path key={j} d={d} fill="none" stroke="rgba(245,158,11,0.16)" strokeWidth={1.2} />
          ))}
          {tails.map((tail, j) =>
            tail.map((s, k) => (
              <line
                key={`${j}-${k}`}
                x1={s.p0.x * R}
                y1={-s.p0.y * R}
                x2={s.p1.x * R}
                y2={-s.p1.y * R}
                stroke={COLOR.amberSoft}
                strokeOpacity={s.alpha}
                strokeWidth={2.4}
                strokeLinecap="round"
              />
            )),
          )}
          {lightHeads.map((h, j) => (
            <circle
              key={j}
              cx={h.x * R * 1.07}
              cy={-h.y * R * 1.07}
              r={4}
              fill="#FFF7E6"
              opacity={h.z > 0 ? 1 : 0.3}
              style={{ filter: 'drop-shadow(0 0 8px rgba(245,158,11,0.9))' }}
            />
          ))}
        </g>
      </svg>

      {letters.map((l) => (
        <div
          key={l.i}
          style={{
            position: 'absolute',
            left: box / 2 + l.sx,
            top: box / 2 + l.sy,
            transform: 'translate(-50%, -50%)',
            fontFamily: FONT.ui,
            fontWeight: 500,
            fontSize: l.size,
            lineHeight: 1,
            color: l.illum > 0.05 ? mixToAmber(l.illum) : COLOR.text,
            opacity: l.alpha,
            textShadow: l.illum > 0.15 ? `0 0 ${14 * l.illum}px rgba(245,158,11,${0.8 * l.illum})` : undefined,
            ...(tiles
              ? {
                  width: l.size * 1.45,
                  height: l.size * 1.45,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: l.size * 0.32,
                  background: `rgba(250,250,249,${0.03 + 0.05 * l.depth})`,
                  border: `1px solid ${l.illum > 0.2 ? `rgba(245,158,11,${0.6 * l.illum})` : `rgba(250,250,249,${0.06 + 0.12 * l.depth})`}`,
                }
              : {}),
          }}
        >
          {l.char}
        </div>
      ))}
    </div>
  )
}

function mixToAmber(t: number): string {
  const a = [250, 250, 249]
  const b = [251, 191, 36]
  const m = Math.min(1, t * 1.4)
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * m)).join(',')})`
}
