// Brand tokens for the film's own layer (everything outside the phone).
// The phone screens use the app's CSS instead; see src/styles.css.

export const VIDEO = {
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: 900,
} as const

export const COLOR = {
  bg: '#0C0A09',
  amber: '#F59E0B',
  amberSoft: '#FBBF24',
  text: '#FAFAF9',
} as const

/** rgba() of the primary amber, for glows. */
export const amber = (alpha: number) => `rgba(245, 158, 11, ${alpha})`

// Script fallbacks, so the hook's words never drop to a system font.
const SCRIPTS = '"Noto Sans JP", "Noto Sans KR", "Noto Sans SC", "Noto Sans Arabic", "Noto Sans Devanagari", "Noto Sans IPA"'

export const FONT = {
  /** The app's own font (app/layout.tsx), for the captions as well as the screens. Inter covers Cyrillic. */
  display: `"Space Grotesk", "Inter", ${SCRIPTS}, sans-serif`,
  /** The status bar: closest to SF. */
  system: `"Inter", sans-serif`,
} as const

/** The app's iPhone viewport: iPhone 17 Pro Max, 440 × 956 pt, as in the App Store screenshots. */
export const PHONE = { width: 440, height: 956 } as const
