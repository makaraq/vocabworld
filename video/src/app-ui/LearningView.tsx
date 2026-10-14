import React from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight, Play, Settings, Square } from 'lucide-react'
import { topicDisplayName, type LearningWord, type Topic } from './app-data'
import { AppIcon } from './icons'
import { getTopicIcon } from './topic-icons'
import { glassPress, Touch } from './motion'

// The learning page of LanguageSelector: header, progress, category label,
// the two flashcards and the playback controls. Classes are the app's,
// resolved for the 440pt width.

export type AudioStep = 'training' | 'main' | 'pause' | 'idle'

export interface FlashcardProps {
  /** Language name above the word ("French", "English"). */
  label: string
  word: string
  /** IPA without slashes; the app adds them. */
  phonetic?: string
  /** This card's language is the one playing. */
  active: boolean
  /** --flashcard-scale: 1 at rest, 1.05 while its audio plays. */
  scale: number
  /** animate-pulse opacity of the playing dot. */
  pulse: number
  /** Opacity of the word text, for the swap between words. */
  textOpacity?: number
}

export const Flashcard: React.FC<FlashcardProps> = ({
  label,
  word,
  phonetic,
  active,
  scale,
  pulse,
  textOpacity = 1,
}) => (
  <div
    role="region"
    data-scale={active ? 'audio' : undefined}
    className={`flashcard-scale relative bg-black/40 border border-white/20 rounded-2xl p-8 shadow-lg ${
      active ? 'bg-blue-500/20 border-blue-400/30' : 'bg-black/40'
    }`}
    style={{ ['--flashcard-scale' as string]: scale } as React.CSSProperties}
  >
    <div className="text-white/60 text-sm mb-2 flex items-center gap-2">
      {label}
      {active && <div className="w-2 h-2 bg-blue-400 rounded-full" style={{ opacity: pulse }} aria-hidden="true" />}
    </div>
    <p className="text-white text-2xl font-medium" style={{ opacity: textOpacity }}>
      {word}
    </p>
    {phonetic && (
      <p className="text-white/50 text-sm italic mt-2" style={{ opacity: textOpacity }}>
        /{phonetic}/
      </p>
    )}
  </div>
)

export interface LearningViewProps {
  topic: Topic
  word: LearningWord
  /** 0-based position in the topic. */
  index: number
  total: number
  targetLanguage: string
  nativeLanguage: string
  audioStep: AudioStep
  /** isPlaying || autoPlayActive */
  playing: boolean
  cardScale: [number, number]
  pulse: number
  showPhonetics?: boolean
  /** Press on the play button, 0 → 1, and the fingertip over it. */
  playPress?: number
  playTouch?: number
  wordOpacity?: number
  contentStyle?: React.CSSProperties
}

export const LearningView: React.FC<LearningViewProps> = ({
  topic,
  word,
  index,
  total,
  targetLanguage,
  nativeLanguage,
  audioStep,
  playing,
  cardScale,
  pulse,
  showPhonetics = true,
  playPress = 0,
  playTouch,
  wordOpacity = 1,
  contentStyle,
}) => {
  const playStateClass = playing
    ? 'bg-red-500/30'
    : audioStep === 'training' || audioStep === 'main'
    ? 'bg-blue-500/30'
    : 'bg-black/40'

  return (
    <div className="text-center" style={contentStyle}>
      <div className="mb-12">
        <div className="flex items-center justify-between mb-8 gap-2">
          <button className="w-12 h-12 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full flex items-center justify-center shadow-lg flex-shrink-0 scale-100">
            <ArrowLeft className="w-6 h-6 text-white/80" />
          </button>

          <div className="flex items-center gap-2 min-w-0 flex-1 justify-center">
            <AppIcon icon={getTopicIcon(topic.id)} className="w-8 h-8 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.8)' }} />
            <h1 className="text-xl font-medium text-white text-center truncate">{topicDisplayName(topic)}</h1>
          </div>

          <button
            data-tour="learning-settings"
            className="w-12 h-12 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full flex items-center justify-center shadow-lg flex-shrink-0 scale-100"
          >
            <Settings className="w-6 h-6 text-white/80" />
          </button>
        </div>

        {/* Progress indicator */}
        <div className="mb-6 text-center">
          <p className="text-white/60 text-sm">
            {index + 1} of {total} words
          </p>
          <div className="w-full bg-white/10 rounded-full h-2 mt-2">
            <div
              className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full"
              style={{ width: `${((index + 1) / total) * 100}%` }}
            />
          </div>
        </div>

        {/* Category indicator */}
        {word.category && (
          <div className="mb-4 flex justify-center items-center gap-3">
            <span className="px-3 py-1 bg-white/10 rounded-lg text-white/70 text-xs font-medium tracking-wider">
              {word.category}
            </span>
          </div>
        )}

        <div data-tour="learning-flashcards" className="space-y-6 mb-12">
          <Flashcard
            label={targetLanguage}
            word={word.target}
            phonetic={showPhonetics ? word.phonetic : undefined}
            active={audioStep === 'training'}
            scale={cardScale[0]}
            pulse={pulse}
            textOpacity={wordOpacity}
          />
          <Flashcard
            label={nativeLanguage}
            word={word.native}
            active={audioStep === 'main'}
            scale={cardScale[1]}
            pulse={pulse}
            textOpacity={wordOpacity}
          />
        </div>

        <div data-tour="learning-controls" className="flex items-center justify-center gap-8">
          <button
            className={`w-14 h-14 bg-black/40 border border-white/20 rounded-full flex items-center justify-center scale-100 ${
              playing ? 'opacity-30' : ''
            }`}
          >
            <ChevronLeft className="w-7 h-7 text-white/80" aria-hidden="true" />
          </button>

          <button
            className={`w-16 h-16 border border-white/20 rounded-full flex items-center justify-center ${playStateClass} scale-100`}
            style={glassPress(playPress, { fill: 0.15, active: 0.26 })}
          >
            {playing ? (
              <Square className="w-8 h-8 text-white/80" aria-hidden="true" />
            ) : (
              <Play className="w-8 h-8 text-white/80 ml-1" aria-hidden="true" />
            )}
            {playTouch !== undefined && <Touch t={playTouch} />}
          </button>

          <button
            className={`w-14 h-14 bg-black/40 border border-white/20 rounded-full flex items-center justify-center scale-100 ${
              playing ? 'opacity-30' : ''
            }`}
          >
            <ChevronRight className="w-7 h-7 text-white/80" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}
