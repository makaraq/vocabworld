const AUDIO_CACHE = 'vocab-audio-v1';
const SHELL_CACHE = 'app-shell-v1';
const DATA_CACHE  = 'api-data-v1';
const ALL_CACHES = [AUDIO_CACHE, SHELL_CACHE, DATA_CACHE];

const AUDIO_MAX_BYTES = 100 * 1024 * 1024; // 100 MB

// Routes that should never be cached (auth, mutations, subscriptions)
const NEVER_CACHE = [
  '/api/auth/',
  '/api/account/',
  '/api/subscription/',
  '/api/settings',
  '/api/progress/track',
  '/api/progress/streak',
  '/api/playlists',
  '/api/sr/',
  '/api/leaderboard/opt-in',
  '/api/notifications/',
];

// Read-only API data safe to cache for offline
const CACHEABLE_DATA = [
  '/api/vocabulary',
  '/api/topics',
  '/api/languages',
  '/api/ui-translations',
  '/api/topic-translations',
  '/api/category-translations',
  '/api/language-translations',
  '/api/language/',
  '/api/phonetics',
  '/api/progress/stats',
  '/api/progress/position',
  '/api/leaderboard',
  '/api/leaderboard/rank',
];

// Audio API paths — cache-first
const AUDIO_PATHS = [
  '/api/universal-audio',
  '/api/sentence-audio',
  '/api/custom-audio',
  '/api/universal-audio-fast',
];

// ─── Install ─────────────────────────────────────────────

self.addEventListener('install', (event) => {
  // Pre-cache what we can; don't block activation if the page is unavailable
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      cache.addAll(['/']).catch(() => {})
    )
  );
});

// ─── Activate — clean old caches ─────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !ALL_CACHES.includes(k))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch strategies ────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin GET requests
  if (event.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // Skip never-cache routes
  if (NEVER_CACHE.some((p) => url.pathname.startsWith(p))) return;

  // Audio — cache-first
  if (AUDIO_PATHS.some((p) => url.pathname.startsWith(p))) {
    event.respondWith(audioCacheFirst(event.request));
    return;
  }

  // Cacheable API data — network-first with cache fallback
  if (CACHEABLE_DATA.some((p) => url.pathname.startsWith(p))) {
    event.respondWith(networkFirstData(event.request));
    return;
  }

  // Static assets — stale-while-revalidate
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|woff2?|ttf|ico|json)$/)
  ) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  // Navigation — network-first with offline shell fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirstNav(event.request));
    return;
  }
});

// ─── Cache-first for audio ───────────────────────────────

async function audioCacheFirst(request) {
  const cache = await caches.open(AUDIO_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
      trimAudioCache();
    }
    return response;
  } catch {
    return new Response(null, { status: 503, statusText: 'Offline' });
  }
}

// ─── Network-first for API data ──────────────────────────

async function networkFirstData(request) {
  const cache = await caches.open(DATA_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached || new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// ─── Stale-while-revalidate for static assets ────────────

async function staleWhileRevalidate(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);

  return cached || (await fetchPromise) || new Response(null, { status: 503 });
}

// ─── Network-first for navigation ────────────────────────

async function networkFirstNav(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request) || await cache.match('/');
    return cached || new Response(
      '<html><body style="background:#111;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif"><div style="text-align:center"><h1>Offline</h1><p>Connect to the internet to continue learning.</p></div></body></html>',
      { status: 503, headers: { 'Content-Type': 'text/html' } }
    );
  }
}

// ─── Message handlers (AudioCacheManager contract) ───────

self.addEventListener('message', (event) => {
  const { type } = event.data;

  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (type === 'CACHE_AUDIO') {
    handleCacheAudio(event);
    return;
  }

  if (type === 'GET_CACHE_STATUS') {
    handleGetCacheStatus(event);
    return;
  }

  if (type === 'CLEAR_AUDIO_CACHE') {
    handleClearAudioCache(event);
    return;
  }
});

async function handleCacheAudio(event) {
  const port = event.ports[0];
  try {
    const cache = await caches.open(AUDIO_CACHE);
    const urls = event.data.urls || [];

    await Promise.all(
      urls.map(async (url) => {
        const existing = await cache.match(url);
        if (existing) return; // already cached
        try {
          const resp = await fetch(url);
          if (resp.ok) await cache.put(url, resp);
        } catch { /* skip failures silently */ }
      })
    );

    trimAudioCache();
    port?.postMessage({ success: true });
  } catch (err) {
    port?.postMessage({ success: false, error: err.message });
  }
}

async function handleGetCacheStatus(event) {
  const port = event.ports[0];
  try {
    const cache = await caches.open(AUDIO_CACHE);
    const keys = await cache.keys();

    let totalSize = 0;
    for (const req of keys) {
      const resp = await cache.match(req);
      if (resp) {
        const blob = await resp.clone().blob();
        totalSize += blob.size;
      }
    }

    port?.postMessage({
      success: true,
      status: {
        itemCount: keys.length,
        totalSize,
        maxSize: AUDIO_MAX_BYTES,
        percentUsed: Math.round((totalSize / AUDIO_MAX_BYTES) * 100),
      },
    });
  } catch (err) {
    port?.postMessage({ success: false, error: err.message });
  }
}

async function handleClearAudioCache(event) {
  const port = event.ports[0];
  try {
    await caches.delete(AUDIO_CACHE);
    await caches.open(AUDIO_CACHE); // re-create empty
    port?.postMessage({ success: true });
  } catch (err) {
    port?.postMessage({ success: false, error: err.message });
  }
}

// ─── LRU eviction for audio cache ────────────────────────

async function trimAudioCache() {
  const cache = await caches.open(AUDIO_CACHE);
  const keys = await cache.keys();

  let totalSize = 0;
  const entries = [];

  for (const req of keys) {
    const resp = await cache.match(req);
    if (!resp) continue;
    const blob = await resp.clone().blob();
    const date = resp.headers.get('date');
    entries.push({ request: req, size: blob.size, date: date ? new Date(date).getTime() : 0 });
    totalSize += blob.size;
  }

  if (totalSize <= AUDIO_MAX_BYTES) return;

  // Evict oldest first
  entries.sort((a, b) => a.date - b.date);

  while (totalSize > AUDIO_MAX_BYTES && entries.length > 0) {
    const oldest = entries.shift();
    await cache.delete(oldest.request);
    totalSize -= oldest.size;
  }
}
