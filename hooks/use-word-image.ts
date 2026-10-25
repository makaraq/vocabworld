import { useEffect, useState } from 'react'
import { getWordImageUrl } from '@/lib/word-images'
import { getCachedWordImageSrc, loadWordImage } from '@/lib/offline/word-image-cache'

// The src to show for a word's flashcard art, or null while there is none yet
// (the card leaves the space blank rather than showing a spinner).
// A stored copy is used when there is one. Otherwise, online, the image loads
// straight from the network and is stored in the background; the src isn't
// swapped to the stored copy afterwards, so the image never flickers.
export function useWordImage(wordId: number | null): string | null {
  const pick = () => {
    if (wordId == null) return null
    const cached = getCachedWordImageSrc(wordId)
    if (cached) return cached
    const online = typeof navigator === 'undefined' || navigator.onLine !== false
    return online ? getWordImageUrl(wordId) : null
  }
  const [state, setState] = useState(() => ({ wordId, src: pick() }))
  const src = state.wordId === wordId ? state.src : pick()

  useEffect(() => {
    if (wordId == null || !getWordImageUrl(wordId)) return
    let live = true
    setState(prev => (prev.wordId === wordId ? prev : { wordId, src: pick() }))
    loadWordImage(wordId).then(stored => {
      if (!live || !stored) return
      setState(prev => (prev.wordId === wordId && prev.src ? prev : { wordId, src: stored }))
    })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordId])

  return src
}
