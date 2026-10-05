import {S as GS, E0 as GE0, events as gEvents, Ev} from './glassTimeline';
// stops: 0 menu, 1 learn, 2 settings(pace), 3 autoplay, 4 quiz, 5 playlist, 6 stats, 7 picker (languages LAST, ends on Korean)
export const HOLD = [66, 130, 94, 98, 88, 70, 72, 100];
export const S0 = 96;
export const S = HOLD.map((_, j) => S0 + HOLD.slice(0, j).reduce((a, h) => a + h, 0));
export const E0 = S[7] + HOLD[7] + 4;
export const END_LEN = 136;
export const TOTAL = E0 + END_LEN;
// hook: comment bubbles of "wow" in other languages stack up, Korean one becomes the hero pill
export const HK: [string, string, string][] = [
  ['ES', 'Spanish', 'Qué pasada'], ['IT', 'Italian', 'Mamma mia'], ['DE', 'German', 'Krass'],
  ['TR', 'Turkish', 'Vay be'], ['JP', 'Japanese', 'Sugoi'], ['IN', 'Hindi', 'Kamaal hai'], ['KR', 'Korean', 'Daebak'],
];
export const HK0 = 8, HKSTEP = 6, HK_MORPH = 62;
// feature tags + reaction counter (rolls at each stop)
export const TAGS = ['Found', 'Heard', 'Tuned', 'Played', 'Nailed', 'Saved', 'Counted', 'Joined'];
export const TAGAT = [S[0] + 34, S[1] + 36, S[2] + 90, S[3] + 90, S[4] + 46, S[5] + 40, S[6] + 46, S[7] + 90];
export const COUNTS = [212, 1048, 2390, 4960, 7310, 9840, 12480, 15920];
export const PHRASES: [string, string][] = [['Heol', 'No way!'], ['Jinjja?', 'Really?'], ['Aigoo', 'Oh dear'], ['Michyeosseo', "You're nuts"], ['Jjang!', 'The best!'], ['Gwenchana', "It's okay"], ['Eotteokhae', 'What now?!'], ['Daebak', 'Wow! Awesome!']];
export const WSTEP = 11;
export const WSTART = 6;
const MAP: Record<number, number> = {0: 0, 1: 1, 2: 2, 3: 4, 4: 5, 5: 6, 6: 7};
const OK = ['tap', 'tick', 'thump', 'check', 'finale', 'slam', 'snap'];
export const events = (): Ev[] => {
  const e: Ev[] = [];
  gEvents().forEach((x) => {
    if (x.f < GS[0] - 2 || x.f >= GE0 - 1) return;
    if (!OK.includes(x.k)) return;
    let g = 0;
    GS.forEach((s, i) => { if (x.f >= s) g = i; });
    if (g === 4) return; // playlist custom
    e.push({...x, f: x.f - GS[g] + S[MAP[g]]});
  });
  const add = (f: number, k: string, n?: number) => e.push({f, k, n});
  add(3, 'tick'); add(HK0 + 6 * HKSTEP, 'thump'); add(S[0] - 1, 'snap');
  for (let i = 0; i < 8; i += 2) add(S[3] + WSTART + i * WSTEP, 'tick');
  add(S[5] + 30, 'thump'); add(S[5] + 58, 'tap', 3);
  add(E0 + 14, 'tick'); add(E0 + 36, 'tick'); add(E0 + 58, 'slam'); add(E0 + 82, 'tap', 2); add(E0 + 100, 'finale');
  return e.sort((a, b) => a.f - b.f);
};

export const VO: {f: number; text: string; speed?: number}[] = [
  {f: 8, text: 'How do you say wow?', speed: 0.9},
  {f: S[0] + 6, text: 'Start with the everyday ones.', speed: 0.93},
  {f: S[1] + 8, text: 'Press play. Hear the reaction.', speed: 0.92},
  {f: S[2] + 4, text: 'Shrink the silences.', speed: 0.93},
  {f: S[3] + 4, text: 'Now watch them stack up.', speed: 0.93},
  {f: S[4] + 4, text: 'Did it stick?', speed: 0.93},
  {f: S[5] + 6, text: 'Keep the good ones.', speed: 0.92},
  {f: S[6] + 4, text: 'The count keeps climbing.', speed: 0.92},
  {f: S[7] + 4, text: 'Fifty languages. Join one.', speed: 0.93},
  {f: E0 + 62, text: 'Get Sprind. Start now.', speed: 0.97},
];
