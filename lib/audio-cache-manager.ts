// Audio Cache Manager - Client-side cache management utility
// Handles pre-caching, cache status queries, and cache cleanup

export interface CacheStatus {
  itemCount: number;
  totalSize: number;
  maxSize: number;
  percentUsed: number;
  isSupported: boolean;
}

export interface AudioCacheItem {
  url: string;
  wordId: string;
  languageCode: string;
  topicId?: number;
}

export class AudioCacheManager {
  private static instance: AudioCacheManager;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

  private constructor() {}

  static getInstance(): AudioCacheManager {
    if (!AudioCacheManager.instance) {
      AudioCacheManager.instance = new AudioCacheManager();
    }
    return AudioCacheManager.instance;
  }

  // Check if service worker is supported
  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'caches' in window
    );
  }

  // Initialize service worker
  async initialize(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    try {
      this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });


      // Handle updates
      this.serviceWorkerRegistration.addEventListener('updatefound', () => {
        const newWorker = this.serviceWorkerRegistration?.installing;
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Notify user about update
              this.notifyUpdate();
            }
          });
        }
      });

      return true;
    } catch (error) {
      console.error('[AudioCache] Service Worker registration failed:', error);
      return false;
    }
  }

  // Pre-cache audio files for offline use
  async preCacheAudios(audioUrls: string[]): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Service Worker not supported');
    }

    if (!navigator.serviceWorker.controller) {
      console.warn('[AudioCache] Service Worker not active yet, waiting...');
      await this.waitForServiceWorker();
    }

    return new Promise((resolve, reject) => {
      const messageChannel = new MessageChannel();

      messageChannel.port1.onmessage = (event) => {
        if (event.data.success) {
          resolve();
        } else {
          reject(new Error(event.data.error));
        }
      };

      navigator.serviceWorker.controller?.postMessage(
        {
          type: 'CACHE_AUDIO',
          urls: audioUrls
        },
        [messageChannel.port2]
      );
    });
  }

  // Pre-cache audio for a specific topic
  async preCacheTopic(
    topicId: number,
    languageCode: string,
    wordIds: string[]
  ): Promise<void> {
    const audioUrls = wordIds.map(
      (wordId) => `/api/universal-audio?wordId=${wordId}&languageCode=${languageCode}`
    );

    await this.preCacheAudios(audioUrls);
  }

  // Check if audio is cached
  async isAudioCached(wordId: string, languageCode: string): Promise<boolean> {
    if (!this.isSupported()) return false;

    try {
      const cache = await caches.open('vocab-audio-v1');
      const url = `/api/universal-audio?wordId=${wordId}&languageCode=${languageCode}`;
      const response = await cache.match(url);
      return !!response;
    } catch (error) {
      console.error('[AudioCache] Error checking cache:', error);
      return false;
    }
  }

  // Get cache status
  async getCacheStatus(): Promise<CacheStatus> {
    if (!this.isSupported()) {
      return {
        itemCount: 0,
        totalSize: 0,
        maxSize: 0,
        percentUsed: 0,
        isSupported: false
      };
    }

    return new Promise((resolve, reject) => {
      const messageChannel = new MessageChannel();

      messageChannel.port1.onmessage = (event) => {
        if (event.data.success) {
          resolve({
            ...event.data.status,
            isSupported: true
          });
        } else {
          reject(new Error(event.data.error));
        }
      };

      navigator.serviceWorker.controller?.postMessage(
        { type: 'GET_CACHE_STATUS' },
        [messageChannel.port2]
      );
    });
  }

  // Clear audio cache
  async clearCache(): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Service Worker not supported');
    }

    return new Promise((resolve, reject) => {
      const messageChannel = new MessageChannel();

      messageChannel.port1.onmessage = (event) => {
        if (event.data.success) {
          resolve();
        } else {
          reject(new Error(event.data.error));
        }
      };

      navigator.serviceWorker.controller?.postMessage(
        { type: 'CLEAR_AUDIO_CACHE' },
        [messageChannel.port2]
      );
    });
  }

  // Get list of cached audio URLs
  async getCachedAudioList(): Promise<string[]> {
    if (!this.isSupported()) return [];

    try {
      const cache = await caches.open('vocab-audio-v1');
      const requests = await cache.keys();
      return requests.map((req) => req.url);
    } catch (error) {
      console.error('[AudioCache] Error getting cached list:', error);
      return [];
    }
  }

  // Estimate cache size in MB
  formatSize(bytes: number): string {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  }

  // Wait for service worker to be active
  private async waitForServiceWorker(timeout = 5000): Promise<void> {
    const startTime = Date.now();

    while (!navigator.serviceWorker.controller) {
      if (Date.now() - startTime > timeout) {
        throw new Error('Service Worker activation timeout');
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // Notify user about update
  private notifyUpdate(): void {
    // Dispatch custom event for UI to handle
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('sw-update-available', {
          detail: {
            message: 'A new version is available. Reload to update.'
          }
        })
      );
    }
  }

  // Force update service worker
  async forceUpdate(): Promise<void> {
    if (!this.serviceWorkerRegistration) return;

    await this.serviceWorkerRegistration.update();
    
    const waiting = this.serviceWorkerRegistration.waiting;
    if (waiting) {
      waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }

  // Pre-cache free tier topics (1, 2, 3) for offline use
  async preCacheFreeTier(languageCode: string): Promise<void> {
    try {

      // Fetch vocabulary for free topics
      const freeTopics = [1, 2, 3]; // Greetings, Numbers, Time
      
      for (const topicId of freeTopics) {
        const response = await fetch(
          `/api/vocabulary?topicId=${topicId}&languageCode=${languageCode}`
        );
        
        if (response.ok) {
          const data = await response.json();
          const wordIds = data.vocabulary.map((item: any) => item.id.toString());
          await this.preCacheTopic(topicId, languageCode, wordIds);
        }
      }

    } catch (error) {
      console.error('[AudioCache] Free tier pre-caching failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const audioCacheManager = AudioCacheManager.getInstance();
