// Global fetch interceptor that makes downloaded language packs actually work
// offline.
//
// Every data/audio path in the app ultimately funnels through window.fetch:
//  - vocabulary/topics/translations are plain fetch('/api/...') calls
//  - audio playback falls back to fetch + Web Audio when the <audio> element
//    fails (which it always does offline, and always does on native where
//    relative /api/ URLs don't resolve against capacitor://localhost)
// so intercepting fetch is enough to serve the whole learn flow from
// IndexedDB.
//
// Install order matters on native: the inline <head> script in app/layout.tsx
// rewrites '/api/...' to the Vercel origin and attaches the Bearer token. This
// wrapper is installed later (React effect), so it sees the ORIGINAL relative
// URL first and delegates to the rewritten fetch on cache miss.

import { idbGet, idbPut } from './offline-storage'
import { normalizeLangParam, vocabKey, audioKey } from './offline-manager'
import { recordPlay, enqueuePlay, markDayActive, deriveProgress } from './progress-queue'
import { buildQuizCards, buildDistractors } from './offline-quiz'
import { cacheDueSnapshot, serveDue, enqueueReview } from './review-queue'

// Small GET endpoints cached opportunistically on every successful response,
// so the home screen (topics, names, UI strings) renders offline too.
//
// The progress endpoints are user- and language-scoped (userId +
// targetLanguageCode live in the query string), so each pair caches under its
// own key. Mirroring the last online response keeps topic-completion borders
// and the account stats card populated offline instead of going blank. They're
// network-first (handlePassive), so they stay fresh whenever there's a
// connection — the cache is a fallback, never stale-over-live.
const PASSIVE_CACHE_PATHS = [
  '/api/topics',
  '/api/languages',
  '/api/ui-translations',
  '/api/topic-translations',
  '/api/category-translations',
  '/api/language-translations',
  '/api/progress/topics',
  '/api/progress/stats',
]

let installed = false

export function installOfflineFetch(): void {
  if (installed || typeof window === 'undefined' || typeof indexedDB === 'undefined') return
  installed = true

  const baseFetch = window.fetch.bind(window)

  window.fetch = async function offlineFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    try {
      const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase()
      const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url

      if (method === 'POST' && urlStr && urlStr.includes('/api/progress/track')) {
        const handled = await handleTrackPost(input, init, baseFetch)
        if (handled) return handled
      }

      if (method === 'POST' && urlStr && urlStr.includes('/api/sr/review')) {
        const handled = await handleReviewPost(input, init, baseFetch)
        if (handled) return handled
      }

      if (method === 'GET' && urlStr && urlStr.includes('/api/')) {
        const url = new URL(urlStr, window.location.origin)

        if (url.pathname.endsWith('/api/universal-audio')) {
          return await handleAudio(url, () => baseFetch(input as any, init))
        }
        if (url.pathname.endsWith('/api/vocabulary')) {
          return await handleVocabulary(url, () => baseFetch(input as any, init))
        }
        if (url.pathname.endsWith('/api/quiz/topic')) {
          return await handleQuizTopic(url, () => baseFetch(input as any, init))
        }
        if (url.pathname.endsWith('/api/sr/distractors')) {
          return await handleDistractors(url, () => baseFetch(input as any, init))
        }
        if (url.pathname.endsWith('/api/sr/due')) {
          return await handleSrDue(url, () => baseFetch(input as any, init))
        }
        const passivePath = PASSIVE_CACHE_PATHS.find(p => url.pathname.endsWith(p))
        if (passivePath) {
          return await handlePassive(url, () => baseFetch(input as any, init))
        }
      }
    } catch {
      // Interceptor must never make things worse — fall through to network
    }
    return baseFetch(input as any, init)
  }
}

// ── Audio: cache-first (instant playback + zero bandwidth once downloaded) ──

async function handleAudio(url: URL, network: () => Promise<Response>): Promise<Response> {
  const wordId = url.searchParams.get('wordId')
  const languageCode = url.searchParams.get('languageCode')

  if (wordId && languageCode) {
    try {
      const cached = await idbGet<{ blob: Blob }>('audio', audioKey(languageCode, wordId))
      if (cached?.blob && cached.blob.size > 0) {
        return new Response(cached.blob, {
          status: 200,
          headers: {
            'Content-Type': cached.blob.type || 'audio/wav',
            'X-Offline-Cache': 'hit',
          },
        })
      }
    } catch {}
  }

  try {
    return await network()
  } catch (err) {
    return offlineErrorResponse('This audio is not downloaded for offline use.')
  }
}

// ── Progress track: record + queue offline, optimistic completion response ──
//
// Returns a Response when it has taken ownership of the request, or null to let
// the caller fall through untouched (unrecognised body shape, missing fields).

async function handleTrackPost(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  baseFetch: typeof fetch
): Promise<Response | null> {
  // The app posts a plain JSON string body; anything else we don't own.
  if (typeof init?.body !== 'string') return null
  let body: any
  try { body = JSON.parse(init.body) } catch { return null }

  const vocabularyId = body.vocabularyId
  const targetLang = body.targetLanguageCode
  if (!vocabularyId || !targetLang) return null

  const clientEventId: string =
    body.clientEventId ||
    (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`)
  const playedAt: string = body.playedAt || new Date().toISOString()

  // Record every play locally (online too) so offline completion derivation has
  // an accurate device history.
  recordPlay(vocabularyId, targetLang, playedAt).catch(() => {})

  // Forward to the server with the idempotency key + real timestamp attached, so
  // a later replay of the same event dedups instead of double-counting.
  const fwdInit: RequestInit = { ...init, body: JSON.stringify({ ...body, clientEventId, playedAt }) }
  try {
    const res = await baseFetch(input as any, fwdInit)
    if (res.ok) return res
    // Reachable but errored (5xx, etc.) — fall through to the offline path.
  } catch {
    // Offline — fall through.
  }

  // Offline / failed: durably queue for replay and answer optimistically so the
  // border lights up and the completion modal can fire now.
  try {
    await enqueuePlay({ clientEventId, vocabularyId, targetLang, playedAt, tries: 0 })
    const tz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined
    await markDayActive(new Date().toLocaleDateString('en-CA'), tz)
    const derived = await deriveProgress(targetLang)
    return jsonResponse({ success: true, isNewWord: false, offline: true, stats: null, ...derived })
  } catch {
    return offlineErrorResponse('Progress will sync when you reconnect.')
  }
}

// ── Vocabulary: network-first, IndexedDB fallback with limit/offset slicing ──

async function handleVocabulary(url: URL, network: () => Promise<Response>): Promise<Response> {
  const offlineAttempt = () => serveVocabularyOffline(url)

  if (!navigator.onLine) {
    const offline = await offlineAttempt()
    if (offline) return offline
  }
  try {
    const res = await network()
    if (res.ok) return res
    const offline = await offlineAttempt()
    return offline || res
  } catch (err) {
    const offline = await offlineAttempt()
    if (offline) return offline
    throw err
  }
}

async function serveVocabularyOffline(url: URL): Promise<Response | null> {
  try {
    const topicId = url.searchParams.get('topicId')
    if (!topicId) return null
    const learnCode = normalizeLangParam(url.searchParams.get('sourceLanguage'))
    const nativeCode = normalizeLangParam(url.searchParams.get('targetLanguage'))
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)
    const offset = parseInt(url.searchParams.get('offset') || '0', 10)

    const record = await idbGet<{ json: any }>('data', vocabKey(topicId, learnCode, nativeCode))
    const all = record?.json?.vocabulary
    if (!Array.isArray(all)) return null

    const slice = all.slice(offset, offset + limit)
    const totalWords = record.json.totalWords ?? all.length
    return jsonResponse({
      vocabulary: slice,
      totalWords,
      currentBatch: slice.length,
      hasMore: offset + slice.length < totalWords,
      dataSource: 'offline-cache',
    })
  } catch {
    return null
  }
}

// ── Quiz: network-first, rebuilt from cached vocabulary when offline ────────

async function handleQuizTopic(url: URL, network: () => Promise<Response>): Promise<Response> {
  const offlineAttempt = async (): Promise<Response | null> => {
    const topicId = url.searchParams.get('topicId')
    const targetLang = normalizeLangParam(url.searchParams.get('targetLanguageCode'))
    const sourceLang = normalizeLangParam(url.searchParams.get('sourceLanguageCode'))
    const limit = parseInt(url.searchParams.get('limit') || '20', 10)
    if (!topicId) return null
    const data = await buildQuizCards(topicId, targetLang, sourceLang, limit)
    return data ? jsonResponse({ ...data, dataSource: 'offline-cache' }) : null
  }
  return networkFirstWithOffline(network, offlineAttempt)
}

async function handleDistractors(url: URL, network: () => Promise<Response>): Promise<Response> {
  const offlineAttempt = async (): Promise<Response | null> => {
    const vocabularyId = parseInt(url.searchParams.get('vocabularyId') || '', 10)
    const distractorLang = normalizeLangParam(url.searchParams.get('targetLanguageCode'))
    const count = parseInt(url.searchParams.get('count') || '3', 10)
    if (!vocabularyId) return null
    const data = await buildDistractors(vocabularyId, distractorLang, count)
    return data ? jsonResponse(data) : null
  }
  return networkFirstWithOffline(network, offlineAttempt)
}

// Shared network-first strategy: offline first when known-offline, otherwise
// network with a cache rebuild fallback on failure/non-ok.
async function networkFirstWithOffline(
  network: () => Promise<Response>,
  offlineAttempt: () => Promise<Response | null>
): Promise<Response> {
  if (!navigator.onLine) {
    const offline = await offlineAttempt()
    if (offline) return offline
  }
  try {
    const res = await network()
    if (res.ok) return res
    const offline = await offlineAttempt()
    return offline || res
  } catch (err) {
    const offline = await offlineAttempt()
    if (offline) return offline
    throw err
  }
}

// ── SR due: network-first, snapshot cached, served (minus reviewed) offline ──

async function handleSrDue(url: URL, network: () => Promise<Response>): Promise<Response> {
  const lang = normalizeLangParam(url.searchParams.get('targetLanguageCode'))
  const countOnly = url.searchParams.get('countOnly') === 'true'
  const offlineAttempt = async (): Promise<Response | null> => {
    const data = await serveDue(lang, countOnly)
    return data ? jsonResponse(data) : null
  }

  if (!navigator.onLine) {
    const offline = await offlineAttempt()
    if (offline) return offline
  }
  try {
    const res = await network()
    if (res.ok) {
      res.clone().json().then((j) => cacheDueSnapshot(lang, countOnly, j)).catch(() => {})
      return res
    }
    const offline = await offlineAttempt()
    return offline || res
  } catch (err) {
    const offline = await offlineAttempt()
    if (offline) return offline
    throw err
  }
}

// ── SR review: queue offline, replay on reconnect (mirrors handleTrackPost) ──

async function handleReviewPost(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  baseFetch: typeof fetch
): Promise<Response | null> {
  if (typeof init?.body !== 'string') return null
  let body: any
  try { body = JSON.parse(init.body) } catch { return null }

  const cardId = body.cardId
  const rating = body.rating
  const targetLang = body.targetLanguageCode
  if (!cardId || !rating || !targetLang) return null

  const clientEventId: string =
    body.clientEventId ||
    (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`)
  const reviewedAt: string = body.reviewedAt || new Date().toISOString()

  const fwdInit: RequestInit = { ...init, body: JSON.stringify({ ...body, clientEventId, reviewedAt }) }
  try {
    const res = await baseFetch(input as any, fwdInit)
    if (res.ok) return res
  } catch {
    // Offline — fall through.
  }

  try {
    await enqueueReview({ clientEventId, cardId, rating, targetLang, reviewedAt })
    return jsonResponse({ success: true, offline: true })
  } catch {
    return offlineErrorResponse('Review will sync when you reconnect.')
  }
}

// ── Small endpoints: network-first, passively cached, served when offline ──

async function handlePassive(url: URL, network: () => Promise<Response>): Promise<Response> {
  const key = `g:${url.pathname}${url.search}`

  if (!navigator.onLine) {
    const cached = await readPassive(key)
    if (cached) return cached
  }
  try {
    const res = await network()
    if (res.ok) {
      // Store a copy without blocking the response
      res.clone().json()
        .then(json => idbPut('data', { key, json, savedAt: Date.now() }))
        .catch(() => {})
    }
    return res
  } catch (err) {
    const cached = await readPassive(key)
    if (cached) return cached
    throw err
  }
}

async function readPassive(key: string): Promise<Response | null> {
  try {
    const record = await idbGet<{ json: any }>('data', key)
    if (record && record.json !== undefined) return jsonResponse(record.json)
  } catch {}
  return null
}

function jsonResponse(json: any): Response {
  return new Response(JSON.stringify(json), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'X-Offline-Cache': 'hit' },
  })
}

function offlineErrorResponse(message: string): Response {
  return new Response(JSON.stringify({ error: 'offline', message }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  })
}
