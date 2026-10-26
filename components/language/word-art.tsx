'use client'

import { useWordImage } from '@/hooks/use-word-image'

// A flashcard's illustration. It fills whatever height the card leaves it
// (the card's flex column decides that), fitted without cropping. The box is
// laid out even before the image is ready, so the word below it doesn't jump
// when the art appears.
export function WordArt({ wordId }: { wordId: number }) {
  const src = useWordImage(wordId)
  return (
    <div className="relative mb-3 flex-1 min-h-0 w-full">
      {src && (
        <img
          key={src}
          src={src}
          alt=""
          draggable={false}
          className="absolute inset-0 block h-full w-full object-contain select-none pointer-events-none"
        />
      )}
    </div>
  )
}
