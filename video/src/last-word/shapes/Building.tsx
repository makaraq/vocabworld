import React from 'react'
import { random } from 'remotion'
import { P } from '../palette'

// A Haussmann façade: a tall ground floor, five floors of tall windows with
// iron balconies on the second and fifth, cornices, and a zinc mansard roof
// with dormers and chimney stacks. `x` is the left edge, `y` the pavement.

export interface Tone {
  wall: string
  shade: string
  trim: string
  roof: string
  /** Chance a window is lit. */
  lit: number
}

export const NEAR: Tone = { wall: P.near, shade: P.nearShade, trim: P.trimNear, roof: P.roof, lit: 0.35 }
export const MID: Tone = { wall: P.mid, shade: P.midShade, trim: P.trim, roof: P.roof, lit: 0.45 }
export const FAR: Tone = { wall: P.far, shade: P.farShade, trim: '#b4614a', roof: '#5a2530', lit: 0.3 }

export const Building: React.FC<{
  x: number
  y: number
  w: number
  tone: Tone
  seed: string
  floors?: number
  groundH?: number
  floorH?: number
  bay?: number
  /** A dome over the middle, as on the corner buildings at a fork. */
  dome?: boolean
  /** Skip the ground floor (the café draws its own). */
  noGround?: boolean
  detail?: 'full' | 'low'
}> = ({ x, y, w, tone, seed, floors = 5, groundH = 150, floorH = 112, bay = 110, dome = false, noGround = false, detail = 'full' }) => {
  const bays = Math.max(1, Math.round(w / bay))
  const bw = w / bays
  const top = y - groundH - floors * floorH
  const roofH = floorH * 0.95
  const lit = (key: string) => random(`${seed}-${key}`) < tone.lit
  const els: React.ReactNode[] = []

  // Wall, with a darker band down one side for depth.
  els.push(<rect key="wall" x={x} y={top} width={w} height={y - top} fill={tone.wall} />)
  els.push(<rect key="wallshade" x={x + w - 14} y={top} width={14} height={y - top} fill={tone.shade} />)

  // Ground floor: arched openings, some lit.
  if (!noGround) {
    els.push(<rect key="ground" x={x} y={y - groundH} width={w} height={groundH} fill={tone.shade} />)
    for (let b = 0; b < bays; b++) {
      const ox = x + b * bw + bw * 0.16
      const ow = bw * 0.68
      const oh = groundH * 0.78
      const oy = y - oh
      const on = lit(`g${b}`)
      els.push(
        <path
          key={`arch${b}`}
          d={`M ${ox} ${y} V ${oy + ow / 2} A ${ow / 2} ${ow / 2} 0 0 1 ${ox + ow} ${oy + ow / 2} V ${y} Z`}
          fill={on ? P.glassWarm : P.glassDark}
          opacity={on ? 0.9 : 1}
        />,
      )
    }
  }
  els.push(<rect key="gcornice" x={x - 4} y={y - groundH - 10} width={w + 8} height={12} fill={tone.trim} />)

  // Floors.
  for (let f = 0; f < floors; f++) {
    const fy = y - groundH - (f + 1) * floorH
    const balcony = f === 1 || f === floors - 1
    for (let b = 0; b < bays; b++) {
      const ww = bw * 0.44
      const wh = floorH * 0.62
      const wx = x + b * bw + (bw - ww) / 2
      const wy = fy + floorH * 0.2
      const on = lit(`w${f}-${b}`)
      els.push(<rect key={`w${f}-${b}`} x={wx} y={wy} width={ww} height={wh} fill={on ? P.glassLit : P.glassDark} />)
      if (detail === 'full') {
        if (!on) els.push(<rect key={`r${f}-${b}`} x={wx + ww * 0.12} y={wy + 4} width={ww * 0.18} height={wh * 0.7} fill="rgba(255,170,90,0.10)" />)
        els.push(<rect key={`m${f}-${b}`} x={wx + ww / 2 - 1.5} y={wy} width={3} height={wh} fill={tone.shade} />)
        els.push(<rect key={`p${f}-${b}`} x={wx - 6} y={wy - 10} width={ww + 12} height={6} fill={tone.trim} />)
        if (!balcony) {
          // A small rail across the lower window.
          els.push(<rect key={`g${f}-${b}`} x={wx - 2} y={wy + wh - 22} width={ww + 4} height={3} fill={P.ink} opacity={0.75} />)
          for (let k = 0; k <= 5; k++) {
            els.push(<rect key={`gb${f}-${b}-${k}`} x={wx + (k * ww) / 5 - 1} y={wy + wh - 22} width={2} height={22} fill={P.ink} opacity={0.6} />)
          }
        }
      }
    }
    if (balcony) {
      const by = fy + floorH * 0.2 + floorH * 0.62 - 26
      els.push(<rect key={`bs${f}`} x={x - 6} y={by + 26} width={w + 12} height={8} fill={tone.trim} />)
      els.push(<rect key={`br${f}`} x={x - 4} y={by} width={w + 8} height={4} fill={P.ink} />)
      if (detail === 'full') {
        const n = Math.round(w / 14)
        for (let k = 0; k <= n; k++) {
          els.push(<rect key={`bb${f}-${k}`} x={x + (k * w) / n - 1} y={by} width={2.4} height={26} fill={P.ink} opacity={0.85} />)
        }
      }
    }
  }

  // Cornice and mansard.
  els.push(<rect key="cornice" x={x - 10} y={top - 12} width={w + 20} height={16} fill={tone.trim} />)
  els.push(<path key="roof" d={`M ${x - 8} ${top - 10} L ${x + 18} ${top - roofH} L ${x + w - 18} ${top - roofH} L ${x + w + 8} ${top - 10} Z`} fill={tone.roof} />)
  for (let b = 0; b < bays; b += 2) {
    const dw = bw * 0.36
    const dx = x + b * bw + (bw - dw) / 2
    const dy = top - roofH * 0.82
    const on = lit(`d${b}`)
    els.push(
      <path
        key={`dorm${b}`}
        d={`M ${dx - 8} ${top - 10} V ${dy + 6} A ${dw / 2 + 8} ${dw / 2 + 8} 0 0 1 ${dx + dw + 8} ${dy + 6} V ${top - 10} Z`}
        fill={tone.trim}
      />,
    )
    els.push(<rect key={`dw${b}`} x={dx} y={dy + 10} width={dw} height={roofH * 0.6} fill={on ? P.glassLit : P.glassDark} />)
  }
  // Chimney stacks.
  for (let c = 0; c < Math.max(1, Math.floor(bays / 2)); c++) {
    const cx = x + w * (0.2 + 0.6 * random(`${seed}-c${c}`))
    const ch = 40 + 30 * random(`${seed}-ch${c}`)
    els.push(<rect key={`ch${c}`} x={cx} y={top - roofH - ch} width={34} height={ch + 4} fill={tone.roof} />)
    for (let k = 0; k < 3; k++) {
      els.push(<rect key={`cp${c}-${k}`} x={cx + 3 + k * 10} y={top - roofH - ch - 12} width={7} height={12} fill={tone.trim} opacity={0.8} />)
    }
  }
  if (dome) {
    const cx = x + w / 2
    const dy = top - roofH
    els.push(<rect key="drum" x={cx - 80} y={dy - 50} width={160} height={52} fill={tone.trim} />)
    els.push(<path key="dome" d={`M ${cx - 92} ${dy - 48} Q ${cx - 92} ${dy - 190} ${cx} ${dy - 200} Q ${cx + 92} ${dy - 190} ${cx + 92} ${dy - 48} Z`} fill={tone.roof} />)
    for (const k of [-0.55, 0, 0.55]) {
      els.push(<path key={`rib${k}`} d={`M ${cx + 92 * k} ${dy - 48} Q ${cx + 60 * k} ${dy - 170} ${cx} ${dy - 200}`} stroke={tone.trim} strokeWidth={4} fill="none" opacity={0.6} />)
    }
    els.push(<rect key="lantern" x={cx - 14} y={dy - 246} width={28} height={50} fill={tone.trim} />)
    els.push(<circle key="finial" cx={cx} cy={dy - 254} r={9} fill={tone.trim} />)
  }
  return <g>{els}</g>
}
