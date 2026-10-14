// Brand tokens for the film's own layer (everything outside the phone).
// The phone screens use the app's CSS instead; see src/styles.css.

export const VIDEO = {
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: 1110,
} as const

export const COLOR = {
  bg: '#0C0A09',
  elevated: '#171513',
  card: '#1C1917',
  border: '#292524',
  amber: '#F59E0B',
  amberSoft: '#FBBF24',
  text: '#FAFAF9',
  text2: '#A8A29E',
  muted: '#78716C',
  success: '#4ADE80',
} as const

/** rgba() of the primary amber, for glows and hairlines. */
export const amber = (alpha: number) => `rgba(245, 158, 11, ${alpha})`
export const white = (alpha: number) => `rgba(250, 250, 249, ${alpha})`

// Script fallbacks shared by every stack, so multilingual labels and the
// globe's characters never drop to a system font.
const SCRIPTS =
  '"Noto Sans JP", "Noto Sans KR", "Noto Sans Arabic", "Noto Sans Hebrew", "Noto Sans Devanagari", "Noto Sans Thai", "Noto Sans IPA"'

export const FONT = {
  ui: `"Inter", ${SCRIPTS}, sans-serif`,
  serif: `"Instrument Serif", Georgia, ${SCRIPTS}, serif`,
  mono: `"JetBrains Mono", "Noto Sans IPA", ${SCRIPTS}, monospace`,
  /** The app's UI font (app/layout.tsx). */
  app: `"Space Grotesk", ${SCRIPTS}, sans-serif`,
} as const

/** The app's iPhone viewport: iPhone 17 Pro Max, 440 × 956 pt, as in the App Store screenshots. */
export const PHONE = { width: 440, height: 956 } as const
