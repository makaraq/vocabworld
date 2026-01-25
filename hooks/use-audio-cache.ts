// React hook for audio caching functionality
// Provides cache status, pre-caching controls, and offline indicators

import { useState, useEffect, useCallback } from 'react';
import { audioCacheManager, CacheStatus } from '@/lib/audio-cache-manager';

export interface UseAudioCacheOptions {
  autoInitialize?: boolean;
  preCacheFreeTopics?: boolean;
  languageCode?: string;
}

export interface UseAudioCacheReturn {
  isSupported: boolean;
  isInitialized: boolean;
  cacheStatus: CacheStatus | null;
  isOnline: boolean;
  preCacheTopic: (topicId: number, languageCode: string, wordIds: string[]) => Promise<void>;
  preCacheFreeTier: (languageCode: string) => Promise<void>;
  isAudioCached: (wordId: string, languageCode: string) => Promise<boolean>;
  clearCache: () => Promise<void>;
  refreshCacheStatus: () => Promise<void>;
  formatSize: (bytes: number) => string;
}

export function useAudioCache(options: UseAudioCacheOptions = {}): UseAudioCacheReturn {
  const {
    autoInitialize = true,
    preCacheFreeTopics = false,
    languageCode
  } = options;

  const [isSupported, setIsSupported] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // Initialize service worker
  useEffect(() => {
    const initialize = async () => {
      const supported = audioCacheManager.isSupported();
      setIsSupported(supported);

      if (supported && autoInitialize) {
        try {
          const initialized = await audioCacheManager.initialize();
          setIsInitialized(initialized);

          if (initialized) {
            await refreshCacheStatus();

            // Pre-cache free topics if requested
            if (preCacheFreeTopics && languageCode) {
              audioCacheManager.preCacheFreeTier(languageCode).catch(console.error);
            }
          }
        } catch (error) {
          console.error('[useAudioCache] Initialization failed:', error);
        }
      }
    };

    initialize();
  }, [autoInitialize, preCacheFreeTopics, languageCode]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial state
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen for service worker updates
  useEffect(() => {
    const handleUpdateAvailable = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('[useAudioCache] Update available:', customEvent.detail.message);
      
      // You can show a toast notification here
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(
          new CustomEvent('show-toast', {
            detail: {
              message: 'App update available. Please reload.',
              action: 'reload',
              duration: 0 // Persistent
            }
          })
        );
      }
    };

    window.addEventListener('sw-update-available', handleUpdateAvailable);

    return () => {
      window.removeEventListener('sw-update-available', handleUpdateAvailable);
    };
  }, []);

  // Refresh cache status
  const refreshCacheStatus = useCallback(async () => {
    if (!isSupported) return;

    try {
      const status = await audioCacheManager.getCacheStatus();
      setCacheStatus(status);
    } catch (error) {
      console.error('[useAudioCache] Failed to get cache status:', error);
    }
  }, [isSupported]);

  // Pre-cache a topic
  const preCacheTopic = useCallback(
    async (topicId: number, languageCode: string, wordIds: string[]) => {
      if (!isInitialized) {
        throw new Error('Audio cache not initialized');
      }

      await audioCacheManager.preCacheTopic(topicId, languageCode, wordIds);
      await refreshCacheStatus();
    },
    [isInitialized, refreshCacheStatus]
  );

  // Pre-cache free tier
  const preCacheFreeTier = useCallback(
    async (languageCode: string) => {
      if (!isInitialized) {
        throw new Error('Audio cache not initialized');
      }

      await audioCacheManager.preCacheFreeTier(languageCode);
      await refreshCacheStatus();
    },
    [isInitialized, refreshCacheStatus]
  );

  // Check if audio is cached
  const isAudioCached = useCallback(
    async (wordId: string, languageCode: string) => {
      if (!isInitialized) return false;
      return await audioCacheManager.isAudioCached(wordId, languageCode);
    },
    [isInitialized]
  );

  // Clear cache
  const clearCache = useCallback(async () => {
    if (!isInitialized) {
      throw new Error('Audio cache not initialized');
    }

    await audioCacheManager.clearCache();
    await refreshCacheStatus();
  }, [isInitialized, refreshCacheStatus]);

  // Format size helper
  const formatSize = useCallback((bytes: number) => {
    return audioCacheManager.formatSize(bytes);
  }, []);

  return {
    isSupported,
    isInitialized,
    cacheStatus,
    isOnline,
    preCacheTopic,
    preCacheFreeTier,
    isAudioCached,
    clearCache,
    refreshCacheStatus,
    formatSize
  };
}
