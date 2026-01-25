// Enhanced audio player component with offline cache awareness
// Shows cache status indicators and handles offline playback

'use client';

import { useState, useEffect } from 'react';
import { useAudioCache } from '@/hooks/use-audio-cache';

interface AudioPlayerWithCacheProps {
  wordId: string;
  languageCode: string;
  word: string;
  onPlayAction?: () => void;
  onErrorAction?: (error: Error) => void;
  className?: string;
}

export function AudioPlayerWithCache({
  wordId,
  languageCode,
  word,
  onPlayAction,
  onErrorAction,
  className = ''
}: AudioPlayerWithCacheProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCached, setIsCached] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { isAudioCached, isOnline } = useAudioCache();

  // Check if audio is cached
  useEffect(() => {
    const checkCache = async () => {
      const cached = await isAudioCached(wordId, languageCode);
      setIsCached(cached);
    };

    checkCache();
  }, [wordId, languageCode, isAudioCached]);

  const handlePlay = async () => {
    // Check if offline and not cached
    if (!isOnline && !isCached) {
      onErrorAction?.(new Error('Audio not available offline'));
      return;
    }

    setIsLoading(true);
    setIsPlaying(true);

    try {
      const audioUrl = `/api/universal-audio?wordId=${wordId}&languageCode=${languageCode}`;
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        setIsPlaying(false);
        setIsLoading(false);
      };

      audio.onerror = (e) => {
        setIsPlaying(false);
        setIsLoading(false);
        onErrorAction?.(new Error('Audio playback failed'));
      };

      await audio.play();
      onPlayAction?.();
    } catch (error) {
      setIsPlaying(false);
      setIsLoading(false);
      onErrorAction?.(error as Error);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={handlePlay}
        disabled={isPlaying || isLoading || (!isOnline && !isCached)}
        className="relative p-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        aria-label={`Play audio for ${word}`}
      >
        {isLoading ? (
          <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
        
        {/* Cache indicator */}
        {isCached && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" 
                title="Available offline" />
        )}
      </button>

      {/* Offline warning */}
      {!isOnline && !isCached && (
        <span className="text-xs text-amber-600 dark:text-amber-400">
          ⚠️ Offline - not cached
        </span>
      )}

      {/* Offline available */}
      {!isOnline && isCached && (
        <span className="text-xs text-green-600 dark:text-green-400">
          ✓ Available offline
        </span>
      )}
    </div>
  );
}
