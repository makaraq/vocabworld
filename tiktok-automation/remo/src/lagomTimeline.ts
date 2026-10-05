import {S as GS, E0 as GE0, events as gEvents, HOLD as GH, Ev} from './glassTimeline';
// stops: 0 picker (languages FIRST, hook plays over it), 1 menu, 2 learn, 3 settings, 4 autoplay, 5 quiz, 6 playlist, 7 stats
export const HOLD = [160, GH[0], 128, 100, 100, 84, 72, 72];
export const S = HOLD.map((_, j) => HOLD.slice(0, j).reduce((a, h) => a + h, 0));
export const E0 = S[7] + HOLD[7] + 4;
export const END_LEN = 125;
export const TOTAL = E0 + END_LEN;
export const PK_RATE = 0.62; // picker plays slower so it can run under the hook
export const DISAGREE = 56; // hook beat: "Lagom disagrees."
// marker settles at LIT[k] when feature k is done; offsets shrink: too much -> too little -> ... -> centre
export const LIT = [S[0] + 148, S[1] + 36, S[2] + 36, S[3] + 90, S[5] + 44, S[6] + 36, S[7] + 46];
export const OFFS = [0.58, -0.46, 0.34, -0.24, 0.14, -0.07, 0.03];
export const NAMES = ['Picked', 'Found', 'Heard', 'Tuned', 'Quizzed', 'Saved', 'Counted'];
export const PHRASES: [string, string][] = [['Lagom', 'Just the right amount'], ['Fika', 'Coffee break'], ['Ingen fara', 'No worries'], ['Det ordnar sig', "It'll work out"], ['Varsågod', 'Here you go'], ['Ha det bra', 'Take care'], ['Mysigt', 'Cosy'], ['Förlåt', 'Sorry']];
export const WSTEP = 11;
export const WSTART = 6;
const MAP: Record<number, number> = {0: 1, 1: 2, 2: 3, 3: 5, 4: 6, 5: 7};
export const events = (): Ev[] => {
  const e: Ev[] = [];
  gEvents().forEach((x) => {
    if (x.f < GS[0] - 2 || x.f >= GE0 - 1) return;
    if (['whoosh', 'slide', 'flap', 'speak', 'shine', 'sparkle', 'pop', 'pause'].includes(x.k)) return;
    let g = 0;
    GS.forEach((s, i) => { if (x.f >= s) g = i; });
    if (g === 4 || g === 6) return; // playlist custom / picker custom
    if (g === 5 && x.k === 'tick') return;
    e.push({...x, f: x.f - GS[g] + S[MAP[g]]});
  });
  const add = (f: number, k: string, n?: number) => e.push({f, k, n});
  add(DISAGREE, 'slam');
  add(S[0] + 139, 'tap', 7);
  LIT.forEach((f) => add(f + 1, 'thump'));
  for (let i = 0; i < 8; i += 3) add(S[4] + WSTART + i * WSTEP, 'tick');
  add(S[6] + 30, 'thump'); add(S[6] + 58, 'tap', 3);
  add(E0 + 12, 'slam'); add(E0 + 48, 'thump'); add(E0 + 80, 'tap', 2); add(E0 + 98, 'tap', 1);
  return e.filter((x) => !(x.k === 'check' && x.f === 0)).sort((a, b) => a.f - b.f);
};

export const VO: {f: number; text: string; speed?: number}[] = [
  {f: 2, text: 'Everyone says more is better.', speed: 0.98},
  {f: 60, text: 'One word. Just the right amount.', speed: 0.95},
  {f: S[0] + 124, text: 'Fifty languages. One fits.', speed: 0.95},
  {f: S[1] + 22, text: 'Start with the basics.', speed: 0.93},
  {f: S[2] + 8, text: 'Press play. Say it back.', speed: 0.92},
  {f: S[3] + 14, text: 'Shorter gaps. Just right.', speed: 0.93},
  {f: S[5] + 4, text: 'Which one is it?', speed: 0.93},
  {f: S[6] + 4, text: 'Put it somewhere safe.', speed: 0.92},
  {f: S[7] + 4, text: 'Day by day. It adds up.', speed: 0.9},
  {f: E0 + 54, text: 'Get Sprind. Start now.', speed: 0.97},
];
