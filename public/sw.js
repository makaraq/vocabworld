// Service Worker for Vocab World - Audio Caching System
// Provides offline audio playback with intelligent caching strategies

const CACHE_VERSION = 'vocab-world-v1';
const AUDIO_CACHE = 'vocab-audio-v1';
const STATIC_CACHE = 'vocab-static-v1';
const MAX_AUDIO_CACHE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_AUDIO_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html'
];

// Cache priority topics (free tier: 1, 2, 3)
const PRIORITY_TOPICS = [1, 2, 3];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS.filter(url => url !== '/offline.html'));
      })
      .then(() => {
        console.log('[SW] Service worker installed successfully');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('[SW] Installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              // Delete old caches
              return name.startsWith('vocab-') && 
                     name !== AUDIO_CACHE && 
                     name !== STATIC_CACHE;
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim(); // Take control immediately
      })
  );
});

// Fetch event - intercept audio requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle audio API requests
  if (url.pathname.startsWith('/api/universal-audio') || 
      url.pathname.startsWith('/api/custom-audio')) {
    event.respondWith(handleAudioRequest(request));
  } 
  // Handle static assets
  else if (request.method === 'GET') {
    event.respondWith(handleStaticRequest(request));
  }
});

// Handle audio requests with cache-first strategy
async function handleAudioRequest(request) {
  const cache = await caches.open(AUDIO_CACHE);
  const cachedResponse = await cache.match(request);

  // Return cached audio if available
  if (cachedResponse) {
    console.log('[SW] Serving audio from cache:', request.url);
    
    // Update last accessed time in the background
    updateCacheMetadata(request.url).catch(console.error);
    
    return cachedResponse;
  }

  // Fetch from network
  try {
    console.log('[SW] Fetching audio from network:', request.url);
    const networkResponse = await fetch(request);

    // Only cache successful audio responses
    if (networkResponse && networkResponse.status === 200) {
      const responseToCache = networkResponse.clone();
      
      // Cache in the background
      cacheAudioResponse(request, responseToCache).catch(console.error);
    }

    return networkResponse;
  } catch (error) {
    console.error('[SW] Network request failed:', error);
    
    // Return offline fallback if available
    return new Response(
      JSON.stringify({ 
        error: 'Offline - audio not cached',
        message: 'This audio is not available offline. Please connect to the internet.'
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle static asset requests
async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return cache.match('/offline.html') || new Response('Offline');
    }
    
    throw error;
  }
}

// Cache audio response with size management
async function cacheAudioResponse(request, response) {
  const cache = await caches.open(AUDIO_CACHE);
  
  // Check cache size before adding
  const cacheSize = await getCacheSize(AUDIO_CACHE);
  
  if (cacheSize > MAX_AUDIO_CACHE_SIZE) {
    console.log('[SW] Cache size limit reached, cleaning old entries...');
    await cleanOldCacheEntries();
  }

  // Store the response
  await cache.put(request, response);
  
  // Store metadata
  await storeCacheMetadata(request.url);
  
  console.log('[SW] Audio cached successfully:', request.url);
}

// Calculate total cache size
async function getCacheSize(cacheName) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  let totalSize = 0;
  
  for (const request of keys) {
    const response = await cache.match(request);
    if (response) {
      const blob = await response.blob();
      totalSize += blob.size;
    }
  }
  
  return totalSize;
}

// Clean old cache entries (LRU strategy)
async function cleanOldCacheEntries() {
  const cache = await caches.open(AUDIO_CACHE);
  const keys = await cache.keys();
  
  // Get metadata for all cached items
  const metadata = await Promise.all(
    keys.map(async (request) => {
      const meta = await getCacheMetadata(request.url);
      return { request, ...meta };
    })
  );

  // Sort by last accessed time (oldest first)
  metadata.sort((a, b) => (a.lastAccessed || 0) - (b.lastAccessed || 0));

  // Delete oldest 20% of entries
  const deleteCount = Math.ceil(keys.length * 0.2);
  const toDelete = metadata.slice(0, deleteCount);

  for (const { request } of toDelete) {
    await cache.delete(request);
    await deleteCacheMetadata(request.url);
    console.log('[SW] Deleted old cache entry:', request.url);
  }
}

// Metadata management using IndexedDB
async function storeCacheMetadata(url) {
  const db = await openMetadataDB();
  const tx = db.transaction('metadata', 'readwrite');
  const store = tx.objectStore('metadata');
  
  await store.put({
    url,
    cachedAt: Date.now(),
    lastAccessed: Date.now()
  });
  
  await tx.complete;
}

async function updateCacheMetadata(url) {
  const db = await openMetadataDB();
  const tx = db.transaction('metadata', 'readwrite');
  const store = tx.objectStore('metadata');
  
  const existing = await store.get(url);
  
  if (existing) {
    existing.lastAccessed = Date.now();
    await store.put(existing);
  }
  
  await tx.complete;
}

async function getCacheMetadata(url) {
  const db = await openMetadataDB();
  const tx = db.transaction('metadata', 'readonly');
  const store = tx.objectStore('metadata');
  
  const data = await store.get(url);
  await tx.complete;
  
  return data || {};
}

async function deleteCacheMetadata(url) {
  const db = await openMetadataDB();
  const tx = db.transaction('metadata', 'readwrite');
  const store = tx.objectStore('metadata');
  
  await store.delete(url);
  await tx.complete;
}

// IndexedDB helper
let dbPromise;
function openMetadataDB() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open('vocab-audio-metadata', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('metadata')) {
          const store = db.createObjectStore('metadata', { keyPath: 'url' });
          store.createIndex('lastAccessed', 'lastAccessed');
          store.createIndex('cachedAt', 'cachedAt');
        }
      };
    });
  }
  
  return dbPromise;
}

// Message handler for cache management commands
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data.type === 'CACHE_AUDIO') {
    handleCacheAudioMessage(event.data).then(() => {
      event.ports[0]?.postMessage({ success: true });
    }).catch((error) => {
      event.ports[0]?.postMessage({ success: false, error: error.message });
    });
  }
  
  if (event.data.type === 'CLEAR_AUDIO_CACHE') {
    clearAudioCache().then(() => {
      event.ports[0]?.postMessage({ success: true });
    }).catch((error) => {
      event.ports[0]?.postMessage({ success: false, error: error.message });
    });
  }
  
  if (event.data.type === 'GET_CACHE_STATUS') {
    getCacheStatus().then((status) => {
      event.ports[0]?.postMessage({ success: true, status });
    }).catch((error) => {
      event.ports[0]?.postMessage({ success: false, error: error.message });
    });
  }

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Handle cache audio message
async function handleCacheAudioMessage(data) {
  const { urls } = data;
  
  console.log(`[SW] Pre-caching ${urls.length} audio files...`);
  
  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (response.status === 200) {
        await cacheAudioResponse(new Request(url), response.clone());
      }
    } catch (error) {
      console.error('[SW] Failed to pre-cache:', url, error);
    }
  }
  
  console.log('[SW] Pre-caching completed');
}

// Clear all audio cache
async function clearAudioCache() {
  const cache = await caches.open(AUDIO_CACHE);
  const keys = await cache.keys();
  
  for (const request of keys) {
    await cache.delete(request);
    await deleteCacheMetadata(request.url);
  }
  
  console.log('[SW] Audio cache cleared');
}

// Get cache status
async function getCacheStatus() {
  const cache = await caches.open(AUDIO_CACHE);
  const keys = await cache.keys();
  const size = await getCacheSize(AUDIO_CACHE);
  
  return {
    itemCount: keys.length,
    totalSize: size,
    maxSize: MAX_AUDIO_CACHE_SIZE,
    percentUsed: Math.round((size / MAX_AUDIO_CACHE_SIZE) * 100)
  };
}

console.log('[SW] Service worker script loaded');
