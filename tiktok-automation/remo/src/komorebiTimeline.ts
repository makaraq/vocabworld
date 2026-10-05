import {S as GS, E0 as GE0, events as gEvents, Ev} from './glassTimeline';
// stops: 0 picker (languages FIRST, runs under the hook), 1 menu, 2 learn, 3 settings, 4 autoplay, 5 quiz, 6 playlist, 7 stats
export const HOLD = [120, 66, 124, 96, 98, 84, 72, 72];
export const S0 = 0;
export const S = HOLD.map((_, j) => S0 + HOLD.slice(0, j).reduce((a, h) => a + h, 0));
export const E0 = S[7] + HOLD[7] + 4;
export const END_LEN = 142;
export const TOTAL = E0 + END_LEN;
// the seven features light one ray each
export const LIT = [S[0] + 92, S[1] + 34, S[2] + 36, S[3] + 88, S[5] + 44, S[6] + 36, S[7] + 44];
export const CHIPS = ['Picked', 'Found', 'Heard', 'Tuned', 'Quizzed', 'Saved', 'Counted'];
export const PHRASES: [string, string][] = [
  ['Tadaima', "I'm home"], ['Okaeri', 'Welcome back'], ['Itadakimasu', 'Thanks for the food'], ['Gochisousama', 'Thanks for the meal'],
  ['Otsukaresama', 'Thanks for your work'], ['Shouganai', "It can't be helped"], ['Ganbatte', 'Do your best!'], ['Yoroshiku', 'Nice to meet you'],
];
export const WSTEP = 11;
export const WSTART = 6;
const MAP: Record<number, number> = {6: 0, 0: 1, 1: 2, 2: 3, 3: 5, 4: 6, 5: 7};
const OK = new Set(['tap', 'tick', 'thump', 'check', 'finale', 'slam', 'snap']);
export const events = (): Ev[] => {
  const e: Ev[] = [];
  gEvents().forEach((x) => {
    if (x.f < GS[0] - 2 || x.f >= GE0 - 1) return;
    let g = 0;
    GS.forEach((s, i) => { if (x.f >= s) g = i; });
    if (g === 4) return; // playlist events are custom below
    const k = x.k === 'pop' ? 'tick' : x.k;
    if (!OK.has(k)) return;
    e.push({...x, k, f: x.f - GS[g] + S[MAP[g]]});
  });
  const add = (f: number, k: string, n?: number) => e.push({f, k, n});
  add(3, 'tick'); add(48, 'snap'); add(78, 'tick');
  for (let i = 0; i < 8; i += 2) add(S[4] + WSTART + i * WSTEP, 'tick');
  add(S[6] + 30, 'thump'); add(S[6] + 58, 'tap', 3);
  add(E0 + 26, 'thump');
  add(E0 + 50, 'finale');
  add(E0 + 70, 'slam'); add(E0 + 96, 'tap', 1);
  return e.sort((a, b) => a.f - b.f);
};

export const VO: {f: number; text: string; speed?: number}[] = [
  {f: 6, text: 'One word. No English match.', speed: 0.88},
  {f: 66, text: 'Fifty languages. Pick your sky.', speed: 0.93},
  {f: S[1] + 8, text: 'Open the first aid kit.', speed: 0.92},
  {f: S[2] + 6, text: 'Press play. Just listen.', speed: 0.9},
  {f: S[3] + 8, text: 'Shrink the pauses.', speed: 0.93},
  {f: S[4] + 2, text: 'Now let it flow.', speed: 0.9},
  {f: S[5] + 4, text: 'Did it stick?', speed: 0.93},
  {f: S[6] + 4, text: 'Keep it close.', speed: 0.9},
  {f: S[7] + 4, text: 'Watch it add up.', speed: 0.9},
  {f: E0 + 40, text: 'Get Sprind. Start now.', speed: 0.97},
];
