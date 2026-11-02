// Levels, XP and ranks for Sprind.
// Pure data + math — no React, no storage. The engine (./engine.ts) applies it,
// the UI draws it, and the Level Lab (/level-lab) simulates it.
//
// How the numbers were picked, from how the app is actually used:
//   - A topic is ~20-25 words and a language has 43 topics (~1,000 words).
//   - The daily goal is 20 words, so a "daily" learner plays ~20 new words a day.
//   - The first levels must come in minutes (level 2 after 3 words, level 5 on
//     day one) so the bar is always visibly moving; later levels stretch out so
//     a border keeps meaning something.
//   - Simulated (simulateLearner below), a daily-goal learner reaches level 5
//     on day 1, 10 on day 4, 20 ("Wordsmith") in about two weeks, finishes a
//     language around level 35, 50 ("Linguist") at ~4 months and 100 at
//     ~20 months. A casual learner gets to 20 in ~3 months. Levels past 50
//     are for people who keep reviewing and pick up more languages.

export const MAX_LEVEL = 100

/** Total XP needed to *reach* `level` (level 1 = 0 XP). */
export function xpForLevel(level: number): number {
  const l = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)))
  const n = l - 1
  return Math.round(30 * n * n + 0.2 * n * n * n)
}

export interface LevelInfo {
  level: number
  /** XP earned inside the current level. */
  intoLevel: number
  /** XP the current level spans (0 at max level). */
  span: number
  /** 0..1 through the current level. */
  progress: number
  /** XP still needed for the next level (0 at max level). */
  toNext: number
}

export function levelInfo(totalXp: number): LevelInfo {
  const xp = Math.max(0, Math.floor(totalXp))
  let level = 1
  // Max 100 steps — no need for anything cleverer.
  while (level < MAX_LEVEL && xp >= xpForLevel(level + 1)) level++
  if (level >= MAX_LEVEL) {
    return { level: MAX_LEVEL, intoLevel: 0, span: 0, progress: 1, toNext: 0 }
  }
  const base = xpForLevel(level)
  const span = xpForLevel(level + 1) - base
  const intoLevel = xp - base
  return { level, intoLevel, span, progress: intoLevel / span, toNext: span - intoLevel }
}

// ── XP sources ───────────────────────────────────────────────────────────────

export type XpSource =
  | 'word'            // a brand-new word heard all the way through
  | 'word_repeat'     // replaying a word already learned (capped per day)
  | 'first_word'      // first word of the local day
  | 'daily_goal'      // hit the 20-word daily goal
  | 'topic'           // first time a topic is completed
  | 'quiz_correct'    // a right answer in a topic quiz
  | 'quiz_perfect'    // a quiz round with no mistakes
  | 'review_correct'  // a spaced-repetition card remembered
  | 'review_miss'     // a card forgotten — still worth showing up for
  | 'badge'           // an achievement unlocked (amount set by its tier)
  | 'language'        // practicing a new target language for the first time

export const XP_BASE: Record<XpSource, number> = {
  word: 10,
  word_repeat: 2,
  first_word: 25,
  daily_goal: 100,
  topic: 150,
  quiz_correct: 5,
  quiz_perfect: 75,
  review_correct: 8,
  review_miss: 2,
  badge: 0, // see BADGE_XP
  language: 200,
}

/** Sources the streak/combo multipliers apply to: things you *do*, not rewards. */
export const MULTIPLIED: ReadonlySet<XpSource> = new Set<XpSource>([
  'word', 'word_repeat', 'quiz_correct', 'review_correct', 'review_miss',
])

export const BADGE_XP = { bronze: 50, silver: 100, gold: 250, platinum: 600, diamond: 1500 } as const

/** Repeats stop paying after this much XP in one day, so autoplay can't farm. */
export const DAILY_REPEAT_CAP = 200

export const DAILY_GOAL_WORDS = 20

/** +2% per streak day, up to +60% at a 30-day streak. */
export function streakMultiplier(streak: number): number {
  return 1 + Math.min(Math.max(0, streak), 30) * 0.02
}

/** A gain within this long of the previous one keeps the combo alive. */
export const COMBO_WINDOW_MS = 45_000

/** +5% per chained action, up to +50% at a 10-chain. */
export function comboMultiplier(combo: number): number {
  return 1 + Math.min(Math.max(0, combo - 1), 10) * 0.05
}

// ── Ranks: a title + an avatar border, every few levels ──────────────────────

export type BorderId =
  | 'tourist' | 'phrasebook' | 'backpacker' | 'conversationalist' | 'wordsmith'
  | 'interpreter' | 'storyteller' | 'polyglot' | 'linguist' | 'lexicon'
  | 'babel' | 'ages' | 'omniglot'

export interface Rank {
  id: BorderId
  minLevel: number
  /** English title; translated via `level.rank.<id>`. */
  title: string
  /** Main + accent colours, used for text, bars and glows. */
  color: string
  accent: string
}

export const RANKS: Rank[] = [
  { id: 'tourist',           minLevel: 1,   title: 'Tourist',            color: '#e2e8f0', accent: '#94a3b8' },
  { id: 'phrasebook',        minLevel: 5,   title: 'Phrasebook Holder',  color: '#f59e0b', accent: '#b45309' },
  { id: 'backpacker',        minLevel: 10,  title: 'Backpacker',         color: '#e5e7eb', accent: '#9ca3af' },
  { id: 'conversationalist', minLevel: 15,  title: 'Conversationalist',  color: '#facc15', accent: '#f59e0b' },
  { id: 'wordsmith',         minLevel: 20,  title: 'Wordsmith',          color: '#34d399', accent: '#059669' },
  { id: 'interpreter',       minLevel: 25,  title: 'Interpreter',        color: '#60a5fa', accent: '#2563eb' },
  { id: 'storyteller',       minLevel: 30,  title: 'Storyteller',        color: '#c084fc', accent: '#7c3aed' },
  { id: 'polyglot',          minLevel: 40,  title: 'Polyglot',           color: '#fb7185', accent: '#e11d48' },
  { id: 'linguist',          minLevel: 50,  title: 'Linguist',           color: '#f0abfc', accent: '#22d3ee' },
  { id: 'lexicon',           minLevel: 60,  title: 'Lexicon Lord',       color: '#5eead4', accent: '#a78bfa' },
  { id: 'babel',             minLevel: 75,  title: 'Babel Breaker',      color: '#a5b4fc', accent: '#f472b6' },
  { id: 'ages',              minLevel: 90,  title: 'Tongue of Ages',     color: '#fde68a', accent: '#fbbf24' },
  { id: 'omniglot',          minLevel: 100, title: 'Omniglot',           color: '#ffffff', accent: '#f472b6' },
]

export function rankForLevel(level: number): Rank {
  let r = RANKS[0]
  for (const rank of RANKS) if (level >= rank.minLevel) r = rank
  return r
}

export function nextRank(level: number): Rank | null {
  return RANKS.find((r) => r.minLevel > level) ?? null
}

// ── Learner simulation (Level Lab) ───────────────────────────────────────────

export interface Persona {
  id: string
  label: string
  /** New words on a day they show up. */
  wordsPerDay: number
  /** Chance they show up on any given day. */
  activeChance: number
  /** Spaced-repetition reviews per active day. */
  reviewsPerDay: number
  /** Chance they take a topic quiz after finishing a topic. */
  quizChance: number
}

export const PERSONAS: Persona[] = [
  { id: 'casual', label: 'Casual · 8 words, ~4 days a week', wordsPerDay: 8, activeChance: 0.55, reviewsPerDay: 5, quizChance: 0.3 },
  { id: 'daily', label: 'Daily goal · 20 words every day', wordsPerDay: 20, activeChance: 0.95, reviewsPerDay: 15, quizChance: 0.6 },
  { id: 'grinder', label: 'Grinder · 60 words a day', wordsPerDay: 60, activeChance: 0.98, reviewsPerDay: 40, quizChance: 0.9 },
]

export interface SimDay {
  day: number
  xp: number
  level: number
  streak: number
  words: number
}

/**
 * Plays out `days` of a persona with the real XP rules (a seeded RNG, so the
 * chart is the same every time). One language of 1,000 words / 43 topics,
 * then a second one, and so on.
 */
export function simulateLearner(persona: Persona, days: number, seed = 7): SimDay[] {
  let s = seed
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  const WORDS_PER_TOPIC = 23
  const WORDS_PER_LANGUAGE = 43 * WORDS_PER_TOPIC
  let xp = 0
  let streak = 0
  let words = 0
  let topics = 0
  const out: SimDay[] = []
  const badgeAt = new Map<number, number>([
    [1, BADGE_XP.bronze], [10, BADGE_XP.bronze], [25, BADGE_XP.silver], [50, BADGE_XP.silver],
    [100, BADGE_XP.gold], [250, BADGE_XP.gold], [500, BADGE_XP.platinum], [1000, BADGE_XP.platinum],
    [2500, BADGE_XP.diamond], [5000, BADGE_XP.diamond],
  ])
  const streakBadges = new Map<number, number>([
    [3, BADGE_XP.bronze], [7, BADGE_XP.silver], [14, BADGE_XP.gold], [30, BADGE_XP.platinum], [100, BADGE_XP.diamond],
  ])
  for (let day = 1; day <= days; day++) {
    if (rand() < persona.activeChance) {
      streak++
      const sm = streakMultiplier(streak)
      xp += XP_BASE.first_word
      for (let i = 0; i < persona.wordsPerDay; i++) {
        // Words come in sittings of ~10, so combos build and reset.
        const combo = (i % 10) + 1
        xp += Math.round(XP_BASE.word * sm * comboMultiplier(combo))
        words++
        if (words % WORDS_PER_LANGUAGE === 1 && words > 1) xp += XP_BASE.language
        const b = badgeAt.get(words)
        if (b) xp += b
        if (words % WORDS_PER_TOPIC === 0) {
          topics++
          xp += XP_BASE.topic
          if (topics % 43 === 6 || topics % 43 === 14) xp += BADGE_XP.gold // section clears
          if (rand() < persona.quizChance) {
            const right = Math.round(10 * (0.7 + rand() * 0.3))
            xp += Math.round(right * XP_BASE.quiz_correct * sm)
            if (right === 10) xp += XP_BASE.quiz_perfect
          }
        }
      }
      if (persona.wordsPerDay >= DAILY_GOAL_WORDS) xp += XP_BASE.daily_goal
      for (let i = 0; i < persona.reviewsPerDay; i++) {
        xp += Math.round((rand() < 0.8 ? XP_BASE.review_correct : XP_BASE.review_miss) * sm)
      }
      xp += Math.min(DAILY_REPEAT_CAP, persona.wordsPerDay * XP_BASE.word_repeat)
      const sb = streakBadges.get(streak)
      if (sb) xp += sb
    } else {
      streak = 0
    }
    out.push({ day, xp, level: levelInfo(xp).level, streak, words })
  }
  return out
}
