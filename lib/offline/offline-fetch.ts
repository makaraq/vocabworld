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

// Small GET endpoints cached opportunistically on every successful response,
// so the home screen (topics, names, UI strings) renders offline too.
const PASSIVE_CACHE_PATHS = [
  '/api/topics',
  '/api/languages',
  '/api/ui-translations',
  '/api/topic-translations',
  '/api/category-translations',
  '/api/language-translations',
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

      if (method === 'GET' && urlStr && urlStr.includes('/api/')) {
        const url = new URL(urlStr, window.location.origin)

        if (url.pathname.endsWith('/api/universal-audio')) {
          return await handleAudio(url, () => baseFetch(input as any, init))
        }
        if (url.pathname.endsWith('/api/vocabulary')) {
          return await handleVocabulary(url, () => baseFetch(input as any, init))
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
