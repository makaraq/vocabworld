// Offline quiz — rebuilds /api/quiz/topic and /api/sr/distractors from the
// vocabulary already cached by a downloaded language pack, so topic quizzes work
// with no connection. The server endpoints only shuffle vocabulary + pick
// distractors, which is pure client-side work once the words are on device.
//
// Naming note: the cached /api/vocabulary items use the OPPOSITE convention to
// the quiz endpoint. A pack is downloaded with sourceLanguage = the language
// being learned, so on each cached item:
//   item.sourceWord  = the LEARNED-language word   → quiz card.targetWord
//   item.targetWord  = the NATIVE-language word     → quiz card.sourceWord (answer)
//   item.english_word = English

import { idbGet, idbGetAll } from './offline-storage'
import { vocabKey } from './offline-manager'

interface CachedWord {
  id: number
  sourceWord?: string
  targetWord?: string
  english_word?: string
}

interface QuizCard {
  vocabularyId: number
  targetWord: string
  sourceWord: string
  englishWord: string
}

async function topicVocab(topicId: string, learnCode: string, nativeCode: string): Promise<CachedWord[] | null> {
  // Exact pair first (what the running quiz was opened with).
  const exact = await idbGet<{ json: { vocabulary?: CachedWord[] } }>(
    'data',
    vocabKey(topicId, learnCode, nativeCode)
  )
  const v = exact?.json?.vocabulary
  if (Array.isArray(v) && v.length) return v
  return null
}

// Mirrors /api/quiz/topic → { cards, totalWords }.
export async function buildQuizCards(
  topicId: string,
  targetLanguageCode: string, // learned
  sourceLanguageCode: string, // native
  limit: number
): Promise<{ cards: QuizCard[]; totalWords: number } | null> {
  const vocab = await topicVocab(topicId, targetLanguageCode, sourceLanguageCode)
  if (!vocab) return null

  const valid = vocab.filter((w) => w && typeof w.id === 'number')
  if (valid.length === 0) return null

  const shuffled = [...valid].sort(() => Math.random() - 0.5).slice(0, limit)
  const cards: QuizCard[] = shuffled.map((w) => ({
    vocabularyId: w.id,
    targetWord: w.sourceWord || w.english_word || '',
    sourceWord: w.targetWord || w.english_word || '',
    englishWord: w.english_word || w.sourceWord || '',
  }))
  return { cards, totalWords: valid.length }
}

// Mirrors /api/sr/distractors → { distractors }. `distractorLang` is the answer
// language (the modal passes sourceLanguageCode = native), which is item.targetWord.
export async function buildDistractors(
  vocabularyId: number,
  distractorLang: string,
  count: number
): Promise<{ distractors: string[] } | null> {
  const all = await idbGetAll<{ key: string; json: { vocabulary?: CachedWord[] } }>('data')

  // The record for this word whose native side matches the answer language.
  let rec: { vocabulary?: CachedWord[] } | null = null
  for (const r of all) {
    if (!r.key.startsWith('vocab:')) continue
    const nativeCode = r.key.split(':')[3]
    if (nativeCode !== distractorLang) continue
    const vocab = r.json?.vocabulary
    if (Array.isArray(vocab) && vocab.some((w) => w?.id === vocabularyId)) {
      rec = r.json
      break
    }
  }
  if (!rec?.vocabulary) return null

  const correct = rec.vocabulary.find((w) => w?.id === vocabularyId)
  const correctWord = correct?.targetWord || correct?.english_word || ''

  const pool = Array.from(
    new Set(
      rec.vocabulary
        .filter((w) => w && w.id !== vocabularyId)
        .map((w) => w.targetWord || w.english_word || '')
        .filter((word) => word && word !== correctWord)
    )
  )
  const distractors = pool.sort(() => Math.random() - 0.5).slice(0, count)
  return { distractors }
}
