import { VIDEO } from './theme'

// The film's timeline, in frames of the master composition (30fps). The
// score runs at 120 BPM, so a beat is exactly 15 frames and the big moments
// land on beats.
//
//   0–102  Hook: "hello" in twelve languages, landing on "bonjour"
//  96–822  The app, one continuous session on one phone
// 810–900  End card

export const HOOK = { from: 0, durationInFrames: 102 }
export const DEMO = { from: 96, durationInFrames: 726 }
export const END = { from: 810, durationInFrames: 90 }

/** When each "hello" lands; the last (bonjour) on beat 5. */
export const HOOK_FLIPS = [0, 8, 15, 22, 30, 34, 38, 41, 45, 49, 53, 56, 60]
export const HOOK_LAND = 60

/** What happens in the app, and when. */
export const T = {
  // Pick a language
  tapFrench: 118,
  releaseFrench: 128,
  menu: 134, // the topic menu replaces the picker, 200ms after the tap
  // The topic menu
  swipeLeft: 150, // drag toward DAILY LIFE …
  swipeLeftRelease: 158,
  swipeRight: 180, // … and back to FIRST AID KIT
  swipeRightRelease: 188,
  tapDirections: 204,
  releaseDirections: 214,
  learning: 220,
  // Learning, autoplay
  tapPlay: 230,
  autoplay: 240,
  autoplayTiming: { training: 13, main: 9, pause: 5 },
  autoplayWords: 4, // gauche, droite, tout droit, tourner
  tapStop: 345,
  stopped: 348,
  // Settings: slow it down, speed it up
  tapGear: 354,
  settings: 360,
  scrollFrom: 372,
  scrollTo: 392,
  tapSlow: 402,
  tapFast: 420,
  tapDone: 434,
  settingsClosed: 440,
  // Back to the first word
  tapPrev: [446, 452, 458],
  // Example sentences
  longPress: 468,
  examples: 482,
  tapNext: 506,
  tapAdd: 524,
  // Add to playlist
  playlist: 530,
  tapRow: 548,
  added: 560,
  playlistClosed: 586,
  // Topic complete
  complete: 592,
  // Progress
  progress: 674,
  // Leaderboard
  tapLeaderboard: 730,
  leaderboard: 738,
} as const

/** Captions over the app, with the words to set in amber. */
export const CAPTIONS: { from: number; to: number; text: string; accent: string }[] = [
  { from: 100, to: 148, text: 'Pick a language.', accent: 'language.' },
  { from: 148, to: 222, text: 'Learn what you’ll\nactually use.', accent: 'actually use.' },
  { from: 222, to: 352, text: 'Press play. Learn hands-free.', accent: 'hands-free.' },
  { from: 352, to: 444, text: 'Slow it down. Speed it up.', accent: 'Speed it up.' },
  { from: 444, to: 528, text: 'See every word in context.', accent: 'in context.' },
  { from: 528, to: 590, text: 'Save words to your playlists.', accent: 'your playlists.' },
  { from: 590, to: 670, text: 'Finish a topic. Celebrate it.', accent: 'Celebrate it.' },
  { from: 670, to: 736, text: 'Watch your progress grow.', accent: 'progress grow.' },
  { from: 736, to: 816, text: 'Climb the leaderboard.', accent: 'leaderboard.' },
]

if (END.from + END.durationInFrames !== VIDEO.durationInFrames) {
  throw new Error(`The film ends at ${END.from + END.durationInFrames}, expected ${VIDEO.durationInFrames}`)
}
