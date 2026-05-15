// Achievement evaluation + event bus.
// Public API:
//   - reportProgress(ctx)     evaluate metric-based achievements
//   - reportEvent(eventId)    fire a one-shot event achievement (early bird, etc.)
//   - reportTopicComplete(...) fires topic-completion popup + section-clear evals
//   - subscribeUnlock(fn) / subscribeTopicComplete(fn)  UI providers listen here

import {
  ACHIEVEMENTS,
  ACHIEVEMENTS_BY_ID,
  AchievementDef,
  SECTION_TOPIC_IDS,
} from './definitions'
import {
  getUnlocked,
  markUnlocked,
  isUnlocked,
  recordLanguageStarted,
} from './storage'

export interface EvaluationContext {
  userId: string | null
  wordsLearned?: number
  topicsCompleted?: number
  currentStreak?: number
  wordsToday?: number
  completedTopicIds?: number[]
  /** Recently started target language code (we count distinct over time). */
  targetLanguageCode?: string
}

export interface UnlockEvent {
  achievement: AchievementDef
  unlockedAt: number
}

export interface TopicCompleteEvent {
  topicId: number
  topicName: string
  nextTopic: { id: number; name: string } | null
}

type UnlockListener = (e: UnlockEvent) => void
type TopicListener = (e: TopicCompleteEvent) => void
type BadgesGalleryListener = () => void

const unlockListeners = new Set<UnlockListener>()
const topicListeners = new Set<TopicListener>()
const badgesGalleryListeners = new Set<BadgesGalleryListener>()

export function subscribeUnlock(fn: UnlockListener): () => void {
  unlockListeners.add(fn)
  return () => unlockListeners.delete(fn)
}

export function subscribeTopicComplete(fn: TopicListener): () => void {
  topicListeners.add(fn)
  return () => topicListeners.delete(fn)
}

export function subscribeOpenBadgesGallery(fn: BadgesGalleryListener): () => void {
  badgesGalleryListeners.add(fn)
  return () => badgesGalleryListeners.delete(fn)
}

export function openBadgesGallery(): void {
  badgesGalleryListeners.forEach((fn) => {
    try {
      fn()
    } catch {
      /* ignore */
    }
  })
}

function emitUnlock(achievement: AchievementDef): void {
  const evt: UnlockEvent = { achievement, unlockedAt: Date.now() }
  unlockListeners.forEach((fn) => {
    try {
      fn(evt)
    } catch {
      /* ignore */
    }
  })
}

function tryUnlock(userId: string | null, def: AchievementDef): boolean {
  if (isUnlocked(userId, def.id)) return false
  const { added } = markUnlocked(userId, def.id)
  if (added) emitUnlock(def)
  return added
}

function evalMetric(
  userId: string | null,
  metric: NonNullable<AchievementDef['metric']>,
  value: number,
  sectionKey?: string,
): void {
  for (const def of ACHIEVEMENTS) {
    if (def.metric !== metric) continue
    if (sectionKey && def.sectionKey !== sectionKey) continue
    if (!sectionKey && def.sectionKey) continue
    if (value >= def.threshold) {
      tryUnlock(userId, def)
    }
  }
}

export function reportProgress(ctx: EvaluationContext): void {
  const userId = ctx.userId

  // Track which target language is currently being practiced.
  if (ctx.targetLanguageCode) {
    const count = recordLanguageStarted(ctx.targetLanguageCode)
    evalMetric(userId, 'languagesStarted', count)
  }

  if (typeof ctx.wordsLearned === 'number') {
    evalMetric(userId, 'wordsLearned', ctx.wordsLearned)
  }
  if (typeof ctx.topicsCompleted === 'number') {
    evalMetric(userId, 'topicsCompleted', ctx.topicsCompleted)
  }
  if (typeof ctx.currentStreak === 'number') {
    evalMetric(userId, 'currentStreak', ctx.currentStreak)
  }
  if (typeof ctx.wordsToday === 'number') {
    evalMetric(userId, 'wordsToday', ctx.wordsToday)
  }

  // Section clears — count completed topic IDs that fall in each section.
  if (Array.isArray(ctx.completedTopicIds)) {
    const set = new Set(ctx.completedTopicIds)
    for (const [sectionKey, ids] of Object.entries(SECTION_TOPIC_IDS)) {
      const completedInSection = ids.filter((id) => set.has(id)).length
      evalMetric(userId, 'sectionTopicsCompleted', completedInSection, sectionKey)
    }
  }
}

/**
 * Time-of-day / one-shot events. Pass the achievement id directly so the call
 * sites stay readable.
 */
export function reportEvent(
  userId: string | null,
  achievementId: string,
): boolean {
  const def = ACHIEVEMENTS_BY_ID[achievementId]
  if (!def) return false
  return tryUnlock(userId, def)
}

/**
 * Auto-fire time-of-day achievements based on the wall clock. Idempotent —
 * each one only unlocks once per user.
 */
export function evaluateTimeContext(userId: string | null): void {
  const now = new Date()
  const h = now.getHours()
  const day = now.getDay() // 0 = Sun, 6 = Sat
  if (h < 7) reportEvent(userId, 'time_early_bird')
  if (h >= 0 && h < 4) reportEvent(userId, 'time_night_owl')
  if (day === 0 || day === 6) reportEvent(userId, 'time_weekend')
}

/**
 * Notify the topic-completion modal and re-evaluate section/topic counters.
 */
export function reportTopicComplete(
  userId: string | null,
  topicId: number,
  topicName: string,
  nextTopic: { id: number; name: string } | null,
): void {
  const evt: TopicCompleteEvent = { topicId, topicName, nextTopic }
  topicListeners.forEach((fn) => {
    try {
      fn(evt)
    } catch {
      /* ignore */
    }
  })
}

export function getUnlockedFor(userId: string | null | undefined) {
  return getUnlocked(userId)
}
