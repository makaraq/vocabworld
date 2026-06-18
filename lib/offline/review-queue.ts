// Offline spaced-repetition review — makes the review tile + session work with
// no connection, and replays grades on reconnect.
//
// Why this is more than the progress queue: an SR review is a STATE TRANSITION
// through FSRS (lib/sr/fsrs.ts), not an additive counter. So grades must replay
// exactly once, in order, carrying the offline timestamp — the server dedups on
// clientEventId (reusing processed_progress_events) and schedules from
// reviewedAt.
//
// Offline behaviour is snapshot-based: the last online /api/sr/due response is
// the source of due cards; cards graded offline are excluded so they aren't
// re-served (no over-review) and the count drops. The server reconciles the
// real schedule on flush.
//
// Storage (IndexedDB `data` store, by key prefix):
//   sr:due:<lang>   → last full due-cards snapshot { cards, totalDue }
//   sr:count:<lang> → last countOnly snapshot { totalDue, totalCards }
//   sr:done:<lang>  → { ids:number[] } cardIds graded offline since last sync
//   srq:<eventId>   → queued review grade

import { idbGet, idbPut, idbDelete, idbGetAll } from './offline-storage'

export interface QueuedReview {
  clientEventId: string
  cardId: number
  rating: number
  targetLang: string
  reviewedAt: string // ISO
}

const DUE = (l: string) => `sr:due:${l}`
const COUNT = (l: string) => `sr:count:${l}`
const DONE = (l: string) => `sr:done:${l}`
const SRQ = (id: string) => `srq:${id}`

export const REVIEW_SYNCED_EVENT = 'vw-review-synced'

// ── Snapshot caching (called from the interceptor on successful GET) ──

export async function cacheDueSnapshot(lang: string, countOnly: boolean, json: any): Promise<void> {
  if (countOnly) {
    await idbPut('data', { key: COUNT(lang), json: { totalDue: json.totalDue ?? 0, totalCards: json.totalCards ?? 0 }, savedAt: Date.now() })
  } else if (Array.isArray(json?.cards)) {
    await idbPut('data', { key: DUE(lang), json: { cards: json.cards, totalDue: json.totalDue ?? json.cards.length }, savedAt: Date.now() })
  }
}

async function doneIds(lang: string): Promise<Set<number>> {
  const rec = (await idbGet<{ json: { ids: number[] } }>('data', DONE(lang)))?.json
  return new Set(rec?.ids || [])
}

// ── Offline serving (snapshot minus already-reviewed) ──

export async function serveDue(lang: string, countOnly: boolean): Promise<any | null> {
  const done = await doneIds(lang)
  if (countOnly) {
    const snap = (await idbGet<{ json: { totalDue: number; totalCards: number } }>('data', COUNT(lang)))?.json
    if (!snap) return null
    return { totalDue: Math.max(0, snap.totalDue - done.size), totalCards: snap.totalCards }
  }
  const snap = (await idbGet<{ json: { cards: any[]; totalDue: number } }>('data', DUE(lang)))?.json
  if (!snap?.cards) return null
  const cards = snap.cards.filter((c) => !done.has(c.cardId))
  return { cards, totalDue: cards.length, dataSource: 'offline-cache' }
}

// ── Queue writes ──

let chain: Promise<unknown> = Promise.resolve()
function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const next = chain.then(fn, fn)
  chain = next.catch(() => {})
  return next
}

export async function enqueueReview(ev: QueuedReview): Promise<void> {
  await idbPut('data', { key: SRQ(ev.clientEventId), json: ev, savedAt: Date.now() })
  await serialize(async () => {
    const key = DONE(ev.targetLang)
    const ids = (await idbGet<{ json: { ids: number[] } }>('data', key))?.json?.ids || []
    if (!ids.includes(ev.cardId)) ids.push(ev.cardId)
    await idbPut('data', { key, json: { ids }, savedAt: Date.now() })
  })
}

// ── Reconnect replay ──

let flushing = false

export async function flushReviews(): Promise<void> {
  if (flushing || typeof navigator === 'undefined' || !navigator.onLine) return
  flushing = true
  try {
    const all = await idbGetAll<{ key: string; json: any }>('data')
    const events = all
      .filter((r) => r.key.startsWith('srq:'))
      .map((r) => r.json as QueuedReview)
      .sort((a, b) => a.reviewedAt.localeCompare(b.reviewedAt))

    const langs = new Set<string>()
    for (const ev of events) {
      langs.add(ev.targetLang)
      let res: Response
      try {
        res = await fetch('/api/sr/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cardId: ev.cardId,
            rating: ev.rating,
            targetLanguageCode: ev.targetLang,
            clientEventId: ev.clientEventId,
            reviewedAt: ev.reviewedAt,
          }),
        })
      } catch {
        break // lost connection mid-flush; rest stays queued
      }
      if (res.ok) {
        await idbDelete('data', SRQ(ev.clientEventId))
      } else if (res.status >= 400 && res.status < 500 && res.status !== 401 && res.status !== 429) {
        await idbDelete('data', SRQ(ev.clientEventId)) // permanent error (e.g. 404 card) — don't wedge the queue
      } else {
        break // 401/429/5xx — retry later
      }
    }

    // Reconcile: refresh snapshots + clear the offline-reviewed set, then tell
    // the review tile to update its count.
    for (const lang of langs) {
      try {
        const countRes = await fetch(`/api/sr/due?targetLanguageCode=${lang}&countOnly=true`)
        await fetch(`/api/sr/due?targetLanguageCode=${lang}&limit=20`).catch(() => {})
        await idbDelete('data', DONE(lang))
        if (countRes.ok && typeof window !== 'undefined') {
          const data = await countRes.json()
          window.dispatchEvent(new CustomEvent(REVIEW_SYNCED_EVENT, { detail: { targetLanguageCode: lang, ...data } }))
        }
      } catch {
        /* best-effort */
      }
    }
  } finally {
    flushing = false
  }
}

export const reviewQueue = { cacheDueSnapshot, serveDue, enqueueReview, flushReviews }
