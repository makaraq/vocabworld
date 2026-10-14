import React from 'react'
import { staticFile } from 'remotion'
import { Flashcard } from '../app-ui/LearningView'
import type { AudioStep } from '../app-ui/LearningView'
import type { LearningWord } from '../app-ui/app-data'

// The app's flashcard pair lifted out of the phone: a piece of the main
// panel (backdrop, glass, the two cards) drawn with the app's own classes at
// the 440pt width, scaled up by the caller. The target-language card shows
// the word and its IPA; the playing card swells and shows the blue dot, as
// it does while audio plays in the app.

export const VocabularyCard: React.FC<{
  word: LearningWord
  targetLanguage: string
  nativeLanguage: string
  audioStep: AudioStep
  cardScale: [number, number]
  pulse: number
  /** Which part of the backdrop shows through, in % of the image. */
  backdropPosition?: string
  style?: React.CSSProperties
}> = ({ word, targetLanguage, nativeLanguage, audioStep, cardScale, pulse, backdropPosition = '42% 46%', style }) => (
  <div
    className="app-ui liquid-glass cap-native"
    style={{
      position: 'relative',
      width: 440,
      borderRadius: 36,
      overflow: 'hidden',
      backgroundImage: `url('${staticFile('app/bg.jpeg')}')`,
      backgroundSize: '1700px auto',
      backgroundPosition: backdropPosition,
      boxShadow: '0 40px 90px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08)',
      ...style,
    }}
  >
    <div className="bg-white/5 backdrop-blur-3xl border border-white/15 px-5 py-6">
      <div className="text-center space-y-6">
        <Flashcard
          label={targetLanguage}
          word={word.target}
          phonetic={word.phonetic}
          active={audioStep === 'training'}
          scale={cardScale[0]}
          pulse={pulse}
        />
        <Flashcard
          label={nativeLanguage}
          word={word.native}
          active={audioStep === 'main'}
          scale={cardScale[1]}
          pulse={pulse}
        />
      </div>
    </div>
  </div>
)
