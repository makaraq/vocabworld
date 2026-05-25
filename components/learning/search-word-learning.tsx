"use client"

import React, { useState, useRef, useCallback, useEffect } from "react"
import { Icon } from "@iconify/react"
import { ArrowLeft, ChevronRight } from "lucide-react"

interface SearchWordLearningProps {
  nativeLanguage: string
  nativeLanguageCode: string
  targetLanguage: string
  targetLanguageCode: string
  userId?: string
  onBack: () => void
  onSettingsClick: () => void
  onPlaylistUpdate?: () => void
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
  // Direction state: true = nativeLang → targetLang, false = targetLang → nativeLang
  const [sourceIsNative, setSourceIsNative] = useState(true)

  // Derived language labels / codes based on direction
  const fromLanguage = sourceIsNative ? nativeLanguage : targetLanguage
  const fromCode     = sourceIsNative ? nativeLanguageCode : targetLanguageCode
  const toLanguage   = sourceIsNative ? targetLanguage : nativeLanguage
  const toCode       = sourceIsNative ? targetLanguageCode : nativeLanguageCode

  // Input + suggestions state
  const [inputWord, setInputWord] = useState("")
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Playlist state
  const [showPlaylistModal, setShowPlaylistModal] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null)
  const [addedSuggestions, setAddedSuggestions] = useState<Set<string>>(new Set())

  // Cancellation refs
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const lastSearchIdRef = useRef<number>(0)

  useEffect(() => {
    return () => {
      searchTimeoutRef.current && clearTimeout(searchTimeoutRef.current)
      abortControllerRef.current?.abort()
    }
  }, [])

  // Reset suggestions when direction changes
  useEffect(() => {
    setInputWord("")
    setSuggestions([])
    setError(null)
    setAddedSuggestions(new Set())
  }, [sourceIsNative])

  const fetchSuggestions = useCallback(async (word: string, searchId: number) => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = new AbortController()

    setIsSearching(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/translate?word=${encodeURIComponent(word.toLowerCase())}&sourceLanguage=${fromCode}&targetLanguage=${toCode}&suggestions=true`,
        { signal: abortControllerRef.current.signal }
      )
      if (searchId !== lastSearchIdRef.current) return
      if (!res.ok) throw new Error('Translation failed')
      const data = await res.json()
      if (searchId !== lastSearchIdRef.current) return
      setSuggestions(data.suggestions || [])
      if ((data.suggestions || []).length === 0) setError(`No translations found for "${word}"`)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      if (searchId === lastSearchIdRef.current) setError('Translation failed')
    } finally {
      if (searchId === lastSearchIdRef.current) setIsSearching(false)
    }
  }, [fromCode, toCode])

  const handleInput = useCallback((value: string) => {
    setInputWord(value)
    setAddedSuggestions(new Set())
    if (value.trim().length < 2) {
      setSuggestions([])
      setError(null)
      return
    }
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      const searchId = ++lastSearchIdRef.current
      fetchSuggestions(value.trim(), searchId)
    }, 600)
  }, [fetchSuggestions])

  const handleSuggestionTap = (suggestion: string) => {
    setSelectedSuggestion(suggestion)
    setShowPlaylistModal(true)
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="w-10 h-10 bg-black/30 border border-white/20 rounded-full flex items-center justify-center hover:bg-black/50 transition-all flex-shrink-0"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-white/80" />
        </button>
        <h1 className="text-xl font-semibold text-white flex-1 text-center pr-10">Add word</h1>
      </div>

      {/* Language swap row */}
      <div className="flex items-center gap-3 mb-5">
        <button className="flex-1 bg-black/50 border border-white/20 rounded-full py-2.5 px-4 text-white font-medium text-sm text-center truncate">
          {fromLanguage}
        </button>
        <button
          onClick={() => setSourceIsNative(prev => !prev)}
          className="w-9 h-9 bg-white/10 border border-white/20 rounded-full flex items-center justify-center hover:bg-white/20 transition-all flex-shrink-0"
          aria-label="Swap languages"
        >
          <Icon icon="solar:transfer-horizontal-bold" className="w-5 h-5 text-white/80" />
        </button>
        <button className="flex-1 bg-black/50 border border-white/20 rounded-full py-2.5 px-4 text-white font-medium text-sm text-center truncate">
          {toLanguage}
        </button>
      </div>

      {/* Input field */}
      <div className="bg-white/10 border border-white/20 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
        <input
          type="text"
          value={inputWord}
          onChange={(e) => handleInput(e.target.value)}
          placeholder={`Type ${fromLanguage} word...`}
          className="flex-1 bg-transparent text-white text-xl font-medium outline-none placeholder:text-white/30"
          autoComplete="off"
          spellCheck={false}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && inputWord.trim().length >= 2) {
              if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
              const searchId = ++lastSearchIdRef.current
              fetchSuggestions(inputWord.trim(), searchId)
            }
          }}
        />
        {isSearching && (
          <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin flex-shrink-0" />
        )}
        {inputWord && !isSearching && (
          <button
            onClick={() => { setInputWord(""); setSuggestions([]); setError(null) }}
            className="text-white/40 hover:text-white/70 transition-colors flex-shrink-0"
            aria-label="Clear search input"
          >
            <Icon icon="solar:close-circle-bold" className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-red-300 text-sm text-center mb-3 px-2">{error}</p>
      )}

      {/* Suggestions list */}
      {suggestions.length > 0 && (
        <div className="space-y-1">
          {suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => handleSuggestionTap(suggestion)}
              className={`w-full flex items-center justify-between px-5 py-4 rounded-xl transition-all text-left ${
                addedSuggestions.has(suggestion)
                  ? 'bg-green-500/20 border border-green-400/30'
                  : 'bg-white/8 hover:bg-white/15 border border-white/10'
              }`}
            >
              <span className={`text-base font-medium ${addedSuggestions.has(suggestion) ? 'text-green-300' : 'text-white'}`}>
                {suggestion}
              </span>
              {addedSuggestions.has(suggestion) ? (
                <Icon icon="solar:check-circle-bold" className="w-5 h-5 text-green-400 flex-shrink-0" />
              ) : (
                <ChevronRight className="w-5 h-5 text-white/40 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Playlist Modal */}
      {showPlaylistModal && userId && selectedSuggestion && (
        <PlaylistSelectModal
          word={inputWord}
          translation={selectedSuggestion}
          userId={userId}
          translations={{ [fromCode]: inputWord, [toCode]: selectedSuggestion }}
          nativeLanguageCode={fromCode}
          targetLanguageCode={toCode}
          onClose={() => { setShowPlaylistModal(false); setSelectedSuggestion(null) }}
          onSelect={(playlistId) => {
            setAddedSuggestions(prev => new Set(prev).add(selectedSuggestion))
            setShowPlaylistModal(false)
            setSelectedSuggestion(null)
            onPlaylistUpdate?.()
          }}
        />
      )}
    </div>
  )
}

// Playlist selection modal component
export interface PlaylistSelectModalProps {
  word: string
  translation: string
  userId: string
  translations?: Record<string, string>
  nativeLanguageCode: string
  targetLanguageCode: string
  onClose: () => void
  onSelect: (playlistId: string) => void
}

export function PlaylistSelectModal({ word, translation, userId, translations, nativeLanguageCode, targetLanguageCode, onClose, onSelect }: PlaylistSelectModalProps) {
  const [playlists, setPlaylists] = useState<Array<{ id: string; name: string; word_count: number }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isAdding, setIsAdding] = useState<string | null>(null)
  const [addedTo, setAddedTo] = useState<string | null>(null)
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
      // Step 1: Create the playlist
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
      
      if (!playlist?.id) {
        throw new Error('Playlist was not created properly')
      }

      // Step 2: Add the word to the new playlist
      const addResponse = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          playlistId: playlist.id,
          word,
          translations: { ...translations, [nativeLanguageCode]: word, [targetLanguageCode]: translation }
        })
      })

      if (!addResponse.ok) {
        const errorData = await addResponse.json()
        throw new Error(errorData.error || 'Failed to add word to playlist')
      }

      setIsCreating(false)
      setAddedTo(playlist.id)
      await new Promise(resolve => setTimeout(resolve, 800))
      onSelect(playlist.id)
    } catch (err) {
      console.error('Create playlist error:', err)
      setError(err instanceof Error ? err.message : 'Failed to create playlist')
      setIsCreating(false)
    }
  }
  
  const handleSelectPlaylist = async (playlistId: string) => {
    if (!userId) return
    
    setIsAdding(playlistId)
    setError(null)
    
    try {
      // Add word directly via playlists API (handles word upsert + count increment)
      const response = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          playlistId,
          word,
          translations: { ...translations, [nativeLanguageCode]: word, [targetLanguageCode]: translation }
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add word to playlist')
      }

      setIsAdding(null)
      setAddedTo(playlistId)
      await new Promise(resolve => setTimeout(resolve, 800))
      onSelect(playlistId)
    } catch (err) {
      console.error('Add to playlist error:', err)
      setError(err instanceof Error ? err.message : 'Failed to add word to playlist')
      setIsAdding(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-gray-900 border border-white/20 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <h3 className="text-white font-semibold text-lg">Add to Playlist</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"
          >
            <Icon icon="solar:close-circle-bold" className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Word preview */}
        <div className="p-4 bg-white/5 border-b border-white/10 flex-shrink-0">
          <p className="text-white font-medium">{word}</p>
          <p className="text-white/60 text-sm">{translation}</p>
        </div>

        {/* Create new playlist */}
        <div className="p-4 border-b border-white/10 flex-shrink-0">
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

        {/* Playlist list — scrollable */}
        <div className="p-4 overflow-y-auto flex-1 min-h-0">
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
                  disabled={isAdding === playlist.id || addedTo === playlist.id}
                  className={`w-full border rounded-lg p-3 flex items-center justify-between transition-all disabled:opacity-80 ${addedTo === playlist.id ? 'bg-green-500/15 border-green-400/30' : 'bg-white/5 hover:bg-white/10 border-white/10'}`}
                >
                  <div className="flex items-center gap-3">
                    {addedTo === playlist.id ? (
                      <Icon icon="solar:check-circle-bold" className="w-5 h-5 text-green-400" />
                    ) : isAdding === playlist.id ? (
                      <span className="w-5 h-5 border-2 border-purple-400/50 border-t-purple-400 rounded-full animate-spin" />
                    ) : (
                      <Icon icon="solar:playlist-bold" className="w-5 h-5 text-purple-400" />
                    )}
                    <span className={addedTo === playlist.id ? 'text-green-300 font-medium' : 'text-white font-medium'}>{playlist.name}</span>
                  </div>
                  <span className={addedTo === playlist.id ? 'text-green-400/60 text-sm' : 'text-white/40 text-sm'}>{addedTo === playlist.id ? 'Added!' : `${playlist.word_count} words`}</span>
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
