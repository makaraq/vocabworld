import { interpolate } from 'remotion'

// The film's colours, sampled from the app's own backdrop (public/app/bg.jpeg):
// plum at the top, through red and orange to a yellow glow, with the teal
// from its left edge as the one cool accent.

export const P = {
  skyTop: '#3a2433',
  skyHigh: '#6c2e33',
  skyMid: '#ac3a2f',
  skyLow: '#df5527',
  skyGlow: '#f87117',
  horizon: '#ff9a1a',
  sun: '#ffd24a',
  sunCore: '#fff1b8',

  // Buildings, far to near: hazier and redder further away.
  far: '#8f3a33',
  farShade: '#7a2f2e',
  mid: '#6a2a2e',
  midShade: '#561f27',
  near: '#3f1a24',
  nearShade: '#2e121b',
  roof: '#2a1622',
  trim: '#a5503c',
  trimNear: '#5a2632',

  glassLit: '#ffc65a',
  glassWarm: '#ffad42',
  glassDark: '#2a1620',

  street: '#4a2027',
  cobble: '#5c2a2c',
  cobbleLight: '#7a3a33',
  curb: '#8a4436',

  teal: '#0b7a63',
  tealDark: '#075446',
  tealLight: '#16a383',

  signFace: '#fff4e0',
  signInk: '#1e3a8a',
  enamel: '#1d4ed8',

  amber: '#F59E0B',
  amberSoft: '#FBBF24',
  cream: '#f3e3c3',
  awningRed: '#b0302a',
  ink: '#1a0f14',
} as const

export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

export interface Camera {
  /** World point at the centre of the frame. */
  x: number
  y: number
  zoom: number
}

/**
 * The SVG transform for a layer seen through `cam`. `depth` is parallax: 1
 * moves with the world, 0 stays put, in between drifts less. All layers line
 * up when the camera is at `ref`.
 */
export function view(cam: Camera, depth = 1, ref: { x: number; y: number } = { x: 540, y: 960 }) {
  const zoom = 1 + (cam.zoom - 1) * depth
  const x = ref.x + (cam.x - ref.x) * depth
  const y = ref.y + (cam.y - ref.y) * depth
  return `translate(540 960) scale(${zoom}) translate(${-x} ${-y})`
}

/** A camera moving through keyframes [frame, camera], eased. */
export function cameraAt(frame: number, keys: [number, Camera][], easing?: (t: number) => number): Camera {
  const frames = keys.map(([f]) => f)
  const opts = { ...clamp, ...(easing ? { easing } : {}) }
  return {
    x: interpolate(frame, frames, keys.map(([, c]) => c.x), opts),
    y: interpolate(frame, frames, keys.map(([, c]) => c.y), opts),
    zoom: interpolate(frame, frames, keys.map(([, c]) => c.zoom), opts),
  }
}
