// Cache status component - Shows cache usage and management controls
// For use in settings or account pages

'use client';

import { useAudioCache } from '@/hooks/use-audio-cache';
import { useState } from 'react';

export function CacheStatusPanel() {
  const { 
    isSupported, 
    isInitialized, 
    cacheStatus, 
    isOnline,
    clearCache,
    refreshCacheStatus,
    formatSize,
    preCacheFreeTier
  } = useAudioCache({ autoInitialize: true });

  const [isClearing, setIsClearing] = useState(false);
  const [isPreCaching, setIsPreCaching] = useState(false);

  const handleClearCache = async () => {
    if (!confirm('Are you sure you want to clear all cached audio? This will free up storage but audio will need to download again.')) {
      return;
    }

    setIsClearing(true);
    try {
      await clearCache();
      alert('Cache cleared successfully');
    } catch (error) {
      alert('Failed to clear cache');
      console.error(error);
    } finally {
      setIsClearing(false);
    }
  };

  const handlePreCacheFree = async (languageCode: string) => {
    setIsPreCaching(true);
    try {
      await preCacheFreeTier(languageCode);
      await refreshCacheStatus();
      alert('Free topics cached for offline use');
    } catch (error) {
      alert('Failed to cache topics');
      console.error(error);
    } finally {
      setIsPreCaching(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          ⚠️ Offline audio caching is not supported in your browser
        </p>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Initializing audio cache...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Online/Offline Status */}
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-sm font-medium">
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Cache Statistics */}
      {cacheStatus && (
        <div className="p-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg space-y-3">
          <h3 className="font-semibold text-sm">Audio Cache</h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/70">Cached files:</span>
              <span className="font-medium">{cacheStatus.itemCount}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-white/70">Storage used:</span>
              <span className="font-medium">
                {formatSize(cacheStatus.totalSize)} / {formatSize(cacheStatus.maxSize)}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  cacheStatus.percentUsed > 80 ? 'bg-red-500' :
                  cacheStatus.percentUsed > 50 ? 'bg-amber-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${cacheStatus.percentUsed}%` }}
              />
            </div>
            
            <div className="text-xs text-white/60">
              {cacheStatus.percentUsed}% used
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleClearCache}
              disabled={isClearing || cacheStatus.itemCount === 0}
              className="flex-1 px-3 py-2 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isClearing ? 'Clearing...' : 'Clear Cache'}
            </button>

            <button
              onClick={() => refreshCacheStatus()}
              className="px-3 py-2 text-sm bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              title="Refresh"
            >
              ↻
            </button>
          </div>
        </div>
      )}

      {/* Pre-cache options */}
      <div className="p-4 bg-blue-500/10 backdrop-blur-sm border border-blue-500/20 rounded-lg">
        <h4 className="font-semibold text-sm mb-2">Offline Downloads</h4>
        <p className="text-xs text-white/70 mb-3">
          Download audio files for offline learning
        </p>
        
        <button
          onClick={() => handlePreCacheFree('en')} // You can make language dynamic
          disabled={isPreCaching}
          className="w-full px-3 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPreCaching ? 'Downloading...' : 'Download Free Topics'}
        </button>
        
        <p className="text-xs text-white/60 mt-2">
          Downloads Greetings, Numbers, and Time topics for your current learning language
        </p>
      </div>

      {/* Info */}
      <div className="text-xs text-white/60 space-y-1">
        <p>• Audio is cached automatically as you learn</p>
        <p>• Oldest files are removed when cache is full</p>
        <p>• Cache survives browser restarts</p>
      </div>
    </div>
  );
}
