'use client'

import { useState, useEffect } from 'react'
import { Icon } from '@iconify/react'
import { X, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import createSupabaseClient from '@/lib/supabase/client'
import { useT } from '@/components/providers/translation-provider'

interface ExampleSentence {
  id: number
  sentence: string
  translation: string
  sentence_order: number
}

interface CombinedSentence {
  targetSentence: string
  nativeSentence: string
  sentence_order: number
}

interface ExampleSentencesModalProps {
  vocabularyId: number
  sourceWord: string
  targetWord: string
  nativeLanguageCode: string
  targetLanguageCode: string
  userId?: string
  onCloseAction: () => void
  onAddToPlaylistAction?: () => void
}

// Module-level sentence cache so reopening the modal (and opening it after a
// prefetch) renders instantly with no loading state. Sentences are static
// content, so an in-session cache never goes stale.
const sentenceCache = new Map<string, CombinedSentence[]>()
const pendingSentences = new Map<string, Promise<CombinedSentence[]>>()

const sentenceCacheKey = (vocabularyId: number, targetCode: string, nativeCode: string) =>
  `${vocabularyId}:${targetCode}:${nativeCode}`

export function getCachedSentences(
  vocabularyId: number,
  targetCode: string,
  nativeCode: string
): CombinedSentence[] | undefined {
  return sentenceCache.get(sentenceCacheKey(vocabularyId, targetCode, nativeCode))
}

function fetchSentences(
  vocabularyId: number,
  targetCode: string,
  nativeCode: string
): Promise<CombinedSentence[]> {
  const key = sentenceCacheKey(vocabularyId, targetCode, nativeCode)
  const cached = sentenceCache.get(key)
  if (cached) return Promise.resolve(cached)

  let pending = pendingSentences.get(key)
  if (!pending) {
    pending = (async () => {
      const supabase = createSupabaseClient()
      const [targetResult, nativeResult] = await Promise.all([
        supabase
          .from('example_sentences')
          .select('*')
          .eq('vocabulary_id', vocabularyId)
          .eq('language_code', targetCode)
          .order('sentence_order', { ascending: true }),
        supabase
          .from('example_sentences')
          .select('*')
          .eq('vocabulary_id', vocabularyId)
          .eq('language_code', nativeCode)
          .order('sentence_order', { ascending: true })
      ])

      if (targetResult.error) throw targetResult.error

      const combined: CombinedSentence[] = (targetResult.data || []).map((targetSentence: ExampleSentence) => {
        const nativeSentence = nativeResult.data?.find(
          (ns: ExampleSentence) => ns.sentence_order === targetSentence.sentence_order
        )
        return {
          targetSentence: targetSentence.sentence,
          // Use native language sentence if available, otherwise fall back to English translation
          nativeSentence: nativeSentence?.sentence || targetSentence.translation,
          sentence_order: targetSentence.sentence_order
        }
      })

      sentenceCache.set(key, combined)
      pendingSentences.delete(key)
      return combined
    })().catch((err) => {
      pendingSentences.delete(key)
      throw err
    })
    pendingSentences.set(key, pending)
  }
  return pending
}

// Fire-and-forget warm-up, called while a word is on screen so the sentences
// are already here when the user taps the example-sentences button.
export function prefetchExampleSentences(
  vocabularyId: number,
  targetCode: string,
  nativeCode: string
): void {
  fetchSentences(vocabularyId, targetCode, nativeCode).catch(() => {})
}

export function ExampleSentencesModal({
  vocabularyId,
  sourceWord,
  targetWord,
  nativeLanguageCode,
  targetLanguageCode,
  userId,
  onCloseAction,
  onAddToPlaylistAction
}: ExampleSentencesModalProps) {
  const { t } = useT()
  // Hydrate from the module cache so a prefetched/reopened word paints
  // immediately with no loading state.
  const initialCached = getCachedSentences(vocabularyId, targetLanguageCode, nativeLanguageCode)
  const [sentences, setSentences] = useState<CombinedSentence[]>(initialCached || [])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(!initialCached)
  // Holds a ui-strings catalog key, translated at render time.
  const [error, setError] = useState<'sentences.none' | 'sentences.loadFailed' | null>(
    initialCached && initialCached.length === 0 ? 'sentences.none' : null
  )
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger animation after mount
    setTimeout(() => setIsVisible(true), 10)

    let cancelled = false
    const cached = getCachedSentences(vocabularyId, targetLanguageCode, nativeLanguageCode)
    if (cached) {
      setSentences(cached)
      setCurrentIndex(0)
      setError(cached.length === 0 ? 'sentences.none' : null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    fetchSentences(vocabularyId, targetLanguageCode, nativeLanguageCode)
      .then((combined) => {
        if (cancelled) return
        setSentences(combined)
        setCurrentIndex(0)
        if (combined.length === 0) setError('sentences.none')
      })
      .catch((err) => {
        if (cancelled) return
        console.error('Error fetching example sentences:', err)
        setError('sentences.loadFailed')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => { cancelled = true }
  }, [vocabularyId, nativeLanguageCode, targetLanguageCode])

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : sentences.length - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < sentences.length - 1 ? prev + 1 : 0))
  }

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
      onClick={onCloseAction}
    >
      <div 
        className={`bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl max-w-lg w-full shadow-2xl transition-all duration-300 ease-out ${
          isVisible ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold text-lg drop-shadow-lg">{sourceWord}</h3>
            <p className="text-white/60 text-sm drop-shadow">{targetWord}</p>
          </div>
          <button
            onClick={onCloseAction}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
          >
            <X className="w-5 h-5 text-white/80" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* No loading animation: prefetch makes this state near-invisible,
              so an empty placeholder just holds the modal's height. */}
          {isLoading && <div className="py-12" />}

          {error && (
            <div className="text-center py-12">
              <Icon icon="solar:close-circle-bold" className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <p className="text-red-300 text-sm drop-shadow">{t(error)}</p>
            </div>
          )}

          {!isLoading && !error && sentences.length > 0 && (
            <div>
              {/* Sentence Counter */}
              <div className="flex items-center justify-center gap-2 mb-4">
                {sentences.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === currentIndex ? 'w-8 bg-blue-400' : 'w-1.5 bg-white/30'
                    }`}
                  />
                ))}
              </div>

              {/* Sentence Display */}
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 mb-4 min-h-[200px] flex flex-col justify-center">
                <div className="space-y-4">
                  {/* Target language sentence */}
                  <div>
                    <p className="text-white text-2xl font-medium leading-relaxed drop-shadow-lg">
                      {sentences[currentIndex]?.targetSentence}
                    </p>
                  </div>

                  {/* Native language translation */}
                  <div className="pt-4 border-t border-white/10">
                    <p className="text-white/70 text-lg drop-shadow">
                      {sentences[currentIndex]?.nativeSentence}
                    </p>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={handlePrevious}
                  className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>

                <span className="text-white/50 text-sm">
                  {t('sentences.counter', { current: currentIndex + 1, total: sentences.length })}
                </span>

                <button
                  onClick={handleNext}
                  className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
                >
                  <ChevronRight className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Add to Playlist Button */}
        {userId && onAddToPlaylistAction && !isLoading && !error && (
          <div className="p-5 border-t border-white/10">
            <button
              onClick={onAddToPlaylistAction}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]"
            >
              <Plus className="w-5 h-5" />
              {t('sentences.addToPlaylist')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
