import type { CSSProperties } from 'react'
import { staticFile } from 'remotion'

// Candidate looks for the app, from a nudge to a full re-theme. Used by the
// theme lab (src/ThemeLab.tsx); nothing in the film depends on it.
//
//  tweak       the app's own backdrop, recoloured: nothing else changes
//  background  a new backdrop, same glass and white text
//  full        backdrop, glass tint, text colour and accent together

export type Tier = 'tweak' | 'background' | 'full'

export interface Theme {
  id: string
  tier: Tier
  name: string
  note: string
  background: CSSProperties
  /** Text on the glass: white (default) or a dark ink, for light backdrops. */
  ink?: string
  /** Replaces the blue the app uses for toggles, selection and the playing dot. */
  accent?: string
  /** Glass fill, resting and pressed. */
  glass?: [string, string]
}

const img = (file: string): CSSProperties => ({ backgroundImage: `url('${staticFile(file)}')` })

const noise =
  `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='.5'/></svg>")`

const mesh = (base: string, ...layers: string[]): CSSProperties => ({
  backgroundColor: base,
  backgroundImage: layers.join(', '),
  backgroundSize: 'cover',
})

const blob = (at: string, color: string, size = '60% 42%', fade = 70) => `radial-gradient(${size} at ${at}, ${color} 0%, transparent ${fade}%)`

export const THEMES: Theme[] = [
  // ── A nudge: the same backdrop, recoloured ───────────────────────────
  { id: 'original', tier: 'tweak', name: 'Original', note: 'the app today', background: img('app/bg.jpeg') },
  { id: 'hue-rose', tier: 'tweak', name: 'Rose', note: 'hue −35°', background: img('themes/hue-rose.jpg') },
  { id: 'hue-lime', tier: 'tweak', name: 'Lime', note: 'hue +55°', background: img('themes/hue-lime.jpg') },
  { id: 'hue-teal', tier: 'tweak', name: 'Green', note: 'hue +130°', background: img('themes/hue-teal.jpg') },
  { id: 'hue-ocean', tier: 'tweak', name: 'Ocean', note: 'hue +190°', background: img('themes/hue-ocean.jpg') },
  { id: 'hue-indigo', tier: 'tweak', name: 'Indigo', note: 'hue +240°', background: img('themes/hue-indigo.jpg') },
  { id: 'hue-magenta', tier: 'tweak', name: 'Magenta', note: 'hue +295°', background: img('themes/hue-magenta.jpg') },
  { id: 'muted', tier: 'tweak', name: 'Muted', note: 'saturation −55%', background: img('themes/muted.jpg') },
  { id: 'dim', tier: 'tweak', name: 'Dim', note: 'brightness −45%', background: img('themes/dim.jpg') },
  { id: 'mono', tier: 'tweak', name: 'Mono', note: 'greyscale', background: img('themes/mono.jpg') },
  { id: 'duotone-plum', tier: 'tweak', name: 'Plum duotone', note: 'plum to cream', background: img('themes/duotone-plum.jpg') },

  // ── New backdrops, same glass ────────────────────────────────────────
  {
    id: 'aurora', tier: 'background', name: 'Aurora', note: 'navy, green and violet glows',
    background: mesh('#070b1a', blob('18% 16%', '#10b981', '70% 40%'), blob('88% 30%', '#7c3aed', '60% 42%'), blob('50% 104%', '#0ea5e9', '90% 46%')),
  },
  {
    id: 'dusk', tier: 'background', name: 'Dusk', note: 'indigo to peach, top to bottom',
    background: { backgroundImage: 'linear-gradient(180deg,#1e1b4b 0%,#6d28d9 30%,#db2777 60%,#fb923c 86%,#fde68a 100%)' },
  },
  {
    id: 'midnight-glow', tier: 'background', name: 'Midnight glow', note: 'near-black, one amber light',
    background: mesh('#0a0807', blob('50% 106%', '#f59e0b', '90% 50%', 72), blob('50% 100%', 'rgba(255,243,176,.8)', '34% 18%', 80)),
  },
  {
    id: 'ocean-deep', tier: 'background', name: 'Deep sea', note: 'teal to blue, light from above',
    background: mesh('#021b2b', 'linear-gradient(160deg,#021b2b 0%,#035e7b 55%,#19b5b0 100%)', blob('82% 12%', 'rgba(255,255,255,.28)', '60% 30%', 70)),
  },
  {
    id: 'candy', tier: 'background', name: 'Candy', note: 'hot pink, violet and orange',
    background: mesh('#8b5cf6', blob('15% 15%', '#ec4899', '80% 50%'), blob('90% 55%', '#fb923c', '70% 45%'), blob('30% 100%', '#6d28d9', '90% 45%')),
  },
  {
    id: 'forest', tier: 'background', name: 'Forest', note: 'deep green with a lime glow',
    background: mesh('#04140d', blob('20% 20%', '#16a34a', '80% 45%'), blob('85% 85%', 'rgba(163,230,53,.8)', '70% 40%'), 'linear-gradient(180deg,rgba(0,0,0,0) 40%,rgba(0,0,0,.45))'),
  },
  {
    id: 'ember', tier: 'background', name: 'Ember', note: 'black to red to orange',
    background: mesh('#0c0403', 'linear-gradient(180deg,#0c0403 0%,#5b1010 55%,#c2410c 100%)', blob('50% 100%', 'rgba(253,186,116,.85)', '70% 30%', 75)),
  },
  {
    id: 'steel-grain', tier: 'background', name: 'Steel grain', note: 'graphite with film grain',
    background: { backgroundImage: `${noise}, linear-gradient(160deg,#1f2937 0%,#4b5563 60%,#9ca3af 130%)`, backgroundSize: '260px 260px, cover' },
  },
  {
    id: 'lava', tier: 'background', name: 'Lava lamp', note: 'soft blobs on deep purple',
    background: mesh('#1a0b2e', blob('20% 25%', '#f97316', '55% 30%'), blob('80% 40%', '#ec4899', '60% 32%'), blob('35% 78%', '#8b5cf6', '60% 32%'), blob('85% 95%', '#facc15', '50% 24%', 65)),
  },

  // ── Full re-themes: backdrop, glass, text and accent ─────────────────
  {
    id: 'midnight-amber', tier: 'full', name: 'Midnight amber', note: 'near-black, amber accent',
    background: mesh('#0a0807', blob('50% 108%', '#b45309', '90% 48%', 72), blob('50% 100%', 'rgba(251,191,36,.6)', '34% 16%', 80)),
    accent: '#f59e0b', glass: ['rgba(255,244,224,0.08)', 'rgba(255,244,224,0.17)'],
  },
  {
    id: 'paper', tier: 'full', name: 'Paper', note: 'warm light, dark ink, terracotta accent',
    background: mesh('#f6e7d6', blob('85% 10%', '#fde1c4', '70% 40%'), blob('10% 90%', '#f5c4a1', '80% 45%'), 'linear-gradient(180deg,#fbf1e4 0%,#f1d9c0 100%)'),
    ink: '#2a1710', accent: '#c2410c', glass: ['rgba(255,255,255,0.5)', 'rgba(255,255,255,0.72)'],
  },
  {
    id: 'mint-light', tier: 'full', name: 'Mint light', note: 'fresh light, teal accent',
    background: mesh('#dff5ee', blob('15% 10%', '#b8ece0', '80% 45%'), blob('90% 85%', '#c9e6f7', '80% 45%'), 'linear-gradient(180deg,#eefaf6 0%,#cfeee6 100%)'),
    ink: '#0d2b27', accent: '#0f766e', glass: ['rgba(255,255,255,0.55)', 'rgba(255,255,255,0.78)'],
  },
  {
    id: 'sunrise-light', tier: 'full', name: 'Sunrise light', note: 'peach to lemon, orange accent',
    background: { backgroundImage: 'linear-gradient(170deg,#ffe4d6 0%,#ffd1b0 45%,#ffeaa7 100%)' },
    ink: '#3a1d0e', accent: '#ea580c', glass: ['rgba(255,255,255,0.5)', 'rgba(255,255,255,0.74)'],
  },
  {
    id: 'ink', tier: 'full', name: 'Ink', note: 'pure black, white hairlines, no colour',
    background: { backgroundColor: '#000', backgroundImage: 'none' },
    accent: '#ffffff', glass: ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.15)'],
  },
  {
    id: 'neon', tier: 'full', name: 'Neon', note: 'deep violet, cyan accent',
    background: mesh('#0b0320', blob('15% 15%', '#c026d3', '70% 40%'), blob('90% 70%', '#06b6d4', '70% 45%'), 'linear-gradient(180deg,rgba(0,0,0,0) 50%,rgba(0,0,0,.5))'),
    accent: '#22d3ee', glass: ['rgba(230,220,255,0.09)', 'rgba(230,220,255,0.2)'],
  },
  {
    id: 'forest-night', tier: 'full', name: 'Forest night', note: 'dark green, lime accent',
    background: mesh('#04140d', blob('20% 15%', '#166534', '80% 45%'), blob('85% 95%', 'rgba(132,204,22,.55)', '70% 38%')),
    accent: '#a3e635', glass: ['rgba(220,255,230,0.08)', 'rgba(220,255,230,0.18)'],
  },
  {
    id: 'rose-glass', tier: 'full', name: 'Rose glass', note: 'rose to apricot, rose-tinted glass',
    background: mesh('#fb7185', 'linear-gradient(165deg,#9f1239 0%,#f43f5e 45%,#fdba74 100%)'),
    accent: '#fde68a', glass: ['rgba(255,228,230,0.16)', 'rgba(255,228,230,0.3)'],
  },
]

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`
}

/** The overrides that turn the app's white-on-blue into a theme's text and accent. */
export function themeCss(t: Theme): string {
  const out: string[] = []
  const T = t.ink ? rgb(t.ink) : null
  if (t.glass) {
    out.push(`.th .app-ui.liquid-glass { --lg-fill: ${t.glass[0]} !important; --lg-fill-active: ${t.glass[1]} !important; }`)
  }
  if (T) {
    out.push(`.th .text-white { color: rgb(${T}) !important; }`)
    for (const n of [30, 40, 50, 60, 70, 80, 90]) out.push(`.th .text-white\\/${n} { color: rgba(${T},${n / 100 + 0.08}) !important; }`)
    for (const n of [10, 15, 20, 25, 30, 40]) out.push(`.th .border-white\\/${n} { border-color: rgba(${T},${n / 100 * 0.7}) !important; }`)
    for (const [k, a] of [[5, 0.32], [10, 0.45], [20, 0.62], [30, 0.72], [40, 0.8], [80, 0.95]] as const) out.push(`.th .bg-white\\/${k} { background-color: rgba(255,255,255,${a}) !important; }`)
    for (const [k, a] of [[20, 0.08], [30, 0.1], [40, 0.13], [50, 0.18]] as const) out.push(`.th .bg-black\\/${k} { background-color: rgba(${T},${a}) !important; }`)
    out.push(`.th [style*="color: rgba(255, 255, 255"] { color: rgba(${T},0.78) !important; }`)
    out.push(`.th .w-6.h-6.flex-shrink-0 svg [fill="#fff"] { fill: rgb(${T}) !important; }`)
    out.push(`.th .w-6.h-6.flex-shrink-0 svg [stroke="#fff"] { stroke: rgb(${T}) !important; }`)
    out.push(`.th input::placeholder { color: rgba(${T},0.6) !important; }`)
    out.push(`.th .app-ui { --lg-lift: 0 1px 2px rgba(60,30,10,0.08), 0 8px 22px rgba(60,30,10,0.12); }`)
  }
  if (t.accent) {
    const A = rgb(t.accent)
    out.push(`.th .bg-blue-500, .th .bg-blue-400 { background-color: rgb(${A}) !important; }`)
    out.push(`.th .bg-blue-500\\/20, .th .bg-blue-500\\/30 { background-color: rgba(${A},0.24) !important; }`)
    out.push(`.th .border-blue-400\\/30 { border-color: rgba(${A},0.55) !important; }`)
    out.push(`.th .text-blue-400, .th .text-blue-200 { color: rgb(${A}) !important; }`)
  }
  return out.join('\n')
}
