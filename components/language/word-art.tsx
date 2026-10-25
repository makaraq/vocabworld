'use client'

import { useWordImage } from '@/hooks/use-word-image'

// A flashcard's illustration. The box is laid out even before the image is
// ready, so the word below it doesn't jump when the art appears.
export function WordArt({ wordId }: { wordId: number }) {
  const src = useWordImage(wordId)
  return (
    <div className="mb-3 flex-1 min-h-0 w-full flex items-center justify-center">
      {src && (
        <img
          key={src}
          src={src}
          alt=""
          draggable={false}
          className="block h-full max-h-[var(--art)] w-auto max-w-full object-contain select-none pointer-events-none"
        />
      )}
    </div>
  )
}
