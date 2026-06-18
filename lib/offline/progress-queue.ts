// Offline progress queue — makes learning done offline count.
//
// Every word the user plays funnels through POST /api/progress/track (see
// offline-fetch.ts, which calls into here). When that POST can't reach the
// server we:
//   1. record the play in a local mirror (so topic completion can be derived),
//   2. queue the event durably (so it replays to the server on reconnect),
//   3. mark the day active (so the streak credits offline-learning days).
//
// On reconnect `flush()` replays the queue with each event's stable
// clientEventId (the server dedups → exactly-once, no double-counted score),
// then refetches the authoritative snapshot so tiers/stats reconcile.
//
// Storage (all in the existing IndexedDB `data` store, keyed by prefix):
//   pw:<lang>            → { [vocabId]: { count, lastPlayedAt } }  play mirror
//   q:<clientEventId>    → queued word-played event
//   qd:<YYYY-MM-DD>      → queued active-day marker
//   vocab:<topic>:<a>:<b>→ cached topic vocabulary (written by offline-manager)
//   g:/api/progress/topics?… → last server completion snapshot (passive cache)

import { idbGet, idbPut, idbDelete, idbGetAll } from './offline-storage'

export interface QueuedPlay {
  clientEventId: string
  vocabularyId: number
  targetLang: string
  playedAt: string // ISO
  tries: number
}

type PlayMirror = Record<string, { count: number; lastPlayedAt: string }>

const PW = (lang: string) => `pw:${lang}`
const Q = (id: string) => `q:${id}`
const QD = (date: string) => `qd:${date}`

export const PROGRESS_SYNCED_EVENT = 'vw-progress-synced'

// ── Local play mirror ────────────────────────────────────────────────────
// Read-modify-write, serialized so rapid consecutive plays don't lose updates.
let writeChain: Promise<unknown> = Promise.resolve()
function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const next = writeChain.then(fn, fn)
  writeChain = next.catch(() => {})
  return next
}

export function recordPlay(vocabularyId: number, targetLang: string, playedAt: string): Promise<void> {
  return serialize(async () => {
    const key = PW(targetLang)
    const rec = (await idbGet<{ key: string; json: PlayMirror }>('data', key))?.json || {}
    const id = String(vocabularyId)
    const prev = rec[id]
    rec[id] = { count: (prev?.count || 0) + 1, lastPlayedAt: playedAt }
    await idbPut('data', { key, json: rec, savedAt: Date.now() })
  })
}

async function getPlayed(targetLang: string): Promise<Set<number>> {
  const rec = (await idbGet<{ json: PlayMirror }>('data', PW(targetLang)))?.json
  const set = new Set<number>()
  if (rec) for (const id of Object.keys(rec)) set.add(Number(id))
  return set
}

// ── Queue write ──────────────────────────────────────────────────────────

export async function enqueuePlay(event: QueuedPlay): Promise<void> {
  await idbPut('data', { key: Q(event.clientEventId), json: event, savedAt: Date.now() })
}

export async function markDayActive(date: string, timezone?: string): Promise<void> {
  // One marker per local date (idempotent); server streak is also idempotent per date.
  await idbPut('data', { key: QD(date), json: { date, timezone: timezone || null }, savedAt: Date.now() })
}

// ── Optimistic completion derivation ──────────────────────────────────────
// completedTopicIds = (last server snapshot) ∪ (topics whose full word set is
// now in the local play mirror). Completion-count tiers stay at the server
// value and reconcile on flush; a freshly-completed topic still shows its
// border because renderTopicButton treats membership in completedTopicIds as
// completed.

export async function deriveProgress(
  targetLang: string
): Promise<{ completedTopicIds: number[]; topicCompletionCounts: Record<number, number> }> {
  const all = await idbGetAll<{ key: string; json: any }>('data')
  const played = await getPlayed(targetLang)

  // Topic → set of word ids, preferring the record for this learned language
  // (ids are canonical across pairs, so any record is a valid fallback).
  const exact = new Map<number, Set<number>>()
  const any = new Map<number, Set<number>>()
  for (const r of all) {
    if (!r.key.startsWith('vocab:')) continue
    const [, topicStr, learnCode] = r.key.split(':')
    const topicId = Number(topicStr)
    if (!topicId) continue
    const ids = new Set<number>()
    for (const w of r.json?.vocabulary || []) if (w && typeof w.id === 'number') ids.add(w.id)
    if (ids.size === 0) continue
    ;(learnCode === targetLang ? exact : any).set(topicId, ids)
  }

  // Base snapshot from the passive-cached server response for this language.
  let base: { completedTopicIds?: number[]; topicCompletionCounts?: Record<number, number> } = {}
  const snap = all.find(
    (r) => r.key.startsWith('g:/api/progress/topics') && r.key.includes(`targetLanguageCode=${targetLang}`)
  )
  if (snap?.json) base = snap.json

  const completed = new Set<number>(base.completedTopicIds || [])
  const topicIds = new Set<number>([...exact.keys(), ...any.keys()])
  for (const topicId of topicIds) {
    const ids = exact.get(topicId) || any.get(topicId)!
    let allPlayed = true
    for (const id of ids) if (!played.has(id)) { allPlayed = false; break }
    if (allPlayed) completed.add(topicId)
  }

  return {
    completedTopicIds: [...completed],
    topicCompletionCounts: base.topicCompletionCounts || {},
  }
}

// ── Reconnect flush ───────────────────────────────────────────────────────

let flushing = false

export async function hasPendingWork(): Promise<boolean> {
  const all = await idbGetAll<{ key: string }>('data')
  return all.some((r) => r.key.startsWith('q:') || r.key.startsWith('qd:'))
}

export async function flush(): Promise<void> {
  if (flushing || typeof navigator === 'undefined' || !navigator.onLine) return
  flushing = true
  try {
    const all = await idbGetAll<{ key: string; json: any }>('data')

    // Word-played events, oldest first, one in flight, delete-after-confirmed.
    const events = all
      .filter((r) => r.key.startsWith('q:'))
      .map((r) => r.json as QueuedPlay)
      .sort((a, b) => a.playedAt.localeCompare(b.playedAt))

    const langsTouched = new Set<string>()
    for (const ev of events) {
      langsTouched.add(ev.targetLang)
      let res: Response
      try {
        res = await fetch('/api/progress/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vocabularyId: ev.vocabularyId,
            targetLanguageCode: ev.targetLang,
            clientEventId: ev.clientEventId,
            playedAt: ev.playedAt,
          }),
        })
      } catch {
        break // lost connection mid-flush; remaining events stay queued
      }
      if (res.ok) {
        await idbDelete('data', Q(ev.clientEventId))
      } else if (res.status >= 400 && res.status < 500 && res.status !== 401 && res.status !== 429) {
        // Permanent client error (e.g. 400) — drop so it can't wedge the queue.
        await idbDelete('data', Q(ev.clientEventId))
      } else {
        break // 401/429/5xx — retry on a later flush
      }
    }

    // Active-day markers, oldest first (streak grace math needs ascending order).
    const days = all
      .filter((r) => r.key.startsWith('qd:'))
      .map((r) => r.json as { date: string; timezone: string | null })
      .sort((a, b) => a.date.localeCompare(b.date))
    for (const d of days) {
      try {
        const res = await fetch('/api/progress/streak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ timezone: d.timezone || undefined, activeDate: d.date }),
        })
        if (res.ok) await idbDelete('data', QD(d.date))
        else if (res.status !== 401 && res.status !== 429 && res.status < 500) await idbDelete('data', QD(d.date))
        else break
      } catch {
        break
      }
    }

    // Reconcile: refetch authoritative snapshots (refreshes the passive cache)
    // and let the UI pull the server's exact completion tiers / stats.
    for (const lang of langsTouched) {
      try {
        const r = await fetch(`/api/progress/topics?targetLanguageCode=${lang}`)
        if (r.ok && typeof window !== 'undefined') {
          const data = await r.json()
          window.dispatchEvent(
            new CustomEvent(PROGRESS_SYNCED_EVENT, { detail: { targetLanguageCode: lang, ...data } })
          )
        }
        await fetch(`/api/progress/stats?targetLanguageCode=${lang}`).catch(() => {})
      } catch {
        /* best-effort reconcile */
      }
    }
  } finally {
    flushing = false
  }
}

export const progressQueue = { recordPlay, enqueuePlay, markDayActive, deriveProgress, flush, hasPendingWork }
