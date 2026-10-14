// "The Last Word": a 19.5-second micro-story, 1080 × 1920 at 30fps. The
// score runs at 120 BPM, so a beat is 15 frames; every cut, footstep, bell
// and subtitle word lands on one.
//
//   0–60     Hook: a signpost spins through gauche, droite, tout droit. "Lost?"
//  60–180    The fork: the traveler stops; the phone shows this morning's word
// 180–270    They turn left, following the word; a wall wipes past
// 270–360    The city opens up: the river, the tower, a bell
// 360–480    A café owner: "à gauche, puis tout droit."
// 480–537    The door opens
// 525–585    End card

export const LAST_WORD = { durationInFrames: 585 } as const

export const BEAT = 15

export const SCENE = {
  fork: { from: 0, durationInFrames: 180 },
  turn: { from: 180, durationInFrames: 90 },
  vista: { from: 270, durationInFrames: 90 },
  cafe: { from: 360, durationInFrames: 120 },
  door: { from: 480, durationInFrames: 57 },
  end: { from: 525, durationInFrames: 60 },
} as const

/** Moments, in frames of the master composition. */
export const K = {
  // The hook
  signSettle: 60, // the blades stop turning, on beat 4
  pullBack: [60, 96] as const,
  // The fork
  enterSteps: [45, 60, 75], // walking in from the right; stops on 90
  stop: 90,
  lookBack: 92, // over the shoulder…
  faceRight: 104, // …then turns to face the right-hand street
  phoneUp: 100,
  tapPlay: 112,
  target: [120, 132] as const, // the French card plays…
  native: [132, 144] as const, // …then the English
  phoneDown: 170,
  // The turn
  label: 189, // "gauche" lights up over the left-hand street
  turn: 198,
  walkSteps: [210, 225, 240, 255],
  wipe: [258, 282] as const,
  // The vista
  vistaSteps: [270, 285, 300, 315, 330, 345],
  bell: 270,
  // The café
  cafeSteps: [360],
  cafeStop: 375,
  words: [390, 405, 420, 435, 450], // à · gauche, · puis · tout · droit.
  nod: 462,
  clinks: [375, 465],
  // The door
  doorSteps: [480],
  doorStop: 495,
  doorOpen: [498, 512] as const,
} as const

/** The café owner's line, one word per beat, with the English under it. */
export const LINE: { fr: string; en: string; learned: boolean }[] = [
  { fr: 'à', en: '', learned: false },
  { fr: 'gauche,', en: 'Left,', learned: true },
  { fr: 'puis', en: 'then', learned: false },
  { fr: 'tout', en: 'straight', learned: true },
  { fr: 'droit.', en: 'ahead.', learned: true },
]

if (SCENE.end.from + SCENE.end.durationInFrames !== LAST_WORD.durationInFrames) {
  throw new Error('The end card must close the film')
}
