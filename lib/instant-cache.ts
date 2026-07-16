// Synchronous stale-while-revalidate cache over localStorage.
//
// The UI reads the last known value with readCached() while state is being
// initialized (localStorage is synchronous, so cached screens paint on the
// first frame with no spinner), then refreshes from the network and calls
// writeCached() with the fresh data. Values must be JSON-serializable and
// small (lists, progress numbers, positions) — bulky data like vocabulary
// belongs in the IndexedDB offline store instead.

const PREFIX = 'vw-swr:'

export function readCached<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw == null) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function writeCached(key: string, data: unknown): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(data))
  } catch {
    // Quota/private-mode failures just mean the next visit refetches.
  }
}
