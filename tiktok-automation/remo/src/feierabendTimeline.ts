import {Ev} from './glassTimeline';
// Feierabend: a punch-clock time card. 30.0 s total: the time strip reads real seconds.
// stops: 0 menu, 1 learn, 2 pace, 3 autoplay, 4 quiz, 5 playlist, 6 stats, 7 languages (LAST)
export const HOOK_END = 88;
export const HOLD = [66, 92, 92, 96, 76, 72, 72, 96];
export const S0 = HOOK_END;
export const S = HOLD.map((_, j) => S0 + HOLD.slice(0, j).reduce((a, h) => a + h, 0));
export const E0 = S[7] + HOLD[7]; // 750
export const END_LEN = 150;
export const TOTAL = E0 + END_LEN; // 900
// frame at which each of the 7 features is punched on the card
export const STAMPS = [S[0] + 31, S[1] + 24, S[2] + 88, S[4] + 44, S[5] + 32, S[6] + 46, S[7] + 88];
export const STAMP_NAMES = ['First Aid Kit', 'Press play', 'Pace', 'Quick quiz', 'Playlist', 'Progress', 'Languages'];
export const PHRASES: [string, string][] = [
  ['Feierabend', 'Done for the day'], ['Mahlzeit!', 'Enjoy your meal'], ['Gemütlich', 'Cozy'], ['Na klar!', 'Of course!'],
  ['Kein Ding', 'No big deal'], ['Ohrwurm', 'Earworm'], ['Tschüss', 'Bye!'], ['Schönen Feierabend!', 'Enjoy your evening!'],
];
export const WSTEP = 11;
export const WSTART = 8;

export const events = (): Ev[] => {
  const e: Ev[] = [];
  const add = (f: number, k: string, n?: number) => e.push({f, k, n});
  add(3, 'tick'); add(54, 'slam'); add(70, 'tick'); add(78, 'tick');
  add(S[0] - 1, 'snap');
  add(S[0] + 30, 'tap', 1);                      // menu tap -> stamp 1
  add(S[1] + 22, 'tap', 2); add(S[1] + 24, 'pop'); // play -> stamp 2
  add(S[2] + 10, 'tap', 3); add(S[2] + 30, 'pop', 2); add(S[2] + 58, 'tap', 0);
  add(S[2] + 88, 'check');                          // Tuned -> stamp 3
  for (let i = 0; i < 8; i += 2) add(S[3] + WSTART + i * WSTEP, 'tick');
  add(S[4] + 42, 'tap', 3); add(S[4] + 44, 'check'); // quiz -> stamp 4
  add(S[5] + 32, 'thump');                           // playlist -> stamp 5
  add(S[6] + 46, 'tap', 1);                          // stats -> stamp 6
  add(S[7] + 86, 'tap', 2); add(S[7] + 88, 'check'); // languages -> stamp 7
  add(E0 + 40, 'finale');                            // Get Sprind. stamp
  add(E0 + 74, 'slam');                              // Start now. stamp
  add(E0 + 100, 'tap', 2);
  return e.sort((a, b) => a.f - b.f);
};

export const VO: {f: number; text: string; speed?: number}[] = [
  {f: 54, text: 'You have thirty seconds.', speed: 0.92},
  {f: S[0] + 6, text: 'One word. No English match.', speed: 0.92},
  {f: S[1] + 6, text: 'Press play. Let it sink in.', speed: 0.9},
  {f: S[2] + 6, text: 'Tighten the pauses.', speed: 0.93},
  {f: S[3] + 6, text: 'Eight words. One go.', speed: 0.95},
  {f: S[4] + 4, text: 'Did it stick?', speed: 0.93},
  {f: S[5] + 4, text: 'Keep it for later.', speed: 0.92},
  {f: S[6] + 4, text: 'Time well spent.', speed: 0.9},
  {f: S[7] + 4, text: 'Fifty languages. Pick your shift.', speed: 0.93},
  {f: E0 + 38, text: 'Get Sprind. Start now.', speed: 0.97},
];
