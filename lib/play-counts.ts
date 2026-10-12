// How many times each word has been played on this device, per target
// language, for the play-count badge on the flashcard.
//
// Kept locally rather than read from user_word_progress.play_count: a single
// play currently posts /api/progress/track twice (once from the audio
// service's playWordSequence, once from the caller after it succeeds), so the
// server count runs at roughly double the real number.

const keyFor = (targetLanguageCode: string) => `sprind:plays:${targetLanguageCode}`

export type PlayCounts = Record<string, number>

export function readPlayCounts(targetLanguageCode: string): PlayCounts {
  if (!targetLanguageCode) return {}
  try {
    const raw = localStorage.getItem(keyFor(targetLanguageCode))
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

// Records one finished play and returns the updated counts.
export function bumpPlayCount(targetLanguageCode: string, wordId: string | number): PlayCounts {
  const counts = readPlayCounts(targetLanguageCode)
  const id = String(wordId)
  counts[id] = (counts[id] || 0) + 1
  try {
    localStorage.setItem(keyFor(targetLanguageCode), JSON.stringify(counts))
  } catch {}
  return counts
}
