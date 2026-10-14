import React from 'react'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import { Touch, glassPress } from './motion'

// The example-sentences modal a long press on a flashcard opens
// (components/learning/example-sentences-modal.tsx), at the 440pt width.

export interface ExampleSentence {
  /** In the learning language. */
  target: string
  /** In the main language. */
  native: string
}

export const ExampleSentencesModal: React.FC<{
  sourceWord: string
  targetWord: string
  sentences: ExampleSentence[]
  index: number
  /** The modal's entrance: scale-90 opacity-0 → scale-100 opacity-100. */
  visible: number
  touch?: { target: 'next' | 'playlist'; t: number; press: number }
}> = ({ sourceWord, targetWord, sentences, index, visible, touch }) => (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/30 backdrop-blur-[6px]" style={{ opacity: Math.min(1, visible * 1.5) }}>
    <div
      className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl max-w-lg w-full shadow-2xl"
      style={{ transform: `scale(${0.9 + 0.1 * visible})`, opacity: visible }}
    >
      <div className="p-5 border-b border-white/10 flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold text-lg drop-shadow-lg">{sourceWord}</h3>
          <p className="text-white/60 text-sm drop-shadow">{targetWord}</p>
        </div>
        <button className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
          <X className="w-5 h-5 text-white/80" />
        </button>
      </div>

      <div className="p-6">
        <div>
          <div className="flex items-center justify-center gap-2 mb-4">
            {sentences.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full ${i === index ? 'w-8 bg-white/80' : 'w-1.5 bg-white/30'}`} />
            ))}
          </div>

          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 mb-4 min-h-[200px] flex flex-col justify-center">
            <div className="space-y-4">
              <div>
                <p className="text-white text-2xl font-medium leading-relaxed drop-shadow-lg">{sentences[index].target}</p>
              </div>
              <div className="pt-4 border-t border-white/10">
                <p className="text-white/70 text-lg drop-shadow">{sentences[index].native}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <span className="text-white/50 text-sm">
              {index + 1} / {sentences.length}
            </span>
            <button
              className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center"
              style={touch?.target === 'next' ? glassPress(touch.press) : undefined}
            >
              <ChevronRight className="w-5 h-5 text-white" />
              {touch?.target === 'next' && <Touch t={touch.t} />}
            </button>
          </div>
        </div>
      </div>

      <div className="p-5 border-t border-white/10">
        <button
          className="w-full bg-white/10 backdrop-blur-sm border border-white/25 text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2"
          style={touch?.target === 'playlist' ? glassPress(touch.press) : undefined}
        >
          <Plus className="w-5 h-5" />
          Add to Playlist
          {touch?.target === 'playlist' && <Touch t={touch.t} />}
        </button>
      </div>
    </div>
  </div>
)
