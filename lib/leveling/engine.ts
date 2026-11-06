// XP awarding + level events. Kept per user on the device (like badges,
// lib/achievements/storage.ts) and synced to Supabase (app/api/level) so it
// follows the learner to every device they sign in on.
// Public API:
//   - awardXp(userId, source, opts)      grant XP, emit a gain (and level-up)
//   - awardWordXp(userId, stats)         a new word: base + first-of-day + daily goal
//   - seedFromStats(userId, stats)       first run for an existing learner: back-pay
//                                         the XP they already earned, silently
//   - subscribeXpGain                    UI listener (components/leveling)
//   - getUnseenRankUp / clearUnseenRankUp a new border still to be celebrated
//   - holdCelebrations()                 "learning now": a border waits till this ends
//   - getLevelState(userId)              current XP/level for the account sheet
//   - setLevelUser(userId, profile, { sync: true })  who's signed in; starts sync

import { ACHIEVEMENTS_BY_ID, type AchievementDef } from '@/lib/achievements/definitions'
import { getUnlocked } from '@/lib/achievements/storage'
import { subscribeUnlock } from '@/lib/achievements/engine'
import {
  BADGE_XP,
  COMBO_SOURCES,
  COMBO_WINDOW_MS,
  DAILY_GOAL_WORDS,
  DAILY_REPEAT_CAP,
  MULTIPLIED,
  XP_BASE,
  comboMultiplier,
  levelInfo,
  rankForLevel,
  streakMultiplier,
  type Rank,
  type XpSource,
} from './definitions'

const KEY_PREFIX = 'vw_level_v1::'
const CHANGE_EVENT = 'vw-level-change'

export interface LevelState {
  xp: number
  /** Back-pay from existing progress has been applied. */
  seeded: boolean
  lastGainAt: number
  combo: number
  streak: number
  /** Local yyyy-mm-dd of the last first-word bonus / daily goal / repeat tally. */
  firstWordDay: string
  goalDay: string
  repeatDay: string
  repeatXpToday: number
  languages: string[]
  // Sync bookkeeping: xp = syncedXp + pendingXp + seedXp.
  /** The server's total when this device last heard it. */
  syncedXp: number
  /** XP earned here and not yet sent. */
  pendingXp: number
  /** This device's back-pay, not yet sent. The server grants a user's
   *  back-pay once, so a second device's is dropped rather than added. */
  seedXp: number
  /** Levels crossed since a new border was earned, until its celebration has
   *  played. Saved, so closing the app mid-lesson can't lose the moment. */
  unseenRank: { from: number; to: number } | null
}

const EMPTY: LevelState = {
  xp: 0, seeded: false, lastGainAt: 0, combo: 0, streak: 0,
  firstWordDay: '', goalDay: '', repeatDay: '', repeatXpToday: 0, languages: [],
  syncedXp: 0, pendingXp: 0, seedXp: 0, unseenRank: null,
}

export interface XpGain {
  userId: string | null
  source: XpSource
  amount: number
  /** Combined streak × combo multiplier applied (1 when none). */
  multiplier: number
  combo: number
  streak: number
  totalXp: number
  levelBefore: number
  levelAfter: number
}

export interface LevelUpEvent {
  userId: string | null
  from: number
  to: number
  rankBefore: Rank
  rank: Rank
  /** A new title + border came with this level. */
  newRank: boolean
}

type GainListener = (e: XpGain) => void
const gainListeners = new Set<GainListener>()

export function subscribeXpGain(fn: GainListener): () => void {
  gainListeners.add(fn)
  return () => gainListeners.delete(fn)
}

/** Fires whenever a user's XP changes (gains, seeding, Level Lab edits). */
export function subscribeLevelChange(fn: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(CHANGE_EVENT, fn)
  return () => window.removeEventListener(CHANGE_EVENT, fn)
}

function key(userId: string | null | undefined) {
  return KEY_PREFIX + (userId || 'guest')
}

export function getLevelState(userId: string | null | undefined): LevelState {
  if (typeof window === 'undefined') return { ...EMPTY }
  try {
    const raw = localStorage.getItem(key(userId))
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : { ...EMPTY }
  } catch {
    return { ...EMPTY }
  }
}

function save(userId: string | null | undefined, state: LevelState) {
  try {
    localStorage.setItem(key(userId), JSON.stringify(state))
  } catch {
    // ignore quota errors
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
  if (userId && userId === syncUserId) schedulePush()
}

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function emit<T>(set: Set<(e: T) => void>, e: T) {
  set.forEach((fn) => {
    try {
      fn(e)
    } catch {
      /* ignore */
    }
  })
}

export interface AwardOptions {
  /** Overrides XP_BASE (badges, Level Lab). */
  amount?: number
  /** Latest known daily streak; feeds the streak multiplier. */
  streak?: number
  /** Don't emit a gain toast (a level-up still celebrates). */
  silent?: boolean
}

export function awardXp(
  userId: string | null,
  source: XpSource,
  opts: AwardOptions = {},
): XpGain | null {
  if (typeof window === 'undefined') return null
  const state = getLevelState(userId)
  const now = Date.now()
  if (typeof opts.streak === 'number') state.streak = opts.streak

  let base = opts.amount ?? XP_BASE[source]
  if (source === 'word_repeat') {
    const day = today()
    if (state.repeatDay !== day) {
      state.repeatDay = day
      state.repeatXpToday = 0
    }
    base = Math.min(base, DAILY_REPEAT_CAP - state.repeatXpToday)
    if (base <= 0) return null
  }

  let multiplier = 1
  if (MULTIPLIED.has(source)) multiplier = streakMultiplier(state.streak)
  if (COMBO_SOURCES.has(source)) {
    state.combo = now - state.lastGainAt < COMBO_WINDOW_MS ? state.combo + 1 : 1
    state.lastGainAt = now
    multiplier *= comboMultiplier(state.combo)
  }
  const amount = Math.max(1, Math.round(base * multiplier))
  if (source === 'word_repeat') state.repeatXpToday += amount

  const levelBefore = levelInfo(state.xp).level
  state.xp += amount
  state.pendingXp += amount
  const levelAfter = levelInfo(state.xp).level
  if (levelAfter > levelBefore) {
    if (state.unseenRank) state.unseenRank.to = levelAfter
    else if (rankForLevel(levelBefore).id !== rankForLevel(levelAfter).id) {
      state.unseenRank = { from: levelBefore, to: levelAfter }
    }
  }
  save(userId, state)

  const gain: XpGain = {
    userId, source, amount, multiplier, combo: state.combo, streak: state.streak,
    totalXp: state.xp, levelBefore, levelAfter,
  }
  if (!opts.silent) emit(gainListeners, gain)
  return gain
}

// ── Celebrating a new border ─────────────────────────────────────────────────
// The full-screen moment never interrupts learning. Lessons, quizzes and
// reviews hold it for as long as they're open, and it plays once they're done.

let celebrationHolds = 0

/** Learning has started. Call what it returns when it ends. */
export function holdCelebrations(): () => void {
  celebrationHolds++
  let released = false
  return () => {
    if (released) return
    released = true
    celebrationHolds--
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }
}

export function celebrationsHeld(): boolean {
  return celebrationHolds > 0
}

/** The signed-in learner's new border still to be celebrated, if any. */
export function getUnseenRankUp(): LevelUpEvent | null {
  if (typeof window === 'undefined' || !currentUserId) return null
  const unseen = getLevelState(currentUserId).unseenRank
  if (!unseen) return null
  return {
    userId: currentUserId,
    from: unseen.from,
    to: unseen.to,
    rankBefore: rankForLevel(unseen.from),
    rank: rankForLevel(unseen.to),
    newRank: true,
  }
}

export function clearUnseenRankUp(): void {
  const state = getLevelState(currentUserId)
  state.unseenRank = null
  save(currentUserId, state)
}

/**
 * A new word heard through. Pays the word, the first word of the day, and the
 * daily goal once it's reached — the toast shows them as one gain.
 */
export function awardWordXp(
  userId: string | null,
  stats: { streak?: number; wordsToday?: number; targetLanguageCode?: string },
): void {
  const state = getLevelState(userId)
  const day = today()
  awardXp(userId, 'word', { streak: stats.streak })
  if (state.firstWordDay !== day) {
    const s = getLevelState(userId)
    s.firstWordDay = day
    save(userId, s)
    awardXp(userId, 'first_word')
  }
  if ((stats.wordsToday ?? 0) >= DAILY_GOAL_WORDS && state.goalDay !== day) {
    const s = getLevelState(userId)
    s.goalDay = day
    save(userId, s)
    awardXp(userId, 'daily_goal')
  }
  const lang = stats.targetLanguageCode
  if (lang && !state.languages.includes(lang)) {
    const s = getLevelState(userId)
    s.languages = [...s.languages, lang]
    save(userId, s)
    // The first language is the one you signed up with — no bonus for that.
    if (s.languages.length > 1) awardXp(userId, 'language')
  }
}

/** By tier, except language badges: opening a language takes no learning, so
 *  ten of them mustn't be worth more than a hundred words. */
function badgeXp(def: AchievementDef): number {
  return def.category === 'language' ? BADGE_XP.bronze : BADGE_XP[def.tier]
}

/**
 * First time we see a learner who already has progress: back-pay what their
 * words, topics and badges are worth, without a celebration for every level.
 * Never lowers XP, runs once per device, and the server keeps only the first
 * device's back-pay (see seedXp).
 */
export function seedFromStats(
  userId: string | null,
  stats: { wordsLearned?: number; topicsCompleted?: number; streak?: number; targetLanguageCode?: string },
): void {
  if (typeof window === 'undefined' || !userId) return
  const state = getLevelState(userId)
  if (typeof stats.streak === 'number') state.streak = stats.streak
  if (stats.targetLanguageCode && !state.languages.includes(stats.targetLanguageCode)) {
    state.languages = [...state.languages, stats.targetLanguageCode]
  }
  if (!state.seeded) {
    const badges = getUnlocked(userId).reduce((sum, r) => {
      const def = ACHIEVEMENTS_BY_ID[r.id]
      return sum + (def ? badgeXp(def) : 0)
    }, 0)
    const earned =
      (stats.wordsLearned ?? 0) * XP_BASE.word +
      (stats.topicsCompleted ?? 0) * XP_BASE.topic +
      badges
    const extra = Math.max(0, earned - state.xp)
    state.xp += extra
    state.seedXp += extra
    state.seeded = true
  }
  save(userId, state)
}

/** Level Lab only: set XP directly. */
export function setXp(userId: string | null, xp: number): void {
  const state = getLevelState(userId)
  state.xp = Math.max(0, Math.round(xp))
  state.seeded = true
  save(userId, state)
}

/** Level Lab only: wipe a user's level state. */
export function resetLevel(userId: string | null): void {
  try {
    localStorage.removeItem(key(userId))
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

// Badges pay XP by tier. Unlocks before seeding are covered by the back-pay.
let badgeBridge = false
export function startBadgeXpBridge(): void {
  if (badgeBridge || typeof window === 'undefined') return
  badgeBridge = true
  subscribeUnlock(({ achievement }) => {
    const userId = currentUserId
    if (!getLevelState(userId).seeded) return
    awardXp(userId, 'badge', { amount: badgeXp(achievement) })
  })
}

// Unlock events carry no user id, so the app tells us who's signed in — and
// their face, for the level-up screen.
export interface LevelProfile {
  src?: string | null
  initials?: string
}
let currentUserId: string | null = null
let currentProfile: LevelProfile = {}
export function setLevelUser(
  userId: string | null,
  profile: LevelProfile = {},
  opts: { sync?: boolean } = {},
): void {
  const changed = userId !== currentUserId
  currentUserId = userId
  currentProfile = profile
  // A border they earned last time and never saw can play now.
  if (changed && typeof window !== 'undefined') window.dispatchEvent(new Event(CHANGE_EVENT))
  const next = opts.sync ? userId : null
  if (next !== syncUserId) {
    syncUserId = next
    syncDisabled = false
    clearTimeout(pushTimer)
    if (next) {
      listenForFlush()
      void syncNow()
    }
  }
}

// ── Sync (app/api/level, add-level-xp-schema.sql) ────────────────────────────
// Each device sends what it earned since it last heard from the server (a
// delta) plus any unsent back-pay, and the server adds them atomically and
// answers with the total. Whatever in that total this device didn't send came
// from the learner's other devices, and shows up here quietly — no level-up
// fanfare for XP earned on another phone.

let syncUserId: string | null = null
let syncDisabled = false
let pushTimer: ReturnType<typeof setTimeout> | undefined
let inFlight = false
let pushAgain = false

/** Gains bunch up for a few seconds, so a run of words is one request. */
function schedulePush() {
  if (syncDisabled) return
  clearTimeout(pushTimer)
  pushTimer = setTimeout(() => void syncNow(), 4000)
}

/** `pull` asks for the total even with nothing to send (back from the background). */
async function syncNow(keepalive = false, pull = false): Promise<void> {
  const userId = syncUserId
  if (!userId || syncDisabled) return
  if (inFlight) {
    pushAgain = true
    return
  }
  const before = getLevelState(userId)
  const delta = before.pendingXp
  const seed = before.seedXp
  if (delta === 0 && seed === 0 && !pull) return
  inFlight = true
  try {
    const res = await fetch('/api/level', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta, seed }),
      keepalive,
    })
    if (res.status === 501) syncDisabled = true // schema not applied yet
    if (!res.ok) return
    const { xp: total, accepted } = (await res.json()) as { xp: number; accepted: number }
    if (syncUserId !== userId) return
    // Gains made while the request was out stay pending; what was sent is
    // now part of the server's total, along with every other device's.
    const s = getLevelState(userId)
    s.pendingXp = Math.max(0, s.pendingXp - accepted)
    s.seedXp = Math.max(0, s.seedXp - seed)
    s.syncedXp = total
    s.xp = total + s.pendingXp + s.seedXp
    try {
      localStorage.setItem(key(userId), JSON.stringify(s))
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(CHANGE_EVENT))
  } catch {
    // Offline: what's unsent stays unsent and goes with the next sync.
  } finally {
    inFlight = false
    if (pushAgain) {
      pushAgain = false
      schedulePush()
    }
  }
}

// Send what's pending when the app goes to the background, and catch up when
// the connection comes back.
let flushListening = false
function listenForFlush() {
  if (flushListening || typeof window === 'undefined') return
  flushListening = true
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      clearTimeout(pushTimer)
      void syncNow(true)
    } else {
      void syncNow(false, true)
    }
  })
  window.addEventListener('online', () => void syncNow(false, true))
}
export function getLevelProfile(): LevelProfile {
  return currentProfile
}
