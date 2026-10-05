export type Ev = {f: number; k: string; n?: number};
// stops: 0 menu, 1 learn, 2 settings (pace), 3 AUTOPLAY, 4 quiz, 5 playlist, 6 stats, 7 picker (languages LAST)
export const HOLD = [66, 104, 98, 92, 84, 76, 72, 100];
export const S0 = 84;
export const S = HOLD.map((_, j) => S0 + HOLD.slice(0, j).reduce((a, h) => a + h, 0));
export const E0 = S[7] + HOLD[7] + 4;
export const END_LEN = 152;
export const TOTAL = E0 + END_LEN;
// 7 tally marks: menu, learn, pace, quiz, playlist, stats, languages
export const LIT = [S[0] + 28, S[1] + 40, S[2] + 90, S[4] + 46, S[5] + 36, S[6] + 46, S[7] + 90];
export const WORDS: [string, string][] = [['Lekker', 'tasty, nice'], ['Alsjeblieft', 'here you go'], ['Dank je wel', 'thank you'], ['Tot straks', 'see you later'], ['Eet smakelijk', 'enjoy your meal'], ['Proost!', 'cheers!'], ['Lekker bezig', 'well done'], ['Fijne dag', 'have a good day']];
export const WSTEP = 11;
export const WSTART = 8;
export const events = (): Ev[] => {
  const e: Ev[] = [];
  const add = (f: number, k: string, n?: number) => e.push({f, k, n});
  add(4, 'tick'); add(18, 'tick'); add(52, 'tick'); add(60, 'tap', 2);
  S.forEach((s) => add(s + 3, 'tick'));
  add(S[0] + 24, 'tap', 1);
  add(S[1] + 24, 'tap', 2);
  add(S[2] + 10, 'tap', 3); add(S[2] + 58, 'tap', 4); add(S[2] + 90, 'check');
  for (let i = 0; i < 8; i += 2) add(S[3] + WSTART + i * WSTEP, 'tick');
  add(S[4] + 42, 'tap', 5); add(S[4] + 45, 'check');
  add(S[5] + 30, 'thump'); add(S[5] + 56, 'tap', 3);
  add(S[6] + 46, 'thump');
  add(S[7] + 84, 'tap', 7); add(S[7] + 88, 'check');
  add(E0 + 14, 'thump');
  add(E0 + 32, 'tick'); add(E0 + 54, 'tick');
  add(E0 + 70, 'finale'); add(E0 + 98, 'tap', 1);
  return e.sort((a, b) => a.f - b.f);
};
export const VO: {f: number; text: string; speed?: number}[] = [
  {f: 8, text: 'Some feelings. No English word.', speed: 0.88},
  {f: S[0] + 4, text: 'Pull up a chair.', speed: 0.9},
  {f: S[1] + 8, text: 'Press play. Listen.', speed: 0.92},
  {f: S[2] + 4, text: 'Shrink the silence.', speed: 0.9},
  {f: S[3] + 4, text: 'Now let it flow.', speed: 0.92},
  {f: S[4] + 4, text: "Quick. What's it mean?", speed: 0.95},
  {f: S[5] + 4, text: 'Save a seat for it.', speed: 0.9},
  {f: S[6] + 4, text: 'Tally it up.', speed: 0.92},
  {f: S[7] + 6, text: 'Fifty languages. One menu.', speed: 0.92},
  {f: E0 + 36, text: 'Get Sprind. Start now.', speed: 0.97},
];
