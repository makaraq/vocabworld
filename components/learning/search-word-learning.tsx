"use client"

import React, { useState, useRef, useCallback, useEffect } from "react"
import { Icon } from "@iconify/react"
import { ArrowLeft, Settings, Play, Pause, Square, Plus, Check } from "lucide-react"

// Language voice mapping for Edge TTS (same as custom-audio API)
const LANGUAGE_CODES: Record<string, string> = {
  'Arabic': 'ar', 'Bulgarian': 'bg', 'Bengali': 'bn', 'Catalan': 'ca',
  'Czech': 'cs', 'Welsh': 'cy', 'Danish': 'da', 'German': 'de',
  'Greek': 'el', 'English': 'en', 'Spanish': 'es', 'Estonian': 'et',
  'Basque': 'eu', 'Persian': 'fa', 'Finnish': 'fi', 'French': 'fr',
  'Irish': 'ga', 'Gujarati': 'gu', 'Hebrew': 'he', 'Hindi': 'hi',
  'Croatian': 'hr', 'Hungarian': 'hu', 'Indonesian': 'id', 'Icelandic': 'is',
  'Italian': 'it', 'Japanese': 'ja', 'Korean': 'ko', 'Lithuanian': 'lt',
  'Latvian': 'lv', 'Macedonian': 'mk', 'Malayalam': 'ml', 'Marathi': 'mr',
  'Maltese': 'mt', 'Dutch': 'nl', 'Norwegian': 'no', 'Polish': 'pl',
  'Portuguese': 'pt', 'Romanian': 'ro', 'Russian': 'ru', 'Slovak': 'sk',
  'Slovenian': 'sl', 'Swedish': 'sv', 'Tamil': 'ta', 'Telugu': 'te',
  'Thai': 'th', 'Turkish': 'tr', 'Ukrainian': 'uk', 'Urdu': 'ur',
  'Vietnamese': 'vi', 'Chinese': 'zh'
}

interface SearchWordLearningProps {
  nativeLanguage: string
  nativeLanguageCode: string
  targetLanguage: string
  targetLanguageCode: string
  userId?: string
  onBack: () => void
  onSettingsClick: () => void
  onPlaylistUpdate?: () => void // Callback to refresh playlists in parent
}

interface TranslationResult {
  word: string
  translations: Record<string, string>
  source: 'wiktionary' | 'mymemory' | 'cached'
}

export function SearchWordLearning({
  nativeLanguage,
  nativeLanguageCode,
  targetLanguage,
  targetLanguageCode,
  userId,
  onBack,
  onSettingsClick,
  onPlaylistUpdate
}: SearchWordLearningProps) {
  // Search states
  const [sourceWord, setSourceWord] = useState("")
  const [targetWord, setTargetWord] = useState("")
  const [isSearchingSource, setIsSearchingSource] = useState(false)
  const [isSearchingTarget, setIsSearchingTarget] = useState(false)
  const [translationResult, setTranslationResult] = useState<TranslationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Audio states
  const [isPlayingSource, setIsPlayingSource] = useState(false)
  const [isPlayingTarget, setIsPlayingTarget] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  
  // Playlist states
  const [showPlaylistModal, setShowPlaylistModal] = useState(false)
  const [isAddedToPlaylist, setIsAddedToPlaylist] = useState(false)
  
  // Active card (which card is currently being searched)
  const [activeCard, setActiveCard] = useState<'source' | 'target' | null>(null)
  
  // Debounce timeout ref and abort controller for request cancellation
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const lastSearchIdRef = useRef<number>(0)

  // Clean up audio and pending requests on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Search for translation with request cancellation
  const searchTranslation = useCallback(async (word: string, isSourceToTarget: boolean, searchId: number) => {
    if (!word.trim()) {
      setTranslationResult(null)
      return
    }

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    // Determine which language to search from/to based on selected languages
    const fromLang = isSourceToTarget ? nativeLanguageCode : targetLanguageCode
    const toLang = isSourceToTarget ? targetLanguageCode : nativeLanguageCode
    
    try {
      setError(null)
      if (isSourceToTarget) {
        setIsSearchingSource(true)
      } else {
        setIsSearchingTarget(true)
      }

      const response = await fetch(
        `/api/translate?word=${encodeURIComponent(word.toLowerCase())}&targetLanguage=${toLang}&sourceLanguage=${fromLang}`,
        { signal: abortControllerRef.current.signal }
      )

      // Check if this is still the latest search
      if (searchId !== lastSearchIdRef.current) {
        return // Ignore stale results
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Translation failed')
      }

      const data = await response.json()
      
      // Double-check this is still the latest search before updating UI
      if (searchId !== lastSearchIdRef.current) {
        return
      }
      
      if (data.translations) {
        setTranslationResult(data)
        
        // Update the other card with the translation
        if (isSourceToTarget) {
          const translation = data.translations[targetLanguageCode] || data.translations[toLang]
          if (translation && translation !== 'Translation not available') {
            setTargetWord(translation)
          } else {
            setTargetWord('')
            setError(`No ${targetLanguage} translation found`)
          }
        } else {
          // Searching from target language - get native language translation
          const nativeTranslation = data.translations[nativeLanguageCode] || data.translations[toLang] || data.word
          if (nativeTranslation) {
            setSourceWord(nativeTranslation)
          }
        }
      }
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
      // Only show error if this is still the current search
      if (searchId === lastSearchIdRef.current) {
        console.error('Translation error:', err)
        setError(err instanceof Error ? err.message : 'Translation failed')
      }
    } finally {
      // Only update loading state if this is still the current search
      if (searchId === lastSearchIdRef.current) {
        setIsSearchingSource(false)
        setIsSearchingTarget(false)
      }
    }
  }, [nativeLanguageCode, targetLanguageCode, targetLanguage])

  // Debounced search handler for source (native language)
  const handleSourceSearch = useCallback((value: string) => {
    setSourceWord(value)
    setActiveCard('source')
    setIsAddedToPlaylist(false)
    
    // Clear the target word immediately when user types (prevents showing stale translation)
    if (value.trim().length < 3) {
      setTargetWord('')
      setTranslationResult(null)
      setError(null)
    }
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    // Longer debounce (800ms) for smoother experience
    searchTimeoutRef.current = setTimeout(() => {
      if (value.trim().length >= 3) {
        const searchId = ++lastSearchIdRef.current
        searchTranslation(value, true, searchId)
      } else {
        setTargetWord('')
        setTranslationResult(null)
      }
    }, 800)
  }, [searchTranslation])

  // Debounced search handler for target language
  const handleTargetSearch = useCallback((value: string) => {
    setTargetWord(value)
    setActiveCard('target')
    setIsAddedToPlaylist(false)
    
    // Clear the source word immediately when user types
    if (value.trim().length < 3) {
      setSourceWord('')
      setTranslationResult(null)
      setError(null)
    }
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    // Longer debounce (800ms) for smoother experience
    searchTimeoutRef.current = setTimeout(() => {
      if (value.trim().length >= 3) {
        const searchId = ++lastSearchIdRef.current
        searchTranslation(value, false, searchId)
      } else {
        setSourceWord('')
        setTranslationResult(null)
      }
    }, 800)
  }, [searchTranslation])

  // Play audio for a word
  const playAudio = useCallback(async (word: string, languageCode: string, isSource: boolean) => {
    if (!word.trim()) return

    // Stop any playing audio
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    try {
      const setPlaying = isSource ? setIsPlayingSource : setIsPlayingTarget
      setPlaying(true)

      // Use custom audio API
      const audioUrl = `/api/custom-audio?text=${encodeURIComponent(word)}&languageCode=${languageCode}`
      
      const audio = new Audio(audioUrl)
      audioRef.current = audio
      
      audio.onended = () => {
        setPlaying(false)
        audioRef.current = null
      }
      
      audio.onerror = () => {
        console.error('Audio playback error')
        setPlaying(false)
        audioRef.current = null
      }
      
      await audio.play()
    } catch (err) {
      console.error('Audio error:', err)
      const setPlaying = isSource ? setIsPlayingSource : setIsPlayingTarget
      setPlaying(false)
    }
  }, [])

  // Add to playlist
  const handleAddToPlaylist = useCallback(async () => {
    if (!sourceWord.trim() || !targetWord.trim()) return
    
    // For now, just show the modal
    setShowPlaylistModal(true)
  }, [sourceWord, targetWord])

  return (
    <div className="text-center transition-all duration-500 ease-in-out">
      <div className="mb-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 gap-2">
          <button
            onClick={onBack}
            className="w-10 h-10 sm:w-12 sm:h-12 bg-black/40 border border-white/20 rounded-full flex items-center justify-center hover:bg-black/50 transition-all duration-300 transform hover:scale-110 shadow-lg flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white/80" />
          </button>

          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 justify-center">
            <Icon icon="solar:magnifer-bold" className="w-7 h-7 sm:w-8 sm:h-8 text-blue-400" />
            <h1 className="text-lg sm:text-xl md:text-2xl font-medium text-white text-center truncate">
              Search Word
            </h1>
          </div>
          
          <button
            onClick={onSettingsClick}
            className="w-10 h-10 sm:w-12 sm:h-12 bg-black/40 border border-white/20 rounded-full flex items-center justify-center hover:bg-black/50 transition-all duration-300 transform hover:scale-110 shadow-lg flex-shrink-0"
          >
            <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-white/80" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 bg-red-500/20 border border-red-400/30 rounded-lg px-4 py-2 text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Word Cards with Search */}
        <div className="space-y-6 mb-8">
          {/* Source Language Card (Native Language) */}
          <div className={`bg-black/40 border border-white/20 rounded-2xl p-6 transition-all duration-300 shadow-lg ${
            activeCard === 'source' ? 'bg-blue-500/20 border-blue-400/30 scale-[1.02]' : ''
          }`}>
            <div className="text-white/60 text-sm mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                {nativeLanguage}
                {isSearchingSource && (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
              </span>
              <button
                onClick={() => playAudio(sourceWord, nativeLanguageCode, true)}
                disabled={!sourceWord.trim() || isPlayingSource}
                className={`p-2 rounded-full transition-all ${
                  sourceWord.trim() 
                    ? 'bg-white/10 hover:bg-white/20' 
                    : 'opacity-30 cursor-not-allowed'
                }`}
              >
                {isPlayingSource ? (
                  <Square className="w-5 h-5 text-white/80" />
                ) : (
                  <Play className="w-5 h-5 text-white/80" />
                )}
              </button>
            </div>
            <input
              type="text"
              value={sourceWord}
              onChange={(e) => handleSourceSearch(e.target.value)}
              placeholder={`Type ${nativeLanguage} word...`}
              className="w-full bg-transparent text-white text-2xl font-medium text-center outline-none placeholder:text-white/30"
              autoComplete="off"
              spellCheck={false}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && sourceWord.trim().length >= 2) {
                  // Clear debounce and search immediately
                  if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
                  const searchId = ++lastSearchIdRef.current
                  searchTranslation(sourceWord, true, searchId)
                }
              }}
            />
          </div>

          {/* Search indicator / Translate button */}
          <div className="flex justify-center -my-2">
            {(isSearchingSource || isSearchingTarget) ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 rounded-full border border-blue-400/30">
                <span className="inline-block w-4 h-4 border-2 border-blue-300/50 border-t-blue-300 rounded-full animate-spin" />
                <span className="text-blue-300 text-sm">Translating...</span>
              </div>
            ) : (sourceWord.trim().length >= 2 && !targetWord.trim()) ? (
              <button
                onClick={() => {
                  if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
                  const searchId = ++lastSearchIdRef.current
                  searchTranslation(sourceWord, true, searchId)
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500/30 hover:bg-blue-500/40 rounded-full border border-blue-400/30 transition-all"
              >
                <Icon icon="solar:magnifer-bold" className="w-4 h-4 text-blue-300" />
                <span className="text-blue-300 text-sm">Translate</span>
              </button>
            ) : (targetWord.trim().length >= 2 && !sourceWord.trim()) ? (
              <button
                onClick={() => {
                  if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
                  const searchId = ++lastSearchIdRef.current
                  searchTranslation(targetWord, false, searchId)
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500/30 hover:bg-blue-500/40 rounded-full border border-blue-400/30 transition-all"
              >
                <Icon icon="solar:magnifer-bold" className="w-4 h-4 text-blue-300" />
                <span className="text-blue-300 text-sm">Translate</span>
              </button>
            ) : null}
          </div>

          {/* Target Language Card */}
          <div className={`bg-black/40 border border-white/20 rounded-2xl p-6 transition-all duration-300 shadow-lg ${
            activeCard === 'target' ? 'bg-blue-500/20 border-blue-400/30 scale-[1.02]' : ''
          }`}>
            <div className="text-white/60 text-sm mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                {targetLanguage}
                {isSearchingTarget && (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
              </span>
              <button
                onClick={() => playAudio(targetWord, targetLanguageCode, false)}
                disabled={!targetWord.trim() || isPlayingTarget}
                className={`p-2 rounded-full transition-all ${
                  targetWord.trim() 
                    ? 'bg-white/10 hover:bg-white/20' 
                    : 'opacity-30 cursor-not-allowed'
                }`}
              >
                {isPlayingTarget ? (
                  <Square className="w-5 h-5 text-white/80" />
                ) : (
                  <Play className="w-5 h-5 text-white/80" />
                )}
              </button>
            </div>
            <input
              type="text"
              value={targetWord}
              onChange={(e) => handleTargetSearch(e.target.value)}
              placeholder={`Type ${targetLanguage} word...`}
              className="w-full bg-transparent text-white text-2xl font-medium text-center outline-none placeholder:text-white/30"
              autoComplete="off"
              spellCheck={false}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && targetWord.trim().length >= 2) {
                  // Clear debounce and search immediately
                  if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
                  const searchId = ++lastSearchIdRef.current
                  searchTranslation(targetWord, false, searchId)
                }
              }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        {sourceWord.trim() && targetWord.trim() && (
          <div className="flex justify-center gap-4">
            <button
              onClick={handleAddToPlaylist}
              disabled={isAddedToPlaylist}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                isAddedToPlaylist
                  ? 'bg-green-500/30 text-green-300 border border-green-400/30'
                  : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700'
              }`}
            >
              {isAddedToPlaylist ? (
                <>
                  <Check className="w-5 h-5" />
                  Added to Playlist
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Add to Playlist
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Playlist Modal */}
      {showPlaylistModal && userId && (
        <PlaylistSelectModal
          word={sourceWord}
          translation={targetWord}
          userId={userId}
          translations={translationResult?.translations}
          nativeLanguageCode={nativeLanguageCode}
          targetLanguageCode={targetLanguageCode}
          onClose={() => setShowPlaylistModal(false)}
          onSelect={(playlistId) => {
            setIsAddedToPlaylist(true)
            setShowPlaylistModal(false)
            // Notify parent to refresh playlists
            onPlaylistUpdate?.()
          }}
        />
      )}
    </div>
  )
}

// Playlist selection modal component
interface PlaylistSelectModalProps {
  word: string
  translation: string
  userId: string
  translations?: Record<string, string>
  nativeLanguageCode: string
  targetLanguageCode: string
  onClose: () => void
  onSelect: (playlistId: string) => void
}

function PlaylistSelectModal({ word, translation, userId, translations, nativeLanguageCode, targetLanguageCode, onClose, onSelect }: PlaylistSelectModalProps) {
  const [playlists, setPlaylists] = useState<Array<{ id: string; name: string; word_count: number }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isAdding, setIsAdding] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch user's playlists for this language pair
  useEffect(() => {
    const fetchPlaylists = async () => {
      if (!userId) {
        setIsLoading(false)
        return
      }
      
      try {
        // Filter playlists by language pair
        const response = await fetch(
          `/api/playlists?userId=${userId}&sourceLanguageCode=${nativeLanguageCode}&targetLanguageCode=${targetLanguageCode}`
        )
        if (response.ok) {
          const data = await response.json()
          setPlaylists(data.playlists || [])
        }
      } catch (err) {
        console.error('Error fetching playlists:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchPlaylists()
  }, [userId])

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim() || !userId) return
    
    setIsCreating(true)
    setError(null)
    
    try {
      // Create playlist with language codes
      const createResponse = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          name: newPlaylistName.trim(),
          sourceLanguageCode: nativeLanguageCode,
          targetLanguageCode: targetLanguageCode
        })
      })
      
      if (!createResponse.ok) {
        const errorData = await createResponse.json()
        throw new Error(errorData.error || 'Failed to create playlist')
      }
      
      const { playlist } = await createResponse.json()
      
      // Add word to the new playlist using the translate API endpoint
      const addResponse = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: word,
          playlistId: playlist.id,
          userId,
          sourceLanguageCode: nativeLanguageCode,
          targetLanguageCode: targetLanguageCode,
          translation: translation,
          translations: translations
        })
      })
      
      if (!addResponse.ok) {
        const errorData = await addResponse.json()
        throw new Error(errorData.error || 'Failed to add word to playlist')
      }
      
      onSelect(playlist.id)
    } catch (err) {
      console.error('Create playlist error:', err)
      setError(err instanceof Error ? err.message : 'Failed to create playlist')
    } finally {
      setIsCreating(false)
    }
  }
  
  const handleSelectPlaylist = async (playlistId: string) => {
    if (!userId) return
    
    setIsAdding(playlistId)
    setError(null)
    
    try {
      // Add word to playlist using translate API endpoint
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: word,
          playlistId: playlistId,
          userId,
          sourceLanguageCode: nativeLanguageCode,
          targetLanguageCode: targetLanguageCode,
          translation: translation,
          translations: translations
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add word to playlist')
      }
      
      onSelect(playlistId)
    } catch (err) {
      console.error('Add to playlist error:', err)
      setError(err instanceof Error ? err.message : 'Failed to add word to playlist')
    } finally {
      setIsAdding(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-white/20 rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-white font-semibold text-lg">Add to Playlist</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"
          >
            <Icon icon="solar:close-circle-bold" className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Word preview */}
        <div className="p-4 bg-white/5 border-b border-white/10">
          <p className="text-white font-medium">{word}</p>
          <p className="text-white/60 text-sm">{translation}</p>
        </div>

        {/* Create new playlist */}
        <div className="p-4 border-b border-white/10">
          <div className="flex gap-2">
            <input
              type="text"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder="New playlist name..."
              className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-400/50"
            />
            <button
              onClick={handleCreatePlaylist}
              disabled={!newPlaylistName.trim() || isCreating}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-blue-600 disabled:opacity-50 transition-all"
            >
              {isCreating ? '...' : 'Create'}
            </button>
          </div>
        </div>

        {/* Playlist list */}
        <div className="p-4 overflow-auto max-h-60">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          ) : playlists.length === 0 ? (
            <div className="text-center py-8">
              <Icon icon="solar:folder-with-files-bold-duotone" className="w-12 h-12 text-white/20 mx-auto mb-2" />
              <p className="text-white/40 text-sm">No playlists yet</p>
              <p className="text-white/30 text-xs">Create your first playlist above</p>
            </div>
          ) : (
            <div className="space-y-2">
              {playlists.map((playlist) => (
                <button
                  key={playlist.id}
                  onClick={() => handleSelectPlaylist(playlist.id)}
                  disabled={isAdding === playlist.id}
                  className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-3 flex items-center justify-between transition-all disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    {isAdding === playlist.id ? (
                      <span className="w-5 h-5 border-2 border-purple-400/50 border-t-purple-400 rounded-full animate-spin" />
                    ) : (
                      <Icon icon="solar:playlist-bold" className="w-5 h-5 text-purple-400" />
                    )}
                    <span className="text-white font-medium">{playlist.name}</span>
                  </div>
                  <span className="text-white/40 text-sm">{playlist.word_count} words</span>
                </button>
              ))}
            </div>
          )}
          
          {/* Error message */}
          {error && (
            <div className="mt-3 bg-red-500/20 border border-red-400/30 rounded-lg px-3 py-2 text-red-200 text-xs">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
