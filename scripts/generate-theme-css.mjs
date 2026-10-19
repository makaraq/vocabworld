// Writes app/themes.css: the looks behind lib/themes.ts.
//
// Every theme sets the backdrop (--app-backdrop). Some also tint the Liquid
// Glass and swap the app's blue accent. A light theme (Paper) turns the
// app's white-on-glass into dark ink on lighter glass by overriding the
// white-alpha utilities the app uses; anything inside [data-keep-colors]
// (the paywall, the theme swatches) keeps its own colours.
//
// A theme can also set `solid` (the panel colour under Reduce Transparency),
// any Liquid Glass variable (`vars`, see app/liquid-glass.css), and extra
// `rules`. The rules go inside @layer base: the glass's own !important rules
// live there, and a layered !important beats an unlayered one, so only a
// rule in the same layer with a more specific selector can override them.
//
// Run: node scripts/generate-theme-css.mjs

import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const THEMES = {
  mono: {
    backdrop: "url('/themes/mono.jpg') center / cover no-repeat",
  },
  'plum-duotone': {
    backdrop: "url('/themes/plum-duotone.jpg') center / cover no-repeat",
  },
  paper: {
    backdrop:
      'radial-gradient(70% 40% at 85% 10%, #fde1c4 0%, transparent 70%), radial-gradient(80% 45% at 10% 90%, #f5c4a1 0%, transparent 70%), linear-gradient(180deg, #fbf1e4 0%, #f1d9c0 100%) #f6e7d6',
    ink: '42, 23, 16',
    accent: '194, 65, 12',
    glass: ['rgba(255, 255, 255, 0.5)', 'rgba(255, 255, 255, 0.72)'],
    solid: '#f6e7d6',
  },
  'rose-glass': {
    backdrop: 'linear-gradient(165deg, #9f1239 0%, #f43f5e 45%, #fdba74 100%) #fb7185',
    accent: '253, 230, 138',
    glass: ['rgba(255, 228, 230, 0.16)', 'rgba(255, 228, 230, 0.3)'],
    solid: '#7f1d33',
  },
  obsidian: obsidian(),
}

// Obsidian: black glass with a thin liquid-chrome rim, like machined keys.
// The centre of every surface stays near black; light lives only on the
// edges: a silver rim with small cyan, blue, violet, magenta and amber
// flares at two corners, a restrained specular at the top left, a bright
// bevel line on top and a dark one underneath.
function obsidian() {
  const G = 'html.theme-obsidian.liquid-glass'
  const panels = `:is(
    .bg-white\\/5.backdrop-blur-3xl,
    .fixed.inset-0 > [class*="backdrop-blur"][class*="rounded"]:not([data-keep-colors]),
    .fixed.inset-0.items-end > [class*="rounded-t-3xl"]:not([data-keep-colors])
  )`
  // Topic and language tiles (the glass's own selector for them).
  const tiles = '.grid > button.bg-black\\/40'
  // The glass controls that respond to a press (liquid-glass.css's list).
  const pressable = `
    button.rounded-full.backdrop-blur-xl,
    button.rounded-full.bg-white\\/5,
    button.rounded-full.bg-white\\/10,
    button.rounded-full.bg-black\\/20,
    [data-tour="learning-controls"] > button,
    [data-tour="language-switcher"] button,
    button.w-full.bg-white\\/10.backdrop-blur-sm:is(.rounded-xl, .rounded-2xl),
    .fixed.inset-0 > [class*="backdrop-blur"] button.w-full:is(.bg-white\\/15, .bg-black\\/20),
    .fixed.inset-0 > [class*="backdrop-blur"] .flex > button.flex-1.rounded-lg.bg-white\\/20
  `
  // Opaque stand-ins for when transparency is reduced.
  const solidVars = `--lg-fill: #12131a; --lg-fill-active: #1b1d26; --lg-vibrancy: none; --lg-vibrancy-active: none; --ob-panel: var(--lg-solid); --ob-fill-play: #161720; --ob-fill-play-active: #1f2130; --ob-fill-dots: #12131a;`

  // The chrome rim: a silver line, bright along the top and dim along the
  // bottom, with iridescent flares laid along the curve of the top-left and
  // bottom-right corners. Placed in px from the corners rather than along
  // one diagonal gradient, so they stay small on wide capsules. R is the
  // corner radius they follow; each flare is a small soft spot that only
  // shows where the ring is.
  const rim = (R, size, silver, tl, br) => {
    const arc = [20, 45, 70, 90].map((a) => {
      const t = (a * Math.PI) / 180
      return [Math.round(R * (1 - Math.cos(t)) * 10) / 10, Math.round(R * (1 - Math.sin(t)) * 10) / 10]
    })
    const spot = (x, y, color) => `radial-gradient(circle ${size}px at ${x} ${y}, ${color}, transparent)`
    return [
      ...arc.map(([x, y], i) => spot(`${x}px`, `${y}px`, tl[i])),
      ...arc.map(([x, y], i) => spot(`calc(100% - ${x}px)`, `calc(100% - ${y}px)`, br[i])),
      `linear-gradient(180deg, ${silver})`,
    ].join(',\n        ')
  }
  const controlRim = (R, size) => rim(
    R, size,
    'rgba(255, 255, 255, 0.62) 0%, rgba(255, 255, 255, 0.2) 32%, rgba(255, 255, 255, 0.07) 68%, rgba(255, 255, 255, 0.16) 100%',
    ['rgba(184, 123, 255, 0.85)', 'rgba(109, 134, 255, 0.95)', 'rgba(159, 240, 255, 0.95)', '#fff'],
    ['rgba(255, 194, 122, 0.8)', 'rgba(255, 122, 208, 0.8)', 'rgba(127, 180, 255, 0.75)', 'rgba(143, 243, 255, 0.6)'],
  )
  return {
    backdrop: [
      'radial-gradient(120% 55% at 50% -8%, rgba(140, 155, 210, 0.2) 0%, transparent 60%)',
      'radial-gradient(70% 40% at 0% 100%, rgba(40, 120, 150, 0.14) 0%, transparent 65%)',
      'radial-gradient(70% 40% at 100% 85%, rgba(110, 70, 170, 0.14) 0%, transparent 65%)',
      '#05060a',
    ].join(', '),
    // Deep enough for white text on it, light enough to read as text on black.
    accent: '84, 112, 232',
    solid: '#090a0f',
    vars: {
      '--lg-fill': 'rgba(7, 8, 12, 0.8)',
      '--lg-fill-active': 'rgba(16, 18, 26, 0.9)',
      // No brightness(): it would lift the blacks to grey.
      '--lg-vibrancy': 'blur(10px) saturate(120%)',
      '--lg-vibrancy-active': 'blur(10px) saturate(130%) brightness(1.1)',
      '--lg-lift': '0 1px 0 rgba(255, 255, 255, 0.05), 0 2px 6px rgba(0, 0, 0, 0.55), 0 14px 30px rgba(0, 0, 0, 0.6)',
      '--lg-glow-active': '0 0 18px rgba(150, 170, 255, 0.25)',
      // Corners of about 20px: the round buttons and the capsules.
      '--lg-rim-light': controlRim(20, 8),
      // Corners of 36px: panels, modals, sheets. Calmer.
      '--lg-rim-light-panel': rim(
        36, 13,
        'rgba(255, 255, 255, 0.34) 0%, rgba(255, 255, 255, 0.1) 22%, rgba(255, 255, 255, 0.035) 60%, rgba(255, 255, 255, 0.07) 100%',
        ['rgba(184, 123, 255, 0.45)', 'rgba(109, 134, 255, 0.55)', 'rgba(159, 240, 255, 0.6)', 'rgba(255, 255, 255, 0.8)'],
        ['rgba(255, 194, 122, 0.4)', 'rgba(255, 122, 208, 0.42)', 'rgba(127, 180, 255, 0.4)', 'rgba(143, 243, 255, 0.3)'],
      ),
      '--lg-body': `radial-gradient(120% 70% at 16% -12%, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.05) 32%, transparent 55%),
        radial-gradient(100% 60% at 50% 125%, rgba(150, 170, 255, 0.08) 0%, transparent 60%)`,
      '--lg-sheen': 'linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.03) 40%, transparent 62%, rgba(255, 255, 255, 0.04) 100%)',
      '--lg-sheen-panel': 'linear-gradient(160deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.015) 30%, transparent 55%, rgba(255, 255, 255, 0.03) 100%)',
      '--lg-rim': 'inset 0 1px 0 rgba(255, 255, 255, 0.28), inset 1px 0 0 rgba(255, 255, 255, 0.08), inset 0 -1px 0 rgba(0, 0, 0, 0.6)',
      '--lg-rim-panel': 'inset 0 1px 0 rgba(255, 255, 255, 0.16), inset 0 -1px 0 rgba(0, 0, 0, 0.5)',
      '--lg-lift-panel': '0 30px 70px rgba(0, 0, 0, 0.6), 0 8px 20px rgba(0, 0, 0, 0.45)',
      '--lg-backdrop': 'blur(14px) saturate(120%)',
      '--ob-panel': 'rgba(6, 7, 11, 0.6)',
      '--ob-fill-play': 'rgba(14, 15, 21, 0.85)',
      '--ob-fill-play-active': 'rgba(24, 26, 36, 0.92)',
      '--ob-fill-dots': 'rgba(7, 8, 12, 0.7)',
      // Tiles: a plain silver hairline, lit along the top. Six of them side
      // by side with iridescent corners each was too busy.
      '--ob-rim-tile': 'linear-gradient(180deg, rgba(255, 255, 255, 0.24) 0%, rgba(255, 255, 255, 0.07) 28%, rgba(255, 255, 255, 0.03) 70%, rgba(255, 255, 255, 0.05) 100%)',
      // Flashcards (24px corners): content, so a little quieter than the
      // controls.
      '--ob-rim-card': rim(
        24, 10,
        'rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0.14) 26%, rgba(255, 255, 255, 0.05) 66%, rgba(255, 255, 255, 0.1) 100%',
        ['rgba(184, 123, 255, 0.65)', 'rgba(109, 134, 255, 0.75)', 'rgba(159, 240, 255, 0.8)', 'rgba(255, 255, 255, 0.9)'],
        ['rgba(255, 194, 122, 0.6)', 'rgba(255, 122, 208, 0.6)', 'rgba(127, 180, 255, 0.55)', 'rgba(143, 243, 255, 0.45)'],
      ),
    },
    // Unlayered, these beat the glass's layered variables, Reduce
    // Transparency's included, so they're restated for it here.
    extra: [
      `${G}.reduce-transparency { ${solidVars} }`,
      `@media (prefers-reduced-transparency: reduce) { ${G} { ${solidVars} } }`,
      // A cooler, fainter glow under a finger than the default white. Only
      // on the pressed control: :active also matches its ancestors, and the
      // glow is inherited, so a broader rule lights up every control.
      `${G} :is(${pressable}):not(:disabled):active { --lg-touch: rgba(150, 175, 255, 0.2); }`,
      // Controls that set their own fill or rim.
      `${G} [data-tour="learning-controls"] > button.w-16 { --lg-fill: var(--ob-fill-play); --lg-fill-active: var(--ob-fill-play-active); }`,
      `${G} nav[data-tour="section-nav"] { --lg-fill: var(--ob-fill-dots); }`,
      // The bigger playback buttons, so the flares follow their curve.
      `${G} [data-tour="learning-controls"] > button.w-14 { --lg-rim-light: ${controlRim(28, 10)}; }`,
      `${G} [data-tour="learning-controls"] > button.w-16 { --lg-rim-light: ${controlRim(32, 11)}; }`,
      // The passive label and page-dots capsule: small corners, less light.
      `${G} :is(span.bg-white\\/10.rounded-lg.tracking-wider, nav[data-tour="section-nav"]) { --lg-rim-light: ${rim(
        13, 6,
        'rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.12) 40%, rgba(255, 255, 255, 0.05) 70%, rgba(255, 255, 255, 0.1) 100%',
        ['rgba(184, 123, 255, 0.5)', 'rgba(109, 134, 255, 0.6)', 'rgba(159, 240, 255, 0.6)', 'rgba(255, 255, 255, 0.7)'],
        ['rgba(255, 194, 122, 0.45)', 'rgba(255, 122, 208, 0.45)', 'rgba(127, 180, 255, 0.4)', 'rgba(143, 243, 255, 0.35)'],
      )}; }`,
    ],
    rules: [
      // Panels, modals and sheets: near-black glass, not milky white.
      `${G} ${panels} { background-color: var(--ob-panel) !important; border-color: rgba(255, 255, 255, 0.07) !important; }`,
      // Topic and language tiles and the flashcards: the same black glass,
      // with a chrome ring of their own (they have no glass ::before) and a
      // restrained specular. The ring sits inside the border box, so a
      // topic's completion tier (its 2px border) still shows around it.
      `${G} :is(${tiles}, .flashcard-scale) { position: relative; }`,
      `${G} :is(${tiles}, .flashcard-scale)::before { content: ""; position: absolute; inset: 0; border-radius: inherit; padding: 1.5px; pointer-events: none; background: var(--ob-rim-tile); -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; }`,
      `${G} ${tiles} { background-image: radial-gradient(120% 70% at 16% -12%, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.03) 32%, transparent 55%) !important; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4), 0 10px 24px rgba(0, 0, 0, 0.45) !important; }`,
      `${G} ${tiles}::before { padding: 1px; }`,
      `${G} ${tiles}.border-2::before { border-radius: calc(var(--lg-radius-tile) - 2px); }`,
      // Plain tiles' grey border would double the ring; tiers keep theirs.
      `${G} ${tiles}.border-white\\/20 { border-color: transparent !important; }`,
      `${G} .flashcard-scale::before { border-radius: calc(var(--lg-radius-card) - 1px); background: var(--ob-rim-card); }`,
      // The card being spoken keeps its accent border, outside the ring.
      `${G} .flashcard-scale:not(.border-blue-400\\/30) { border-color: transparent !important; }`,
      `${G} .flashcard-scale { background-image: radial-gradient(90% 60% at 12% -10%, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 35%, transparent 60%) !important; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.45), 0 16px 36px rgba(0, 0, 0, 0.5) !important; }`,
      // Content cards (account stats, settings sections): black, not grey.
      `${G} :is(div, button:not(.w-full.rounded-xl, .w-full.rounded-2xl)).bg-white\\/10.backdrop-blur-sm { background-color: rgba(255, 255, 255, 0.035) !important; box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), inset 0 -1px 0 rgba(0, 0, 0, 0.45) !important; }`,
      // Recessed tracks are dark grooves, invisible on black: lighten them.
      `${G} :is(input.slider, .bg-white\\/10.rounded-full.h-2) { background-color: rgba(255, 255, 255, 0.1) !important; box-shadow: inset 0 1px 0 rgba(0, 0, 0, 0.5), 0 1px 0 rgba(255, 255, 255, 0.05) !important; }`,
      // A brushed-silver slider knob (it still turns to glass while held).
      `${G} input.slider:not(:active)::-webkit-slider-thumb { background: linear-gradient(180deg, #fbfcff 0%, #d9dde6 55%, #aab1bf 100%) !important; box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.25), 0 2px 6px rgba(0, 0, 0, 0.6) !important; }`,
    ],
  }
}

const steps = Array.from({ length: 19 }, (_, i) => (i + 1) * 5) // 5 … 95
const KEEP = ':not([data-keep-colors], [data-keep-colors] *)'
const r = (n) => Math.round(n * 1000) / 1000
const css = [
  '/* Generated by scripts/generate-theme-css.mjs. Do not edit. */',
  '',
  ":root { --app-backdrop: url('/bg.jpeg') center / cover no-repeat; }",
]

for (const [id, t] of Object.entries(THEMES)) {
  const S = `html.theme-${id}`
  css.push('', `/* ── ${id} ── */`, `${S} { --app-backdrop: ${t.backdrop}; }`)
  if (t.glass) {
    css.push(`${S}.liquid-glass { --lg-fill: ${t.glass[0]}; --lg-fill-active: ${t.glass[1]}; }`)
  }
  if (t.solid) css.push(`${S}.liquid-glass { --lg-solid: ${t.solid}; }`)
  if (t.vars) {
    css.push(`${S}.liquid-glass {`, ...Object.entries(t.vars).map(([k, v]) => `  ${k}: ${v};`), '}')
  }
  if (t.extra) css.push(...t.extra)
  if (t.rules) css.push('@layer base {', ...t.rules.map((rule) => `  ${rule}`), '}')
  if (t.accent) {
    const A = t.accent
    css.push(
      `${S} :is(.bg-blue-400, .bg-blue-500)${KEEP} { background-color: rgb(${A}) !important; }`,
      `${S} :is(.bg-blue-500\\/20, .bg-blue-500\\/30)${KEEP} { background-color: rgba(${A}, 0.24) !important; }`,
      `${S} .border-blue-400\\/30${KEEP} { border-color: rgba(${A}, 0.55) !important; }`,
      `${S} :is(.text-blue-200, .text-blue-300, .text-blue-400)${KEEP} { color: rgb(${A}) !important; }`,
    )
  }
  if (t.ink) {
    const T = t.ink
    css.push(`${S} .text-white${KEEP} { color: rgb(${T}) !important; }`)
    for (const n of steps) css.push(`${S} .text-white\\/${n}${KEEP} { color: rgba(${T}, ${r(Math.min(1, n / 100 + 0.1))}) !important; }`)
    for (const n of steps) css.push(`${S} .placeholder\\:text-white\\/${n}${KEEP}::placeholder { color: rgba(${T}, ${r(Math.min(0.7, n / 100 + 0.15))}) !important; }`)
    css.push(`${S} .border-white${KEEP} { border-color: rgba(${T}, 0.4) !important; }`)
    for (const n of steps) css.push(`${S} .border-white\\/${n}${KEEP} { border-color: rgba(${T}, ${r((n / 100) * 0.6)}) !important; }`)
    for (const n of [...steps, 8]) css.push(`${S} .bg-white\\/${n}${KEEP} { background-color: rgba(255, 255, 255, ${r(Math.min(0.95, 0.25 + (n / 100) * 1.4))}) !important; }`)
    for (const n of steps) css.push(`${S} .bg-black\\/${n}${KEEP} { background-color: rgba(${T}, ${r((n / 100) * 0.32)}) !important; }`)
    // Icons the app colours inline, as on the topic tiles.
    css.push(`${S} :is([style*="color: rgba(255, 255, 255"], [style*="color:rgba(255,255,255"])${KEEP} { color: rgba(${T}, 0.78) !important; }`)
    css.push(`${S}.liquid-glass { --lg-lift: 0 1px 2px rgba(${T}, 0.08), 0 8px 22px rgba(${T}, 0.12); }`)
  }
}

writeFileSync(join(root, 'app', 'themes.css'), css.join('\n') + '\n')
console.log('wrote app/themes.css')
