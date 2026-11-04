// LocalStorage-backed persistence for unlocked achievements.
// Per-user namespacing keeps multiple sign-ins on the same device clean.

const KEY_PREFIX = 'vw_achievements_v1::'
const LANG_SET_KEY = 'vw_languages_started_v1'

export interface UnlockedRecord {
  id: string
  unlockedAt: number // ms epoch
}

function storageKey(userId: string | null | undefined): string {
  return KEY_PREFIX + (userId || 'guest')
}

export function getUnlocked(userId: string | null | undefined): UnlockedRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function isUnlocked(userId: string | null | undefined, id: string): boolean {
  return getUnlocked(userId).some((r) => r.id === id)
}

export function markUnlocked(
  userId: string | null | undefined,
  id: string,
): { added: boolean; record: UnlockedRecord } {
  if (typeof window === 'undefined') {
    return { added: false, record: { id, unlockedAt: Date.now() } }
  }
  const list = getUnlocked(userId)
  const existing = list.find((r) => r.id === id)
  if (existing) return { added: false, record: existing }
  const record: UnlockedRecord = { id, unlockedAt: Date.now() }
  list.push(record)
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(list))
  } catch {
    // ignore quota errors
  }
  return { added: true, record }
}

// Which languages this account has practiced, for the polyglot achievements.
// The list used to be one per device, so a new account on a phone that had
// seen ten languages unlocked every language badge on arrival. An account that
// already holds a language badge earned it from that old list, so it carries
// the list over; anyone else starts empty.
function languagesStarted(userId: string | null | undefined): string[] {
  const own = localStorage.getItem(`${LANG_SET_KEY}::${userId || 'guest'}`)
  const holdsBadge = getUnlocked(userId).some((r) => r.id.startsWith('languages_'))
  const raw = own ?? (holdsBadge ? localStorage.getItem(LANG_SET_KEY) : null)
  const parsed = raw ? JSON.parse(raw) : []
  return Array.isArray(parsed) ? parsed : []
}

export function recordLanguageStarted(userId: string | null | undefined, code: string): number {
  if (typeof window === 'undefined' || !code) return 0
  try {
    const set = new Set<string>(languagesStarted(userId))
    set.add(code)
    localStorage.setItem(`${LANG_SET_KEY}::${userId || 'guest'}`, JSON.stringify(Array.from(set)))
    return set.size
  } catch {
    return 0
  }
}

export function getLanguagesStartedCount(userId: string | null | undefined): number {
  if (typeof window === 'undefined') return 0
  try {
    return languagesStarted(userId).length
  } catch {
    return 0
  }
}
