'use client'

import { useState, useEffect } from 'react'
import { Icon } from '@iconify/react'
import { X, ChevronLeft, ChevronRight, Plus, Volume2 } from 'lucide-react'
import createSupabaseClient from '@/lib/supabase/client'

interface ExampleSentence {
  id: number
  sentence: string
  translation: string
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
  const [sentences, setSentences] = useState<ExampleSentence[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null)

  useEffect(() => {
    // Trigger animation after mount
    setTimeout(() => setIsVisible(true), 10)
    fetchExampleSentences()
  }, [vocabularyId, targetLanguageCode])

  const fetchExampleSentences = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const supabase = createSupabaseClient()
      const { data, error: fetchError } = await supabase
        .from('example_sentences')
        .select('*')
        .eq('vocabulary_id', vocabularyId)
        .eq('language_code', targetLanguageCode)
        .order('sentence_order', { ascending: true })

      if (fetchError) throw fetchError

      if (!data || data.length === 0) {
        setError('No example sentences available for this word')
      } else {
        setSentences(data)
      }
    } catch (err: any) {
      console.error('Error fetching example sentences:', err)
      setError(err.message || 'Failed to load example sentences')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePrevious = () => {
    // Stop any playing audio when switching sentences
    if (currentAudio) {
      currentAudio.pause()
      setCurrentAudio(null)
      setIsPlayingAudio(false)
    }
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : sentences.length - 1))
  }

  const handleNext = () => {
    // Stop any playing audio when switching sentences
    if (currentAudio) {
      currentAudio.pause()
      setCurrentAudio(null)
      setIsPlayingAudio(false)
    }
    setCurrentIndex((prev) => (prev < sentences.length - 1 ? prev + 1 : 0))
  }

  const handlePlayAudio = async () => {
    // If already playing, stop it
    if (isPlayingAudio) {
      if (currentAudio) {
        currentAudio.pause()
        setCurrentAudio(null)
      }
      window.speechSynthesis?.cancel()
      setIsPlayingAudio(false)
      return
    }

    const sentence = sentences[currentIndex]?.sentence
    if (!sentence) {
      console.error('No sentence available')
      return
    }

    try {
      setIsPlayingAudio(true)
      
      // Use browser Speech Synthesis API (works everywhere)
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel() // Cancel any ongoing speech
        
        const utterance = new SpeechSynthesisUtterance(sentence)
        utterance.lang = targetLanguageCode
        utterance.rate = 0.9
        utterance.pitch = 1.0
        
        utterance.onend = () => {
          setIsPlayingAudio(false)
        }
        
        utterance.onerror = () => {
          setIsPlayingAudio(false)
        }
        
        window.speechSynthesis.speak(utterance)
      } else {
        setIsPlayingAudio(false)
      }
    } catch (error) {
      console.error('Failed to play audio:', error)
      setIsPlayingAudio(false)
      setCurrentAudio(null)
    }
  }

  // Stop audio when currentIndex changes
  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause()
        setCurrentAudio(null)
        setIsPlayingAudio(false)
      }
    }
  }, [currentIndex])

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause()
        setCurrentAudio(null)
      }
    }
  }, [])

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
          {isLoading && (
            <div className="text-center py-12">
              <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-3" />
              <p className="text-white/50 text-sm drop-shadow">Loading examples...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <Icon icon="solar:close-circle-bold" className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <p className="text-red-300 text-sm drop-shadow">{error}</p>
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
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 mb-4 min-h-[200px] flex flex-col justify-center relative">
                {/* Speaker button */}
                <button
                  onClick={handlePlayAudio}
                  disabled={isPlayingAudio}
                  className={`absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all border border-white/20 ${
                    isPlayingAudio 
                      ? 'bg-blue-500/30 cursor-not-allowed' 
                      : 'bg-white/10 hover:bg-white/20 active:scale-95 cursor-pointer'
                  }`}
                  title="Play sentence audio"
                >
                  <Volume2 className={`w-5 h-5 text-white ${isPlayingAudio ? 'animate-pulse' : ''}`} />
                </button>

                <div className="space-y-4">
                  {/* Target language sentence */}
                  <div>
                    <p className="text-white/50 text-xs mb-2 uppercase tracking-wider drop-shadow">Example</p>
                    <p className="text-white text-xl font-medium leading-relaxed drop-shadow-lg">
                      {sentences[currentIndex]?.sentence}
                    </p>
                  </div>

                  {/* English translation */}
                  <div className="pt-4 border-t border-white/10">
                    <p className="text-white/50 text-xs mb-2 uppercase tracking-wider drop-shadow">Translation</p>
                    <p className="text-white/80 text-base drop-shadow">
                      {sentences[currentIndex]?.translation}
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
                  {currentIndex + 1} / {sentences.length}
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
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]"
            >
              <Plus className="w-5 h-5" />
              Add to Playlist
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
