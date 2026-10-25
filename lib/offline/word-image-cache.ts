// Flashcard art cache. The images aren't bundled into the native apps, so
// every image seen while browsing, and every image in a downloaded language
// pack, is kept in IndexedDB. Cards then show it instantly from an object URL,
// online or offline.

import { idbGet, idbPut, isIndexedDbSupported } from './offline-storage'
import { getWordImageUrl } from '@/lib/word-images'

export const imageKey = (wordId: string | number) => `i:${wordId}`

// Object URLs of images already read from IndexedDB or the network this session
const objectUrls = new Map<number, string>()
const inFlight = new Map<number, Promise<string | null>>()

// Synchronous lookup so a card that was prefetched renders with no flash
export function getCachedWordImageSrc(wordId: number): string | null {
  return objectUrls.get(wordId) ?? null
}

function remember(wordId: number, blob: Blob): string {
  const existing = objectUrls.get(wordId)
  if (existing) return existing
  const url = URL.createObjectURL(blob)
  objectUrls.set(wordId, url)
  return url
}

// Fetch one image and store it. Returns the stored blob, or null when it
// couldn't be fetched (offline, 404, not an image). Throws AbortError.
export async function fetchAndStoreWordImage(wordId: number, signal?: AbortSignal): Promise<Blob | null> {
  const url = getWordImageUrl(wordId)
  if (!url) return null
  let res: Response
  try {
    res = await fetch(url, { signal })
  } catch (err: any) {
    if (err?.name === 'AbortError') throw err
    return null
  }
  const type = res.headers.get('content-type') || ''
  if (!res.ok || type.includes('json') || type.includes('html')) return null
  const blob = await res.blob()
  if (blob.size === 0) return null
  await idbPut('images', { key: imageKey(wordId), blob, size: blob.size, savedAt: Date.now() })
  return blob
}

// Resolve a displayable src for a word's art: memory → IndexedDB → network
// (stored for next time). Concurrent calls for one word share a request.
export function loadWordImage(wordId: number): Promise<string | null> {
  const cached = objectUrls.get(wordId)
  if (cached) return Promise.resolve(cached)
  if (!getWordImageUrl(wordId)) return Promise.resolve(null)
  const pending = inFlight.get(wordId)
  if (pending) return pending

  const job = (async () => {
    if (isIndexedDbSupported()) {
      try {
        const stored = await idbGet<{ blob: Blob }>('images', imageKey(wordId))
        if (stored?.blob) return remember(wordId, stored.blob)
        const blob = await fetchAndStoreWordImage(wordId)
        if (blob) return remember(wordId, blob)
      } catch {}
    }
    return null
  })().finally(() => inFlight.delete(wordId))

  inFlight.set(wordId, job)
  return job
}

// Drop the object URLs, e.g. after the images store was cleared
export function forgetWordImages(): void {
  objectUrls.forEach(url => URL.revokeObjectURL(url))
  objectUrls.clear()
}
