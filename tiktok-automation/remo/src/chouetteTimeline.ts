import {S as GS, E0 as GE0, events as gEvents, Ev} from './glassTimeline';
// stops: 0 picker (languages FIRST), 1 menu, 2 learn, 3 settings, 4 autoplay, 5 quiz, 6 playlist, 7 stats
export const HOLD = [98, 72, 118, 100, 98, 84, 72, 74];
export const S0 = 88;
export const S = HOLD.map((_, j) => S0 + HOLD.slice(0, j).reduce((a, h) => a + h, 0));
export const E0 = S[7] + HOLD[7] + 4;
export const END_LEN = 146;
export const TOTAL = E0 + END_LEN;
// stamp k lands (7 features; autoplay is the pace pay-off, no stamp of its own)
export const LIT = [S[0] + 90, S[1] + 34, S[2] + 36, S[3] + 90, S[5] + 46, S[6] + 36, S[7] + 44];
export const PHRASES: [string, string][] = [['Ça marche', 'Sounds good'], ['Bof', 'Meh'], ['Tant pis', 'Too bad'], ['Zut !', 'Darn!'], ['Allez !', 'Come on!'], ['Ras-le-bol', 'Fed up'], ['Bisous', 'Kisses, bye'], ['Chouette !', 'Neat!']];
export const WSTEP = 11;
export const WSTART = 8;
const MAP: Record<number, number> = {6: 0, 0: 1, 1: 2, 2: 3, 3: 5, 4: 6, 5: 7};
export const events = (): Ev[] => {
  const e: Ev[] = [];
  gEvents().forEach((x) => {
    if (x.f < GS[0] - 2 || x.f >= GE0 - 1) return;
    if (['whoosh', 'slide', 'sparkle', 'shine', 'flap', 'speak', 'pause', 'pop'].includes(x.k)) return;
    let g = 0;
    GS.forEach((s, i) => { if (x.f >= s) g = i; });
    if (g === 4) return;
    e.push({...x, f: x.f - GS[g] + S[MAP[g]]});
  });
  const add = (f: number, k: string, n?: number) => e.push({f, k, n});
  add(6, 'tap', 1); add(30, 'snap'); add(46, 'slam');
  LIT.forEach((f, i) => add(f + 1, i % 2 ? 'tick' : 'thump', i));
  for (let i = 0; i < 8; i += 2) add(S[4] + WSTART + i * WSTEP, 'tick');
  add(S[6] + 30, 'thump'); add(S[6] + 58, 'tap', 3);
  add(E0 + 24, 'tick'); add(E0 + 64, 'thump');
  add(E0 + 88, 'finale'); add(E0 + 104, 'tap', 2); add(E0 + 120, 'tap', 1);
  return e.sort((a, b) => a.f - b.f);
};

export const VO: {f: number; text: string; speed?: number}[] = [
  {f: 12, text: 'The word textbooks skip.', speed: 0.9},
  {f: S[0] + 6, text: 'Fifty languages. Pick one.', speed: 0.95},
  {f: S[1] + 6, text: 'Start with greetings.', speed: 0.92},
  {f: S[2] + 8, text: 'Press play. Say it back.', speed: 0.92},
  {f: S[3] + 6, text: 'Shrink the pauses.', speed: 0.95},
  {f: S[4] + 3, text: 'Now let it run.', speed: 0.92},
  {f: S[5] + 4, text: 'Did it stick?', speed: 0.93},
  {f: S[6] + 4, text: 'Keep the good ones.', speed: 0.92},
  {f: S[7] + 4, text: "Look what you've collected.", speed: 0.9},
  {f: E0 + 86, text: 'Get Sprind. Start now.', speed: 0.97},
];
