export type Ev = {f: number; k: string; n?: number};
// stops: 0 menu, 1 learn, 2 pace (settings), 3 autoplay, 4 quiz, 5 playlist, 6 stats, 7 picker (languages LAST, ends on Arabic)
export const HOOK = 96;
export const HOLD = [60, 104, 108, 98, 70, 64, 66, 100];
export const S0 = HOOK;
export const S = HOLD.map((_, j) => S0 + HOLD.slice(0, j).reduce((a, h) => a + h, 0));
export const E0 = S[7] + HOLD[7] + 4;
export const END_LEN = 144;
export const TOTAL = E0 + END_LEN;
// frame when each feature is "done" and moves the needle
export const LIT = [S[0] + 30, S[1] + 36, S[2] + 90, S[3] + 30, S[4] + 46, S[5] + 36, S[6] + 46, S[7] + 92];
export const PACE = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];
export const LABELS = ['Found', 'Heard', 'Tuned', 'Rolling', 'Quizzed', 'Saved', 'Counted', 'Picked'];
export const PHRASES: [string, string][] = [
  ['Yalla', "Let's go! / Hurry up!"], ['Habibi', 'My dear'], ['Khalas', "That's enough"], ['Inshallah', 'God willing'],
  ['Maalesh', 'Never mind'], ['Wallah', 'I swear'], ['Shukran', 'Thank you'], ['Tamam', 'All good'],
];
export const WSTEP = 11;
export const WSTART = 8;
export const events = (): Ev[] => {
  const e: Ev[] = [];
  const add = (f: number, k: string, n?: number) => e.push({f, k, n});
  add(3, 'tick'); add(62, 'slam');
  add(S[0] + 26, 'tap', 3);
  add(S[1] + 20, 'tap', 2);
  add(S[2] + 10, 'tap', 1); add(S[2] + 58, 'tap', 4); add(S[2] + 90, 'check');
  for (let i = 0; i < 8; i += 2) add(S[3] + WSTART + i * WSTEP, 'tick');
  add(S[4] + 42, 'tap', 0); add(S[4] + 45, 'check');
  add(S[5] + 26, 'thump'); add(S[5] + 46, 'tap', 3);
  add(S[6] + 8, 'tick');
  add(S[7] + 86, 'tap', 2); add(S[7] + 89, 'check');
  add(E0 + 22, 'slam'); add(E0 + 40, 'finale'); add(E0 + 62, 'thump'); add(E0 + 100, 'tap', 1);
  return e.sort((a, b) => a.f - b.f);
};
export const VO: {f: number; text: string; speed?: number}[] = [
  {f: 4, text: 'Everyone says slow and steady.', speed: 0.86},
  {f: 67, text: 'Not today.', speed: 0.9},
  {f: S[0] + 4, text: 'Grab the First Aid Kit.', speed: 0.93},
  {f: S[1] + 6, text: 'Press play. Say it loud.', speed: 0.93},
  {f: S[2] + 6, text: 'Cut the waiting.', speed: 0.93},
  {f: S[4] + 4, text: 'Did it stick?', speed: 0.93},
  {f: S[5] + 4, text: 'Pack it for the road.', speed: 0.93},
  {f: S[6] + 4, text: "Look how fast you're going.", speed: 0.93},
  {f: S[7] + 4, text: 'Fifty lanes. Pick one.', speed: 0.93},
  {f: E0 + 56, text: 'Get Sprind. Start now.', speed: 0.97},
];
