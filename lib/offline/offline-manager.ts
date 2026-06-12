// Offline language-pack download manager.
//
// A "pack" is one native→learning language pair. Downloading a pack stores:
//  - the topics list and every topic's vocabulary JSON (the "words")
//  - the pronunciation audio blob for every word in BOTH languages
// in IndexedDB, so the learn flow keeps working with no connection.
//
// Downloads are resumable (already-stored audio is skipped), abortable, and
// guarded by storage-quota checks. A localStorage mirror of completed packs
// lets the offline banner check availability synchronously.

import {
  idbGet, idbPut, idbDelete, idbGetAll, idbGetAllKeys,
  idbDeleteByPrefix, isIndexedDbSupported,
} from './offline-storage'

// Same name→code mapping the API routes use, so offline lookups resolve
// language params identically to the server.
export const LANGUAGE_NAME_TO_CODE: { [key: string]: string } = {
  'English': 'en',
  'Spanish': 'es', 'French': 'fr', 'German': 'de', 'Italian': 'it', 'Portuguese': 'pt',
  'Dutch': 'nl', 'Russian': 'ru', 'Chinese': 'zh', 'Japanese': 'ja', 'Korean': 'ko',
  'Arabic': 'ar', 'Hindi': 'hi', 'Turkish': 'tr', 'Polish': 'pl', 'Swedish': 'sv',
  'Norwegian': 'no', 'Danish': 'da', 'Finnish': 'fi', 'Greek': 'el', 'Hebrew': 'he',
  'Thai': 'th', 'Vietnamese': 'vi', 'Indonesian': 'id', 'Malay': 'ms', 'Czech': 'cs',
  'Hungarian': 'hu', 'Romanian': 'ro', 'Bulgarian': 'bg', 'Croatian': 'hr', 'Serbian': 'sr',
  'Slovak': 'sk', 'Slovenian': 'sl', 'Estonian': 'et', 'Latvian': 'lv', 'Lithuanian': 'lt',
  'Ukrainian': 'uk', 'Bengali': 'bn', 'Urdu': 'ur', 'Persian': 'fa', 'Basque': 'eu',
  'Catalan': 'ca', 'Welsh': 'cy', 'Irish': 'ga', 'Gujarati': 'gu', 'Icelandic': 'is',
  'Macedonian': 'mk', 'Malayalam': 'ml', 'Maltese': 'mt', 'Marathi': 'mr',
  'Tamil': 'ta', 'Telugu': 'te',
}

export const LANGUAGE_CODE_TO_NAME: { [code: string]: string } = Object.fromEntries(
  Object.entries(LANGUAGE_NAME_TO_CODE).map(([name, code]) => [code, name])
)

export function languageName(code: string): string {
  return LANGUAGE_CODE_TO_NAME[code] || code.toUpperCase()
}

// Normalize a sourceLanguage/targetLanguage query param (name or code) to a
// code, mirroring the server's getLanguageCode fallback to 'en'.
export function normalizeLangParam(value: string | null): string {
  if (!value) return 'en'
  if (LANGUAGE_NAME_TO_CODE[value]) return LANGUAGE_NAME_TO_CODE[value]
  const lower = value.toLowerCase()
  if (LANGUAGE_CODE_TO_NAME[lower]) return lower
  return 'en'
}

export type PackStatus = 'downloading' | 'paused' | 'storage-warning' | 'error' | 'complete'
export type PackPhase = 'words' | 'audio' | 'done'

export interface OfflinePack {
  id: string // `${nativeCode}>${targetCode}`
  nativeCode: string
  targetCode: string
  status: PackStatus
  phase: PackPhase
  topicsDone: number
  topicsTotal: number
  wordCount: number
  audioDone: number
  audioTotal: number
  audioMissing: number
  bytes: number
  neededBytes?: number
  availableBytes?: number
  etaSeconds?: number
  error?: string
  updatedAt: number
}

export interface StorageInfo {
  supported: boolean
  usageBytes: number
  quotaBytes: number
}

export const packId = (nativeCode: string, targetCode: string) => `${nativeCode}>${targetCode}`

const MIRROR_KEY = 'vw-offline-packs'
export const PACKS_CHANGED_EVENT = 'vw-offline-packs-changed'

// Average observed size of one pronunciation clip; used only for the
// pre-download storage estimate, not for progress.
const AVG_AUDIO_BYTES = 30 * 1024
// Primary path: /api/offline-audio-batch (50 clips per request, 2 in flight).
const BATCH_SIZE = 50
const BATCH_CONCURRENCY = 2
// Fallback path: per-file /api/universal-audio, paced under its 600/min limit.
const AUDIO_CONCURRENCY = 4
const MIN_REQUEST_INTERVAL_MS = 125
const MAX_RETRIES = 5
// Sentinel error message: the audio backend hit its daily download limit
const AUDIO_SERVICE_LIMIT = 'AUDIO_SERVICE_LIMIT'

export const audioKey = (languageCode: string, wordId: string | number) => `a:${languageCode}:${wordId}`
export const vocabKey = (topicId: string | number, learnCode: string, nativeCode: string) =>
  `vocab:${topicId}:${learnCode}:${nativeCode}`

interface AudioJob {
  key: string
  url: string
  wordId: number
  languageCode: string
  word?: string
  targetWord?: string
}

interface DownloadedWord {
  id: number
  english_word?: string
  sourceWord?: string // learning-language word
  targetWord?: string // native-language word
}

function buildAudioUrl(wordId: number, languageCode: string, englishWord?: string, targetWordParam?: string): string {
  // Must match getAudioUrl in language-selector so the server resolves the
  // exact same file (word/targetWord drive Verbs + Common Phrases lookups).
  let url = `/api/universal-audio?wordId=${wordId}&languageCode=${languageCode}`
  if (englishWord) url += `&word=${encodeURIComponent(englishWord)}`
  if (targetWordParam) url += `&targetWord=${encodeURIComponent(targetWordParam)}`
  return url
}

type Listener = (packs: OfflinePack[]) => void

class OfflineManager {
  private packs = new Map<string, OfflinePack>()
  private aborters = new Map<string, AbortController>()
  private listeners = new Set<Listener>()
  private initPromise: Promise<void> | null = null
  private emitTimer: ReturnType<typeof setTimeout> | null = null

  isSupported(): boolean {
    return isIndexedDbSupported()
  }

  init(): Promise<void> {
    if (this.initPromise) return this.initPromise
    this.initPromise = (async () => {
      if (!this.isSupported()) return
      try {
        const stored = await idbGetAll<OfflinePack>('packs')
        const interrupted: OfflinePack[] = []
        for (const pack of stored) {
          // A pack stuck in 'downloading' means the app was killed mid-download
          if (pack.status === 'downloading') {
            pack.status = 'paused'
            interrupted.push(pack)
          }
          this.packs.set(pack.id, pack)
        }
        this.syncMirror()
        this.emit(true)
        // Auto-resume downloads the user started but the app interrupted
        if (navigator.onLine) {
          for (const pack of interrupted) {
            this.startDownload(pack.nativeCode, pack.targetCode, { force: true }).catch(() => {})
          }
        }
      } catch (e) {
        console.error('[Offline] init failed:', e)
      }
    })()
    return this.initPromise
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    listener(this.getPacks())
    return () => { this.listeners.delete(listener) }
  }

  getPacks(): OfflinePack[] {
    return Array.from(this.packs.values()).sort((a, b) => b.updatedAt - a.updatedAt)
  }

  getPack(id: string): OfflinePack | undefined {
    return this.packs.get(id)
  }

  isDownloading(id: string): boolean {
    return this.packs.get(id)?.status === 'downloading'
  }

  async getStorageInfo(): Promise<StorageInfo> {
    try {
      if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
        const est = await navigator.storage.estimate()
        return { supported: true, usageBytes: est.usage || 0, quotaBytes: est.quota || 0 }
      }
    } catch {}
    return { supported: false, usageBytes: 0, quotaBytes: 0 }
  }

  // Start (or resume) downloading a pack. `force` skips the free-space check
  // after the user explicitly chose "Download anyway".
  async startDownload(nativeCode: string, targetCode: string, opts: { force?: boolean } = {}): Promise<void> {
    if (!this.isSupported()) throw new Error('Offline storage is not supported on this device')
    await this.init()

    const id = packId(nativeCode, targetCode)
    if (this.isDownloading(id)) return

    const pack: OfflinePack = {
      ...(this.packs.get(id) || {
        id, nativeCode, targetCode,
        topicsDone: 0, topicsTotal: 0, wordCount: 0,
        audioDone: 0, audioTotal: 0, audioMissing: 0, bytes: 0,
      } as OfflinePack),
      status: 'downloading',
      phase: 'words',
      error: undefined,
      updatedAt: Date.now(),
    }
    this.packs.set(id, pack)
    this.emit(true)

    // Ask the browser not to evict our data under storage pressure
    try { await navigator.storage?.persist?.() } catch {}

    const aborter = new AbortController()
    this.aborters.set(id, aborter)

    try {
      const words = await this.downloadWords(pack, aborter.signal)
      const jobs = await this.buildAudioJobs(pack, words)

      if (!opts.force) {
        const blocked = await this.checkStorage(pack, jobs.length)
        if (blocked) return // pack left in 'storage-warning'
      }

      await this.downloadAudio(pack, jobs, aborter.signal)

      pack.status = 'complete'
      pack.phase = 'done'
      await this.savePack(pack)
      this.syncMirror()
      this.emit(true)
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        // pause() / cancel() already set the final state
        return
      }
      console.error('[Offline] download failed:', err)
      pack.status = 'error'
      pack.error = err?.message === AUDIO_SERVICE_LIMIT
        ? 'The audio service hit its daily download limit. Resume the download later — your progress is saved.'
        : isQuotaError(err)
          ? 'Your device ran out of storage space. Free up some space and resume.'
          : !isOnline()
            ? 'Connection lost. Reconnect and resume the download.'
            : 'Download failed. Check your connection and try again.'
      await this.savePack(pack)
      this.emit(true)
    } finally {
      this.aborters.delete(id)
    }
  }

  // Phase 1 — topics list + vocabulary JSON for every topic
  private async downloadWords(pack: OfflinePack, signal: AbortSignal): Promise<DownloadedWord[]> {
    const nativeName = languageName(pack.nativeCode)
    const targetName = languageName(pack.targetCode)

    const topicsRes = await fetch('/api/topics', { signal })
    if (!topicsRes.ok) throw new Error(`Failed to load topics (${topicsRes.status})`)
    const topics = await topicsRes.json()
    if (!Array.isArray(topics)) throw new Error('Unexpected topics response')
    await idbPut('data', { key: 'topics', json: topics, savedAt: Date.now() })

    const realTopics = topics.filter((t: any) => typeof t?.id === 'number' && t.id > 0)
    pack.topicsTotal = realTopics.length
    pack.topicsDone = 0
    pack.wordCount = 0
    this.emit()

    const words: DownloadedWord[] = []
    for (const topic of realTopics) {
      throwIfAborted(signal)
      // Same params as the app's learn flow (names, limit 1000, offset 0)
      const params = new URLSearchParams({
        topicId: String(topic.id),
        sourceLanguage: targetName,
        targetLanguage: nativeName,
        limit: '1000',
        offset: '0',
      })
      const res = await fetch(`/api/vocabulary?${params}`, { signal })
      if (!res.ok) throw new Error(`Failed to load words for "${topic.name}" (${res.status})`)
      const json = await res.json()
      await idbPut('data', {
        key: vocabKey(topic.id, pack.targetCode, pack.nativeCode),
        json,
        savedAt: Date.now(),
      })
      const vocab: DownloadedWord[] = Array.isArray(json?.vocabulary) ? json.vocabulary : []
      for (const w of vocab) {
        if (w && typeof w.id === 'number') words.push(w)
      }
      pack.topicsDone++
      pack.wordCount = words.length
      this.emit()
    }

    await this.savePack(pack)
    return words
  }

  // Build the audio fetch list, skipping files already stored (resume support)
  private async buildAudioJobs(pack: OfflinePack, words: DownloadedWord[]): Promise<AudioJob[]> {
    const existing = new Set(await idbGetAllKeys('audio'))
    const jobs: AudioJob[] = []
    let alreadyDone = 0

    const addJob = (langCode: string, word: DownloadedWord, targetWordParam?: string) => {
      const key = audioKey(langCode, word.id)
      if (existing.has(key)) { alreadyDone++; return }
      jobs.push({
        key,
        url: buildAudioUrl(word.id, langCode, word.english_word, targetWordParam),
        wordId: word.id,
        languageCode: langCode,
        word: word.english_word,
        targetWord: targetWordParam,
      })
    }

    for (const w of words) {
      addJob(pack.targetCode, w, w.sourceWord) // learning-language pronunciation
      addJob(pack.nativeCode, w, w.targetWord) // native-language pronunciation
    }

    pack.audioTotal = jobs.length + alreadyDone
    pack.audioDone = alreadyDone
    pack.audioMissing = 0
    pack.phase = 'audio'
    this.emit()
    return jobs
  }

  // Returns true when the download must stop and wait for user confirmation
  private async checkStorage(pack: OfflinePack, remainingFiles: number): Promise<boolean> {
    const info = await this.getStorageInfo()
    if (!info.supported || !info.quotaBytes) return false

    const needed = remainingFiles * AVG_AUDIO_BYTES
    const available = info.quotaBytes - info.usageBytes
    // 20% headroom so we don't fill the quota to the brim
    if (available < needed * 1.2) {
      pack.status = 'storage-warning'
      pack.neededBytes = needed
      pack.availableBytes = available
      await this.savePack(pack)
      this.emit(true)
      return true
    }
    return false
  }

  // Phase 2 — fetch audio. Primary path is the bulk endpoint (50 clips per
  // request); if the server doesn't have it yet, fall back to paced
  // per-file requests against /api/universal-audio.
  private async downloadAudio(pack: OfflinePack, jobs: AudioJob[], signal: AbortSignal): Promise<void> {
    const remaining = await this.downloadAudioBatched(pack, jobs, signal)
    if (remaining.length > 0) {
      await this.downloadAudioPerFile(pack, remaining, signal)
    }
    pack.etaSeconds = undefined
    await this.savePack(pack)
  }

  private makeEtaTracker(pack: OfflinePack) {
    const startedAt = Date.now()
    const doneAtStart = pack.audioDone
    return () => {
      const elapsed = (Date.now() - startedAt) / 1000
      const completed = pack.audioDone - doneAtStart
      if (elapsed > 5 && completed > 10) {
        pack.etaSeconds = Math.round((pack.audioTotal - pack.audioDone) / (completed / elapsed))
      }
    }
  }

  // Bulk download via /api/offline-audio-batch. Returns jobs that still need
  // the per-file fallback (all of them when the endpoint isn't deployed).
  private async downloadAudioBatched(pack: OfflinePack, jobs: AudioJob[], signal: AbortSignal): Promise<AudioJob[]> {
    const queue = [...jobs]
    const requeues = new Map<string, number>()
    const updateEta = this.makeEtaTracker(pack)
    let endpointUnavailable = false

    const processBatch = async (): Promise<boolean> => {
      if (endpointUnavailable) return false
      const batch = queue.splice(0, BATCH_SIZE)
      if (batch.length === 0) return false

      for (let attempt = 0; ; attempt++) {
        throwIfAborted(signal)
        let res: Response
        try {
          res = await fetch('/api/offline-audio-batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: batch.map(j => ({
                wordId: j.wordId,
                languageCode: j.languageCode,
                word: j.word,
                targetWord: j.targetWord,
              })),
            }),
            signal,
          })
        } catch (err: any) {
          if (err?.name === 'AbortError') throw err
          if (!isOnline()) throw err // connection lost — fatal, resumable
          if (attempt >= 2) throw err
          await sleep(1500 * (attempt + 1), signal)
          continue
        }

        // Old deployed server without the batch endpoint — use per-file path
        if (res.status === 404 || res.status === 405) {
          endpointUnavailable = true
          queue.unshift(...batch)
          return false
        }

        if (!res.ok) {
          const body = await res.json().catch(() => null)
          if (body?.error === 'audio_unavailable') {
            // B2 daily download cap exhausted — retrying now is pointless
            throw new Error(AUDIO_SERVICE_LIMIT)
          }
          if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
            const retryAfter = parseInt(res.headers.get('retry-after') || '0', 10)
            const backoff = retryAfter > 0 ? retryAfter * 1000 : Math.min(30_000, 2000 * 2 ** attempt)
            await sleep(backoff + Math.random() * 500, signal)
            continue
          }
          throw new Error(`Batch audio download failed (${res.status})`)
        }

        const data = await res.json()
        const missingSet = new Set<string>(Array.isArray(data?.missing) ? data.missing : [])
        for (const job of batch) {
          throwIfAborted(signal)
          const lookupKey = `${job.languageCode}:${job.wordId}`
          const file = data?.files?.[lookupKey]
          if (file?.b64) {
            const blob = base64ToBlob(file.b64, file.type || 'audio/wav')
            await idbPut('audio', { key: job.key, blob, size: blob.size, savedAt: Date.now() })
            pack.bytes += blob.size
            pack.audioDone++
          } else if (missingSet.has(lookupKey)) {
            pack.audioMissing++
            pack.audioDone++
          } else {
            // Skipped by the server (size budget / transient B2 error) — retry
            const count = (requeues.get(job.key) || 0) + 1
            if (count > 3) {
              pack.audioMissing++
              pack.audioDone++
            } else {
              requeues.set(job.key, count)
              queue.push(job)
            }
          }
        }
        updateEta()
        this.emit()
        await this.savePack(pack)
        return true
      }
    }

    const worker = async () => {
      while (await processBatch()) { /* keep going */ }
    }
    await Promise.all(Array.from({ length: BATCH_CONCURRENCY }, () => worker()))

    return queue
  }

  // Per-file fallback, paced to stay under the universal-audio rate limit.
  // 429/5xx responses are retried with backoff; only definitive misses
  // (404 etc.) count as missing audio.
  private async downloadAudioPerFile(pack: OfflinePack, jobs: AudioJob[], signal: AbortSignal): Promise<void> {
    let index = 0
    let sinceSave = 0
    let firstError: any = null
    // Many failures in a row without a single success means the audio
    // backend is down (e.g. daily cap) — stop instead of marking the whole
    // pack as missing audio.
    let consecutiveFailures = 0

    // Global pacer shared by all workers
    let nextSlot = 0
    const pace = async () => {
      const now = Date.now()
      const slot = Math.max(now, nextSlot)
      nextSlot = slot + MIN_REQUEST_INTERVAL_MS
      if (slot > now) await sleep(slot - now, signal)
    }

    const updateEta = this.makeEtaTracker(pack)

    const fetchOne = async (job: AudioJob): Promise<void> => {
      for (let attempt = 0; ; attempt++) {
        throwIfAborted(signal)
        let res: Response
        try {
          await pace()
          res = await fetch(job.url, { signal })
        } catch (err: any) {
          if (err?.name === 'AbortError') throw err
          if (!isOnline()) throw err // connection lost — fatal, resumable
          if (attempt >= 2) { pack.audioMissing++; return }
          await sleep(1000 * (attempt + 1), signal)
          continue
        }

        const type = res.headers.get('content-type') || ''
        if (res.ok && !type.includes('json') && !type.includes('html')) {
          const blob = await res.blob()
          if (blob.size > 0) {
            await idbPut('audio', { key: job.key, blob, size: blob.size, savedAt: Date.now() })
            pack.bytes += blob.size
            consecutiveFailures = 0
          } else {
            pack.audioMissing++
          }
          return
        }

        if (res.status === 503) {
          const body = await res.json().catch(() => null)
          if (body?.error === 'audio_unavailable') throw new Error(AUDIO_SERVICE_LIMIT)
        }

        if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
          // Rate limited or transient server error — back off and retry
          const retryAfter = parseInt(res.headers.get('retry-after') || '0', 10)
          const backoff = retryAfter > 0 ? retryAfter * 1000 : Math.min(30_000, 2000 * 2 ** attempt)
          await sleep(backoff + Math.random() * 500, signal)
          continue
        }

        // Definitive miss (no audio exists for this word/language)
        pack.audioMissing++
        if (++consecutiveFailures >= 30) throw new Error(AUDIO_SERVICE_LIMIT)
        return
      }
    }

    const worker = async () => {
      while (true) {
        throwIfAborted(signal)
        if (firstError) throw firstError
        const job = jobs[index++]
        if (!job) return
        try {
          await fetchOne(job)
        } catch (err: any) {
          firstError = err
          throw err
        }
        pack.audioDone++
        updateEta()
        this.emit()
        if (++sinceSave >= 25) {
          sinceSave = 0
          await this.savePack(pack)
        }
      }
    }

    await Promise.all(Array.from({ length: AUDIO_CONCURRENCY }, () => worker()))
  }

  async pauseDownload(id: string): Promise<void> {
    const pack = this.packs.get(id)
    this.aborters.get(id)?.abort()
    this.aborters.delete(id)
    if (pack && pack.status === 'downloading') {
      pack.status = 'paused'
      await this.savePack(pack)
      this.emit(true)
    }
  }

  resumeDownload(id: string, opts: { force?: boolean } = {}): Promise<void> {
    const pack = this.packs.get(id)
    if (!pack) return Promise.resolve()
    return this.startDownload(pack.nativeCode, pack.targetCode, opts)
  }

  // Cancel = abort + remove everything that was downloaded for this pack
  async cancelDownload(id: string): Promise<void> {
    this.aborters.get(id)?.abort()
    this.aborters.delete(id)
    await this.deletePack(id)
  }

  async deletePack(id: string): Promise<void> {
    const pack = this.packs.get(id)
    if (!pack) return
    this.aborters.get(id)?.abort()
    this.aborters.delete(id)

    this.packs.delete(id)
    await idbDelete('packs', id)

    // Vocabulary JSON for this specific pair (keys end with `:${target}:${native}`)
    try {
      const dataKeys = await idbGetAllKeys('data')
      const suffix = `:${pack.targetCode}:${pack.nativeCode}`
      for (const key of dataKeys) {
        if (key.startsWith('vocab:') && key.endsWith(suffix)) {
          await idbDelete('data', key)
        }
      }
    } catch {}

    // Audio is shared between packs by language — only delete languages no
    // remaining pack still needs.
    const stillNeeded = new Set<string>()
    for (const p of this.packs.values()) {
      stillNeeded.add(p.nativeCode)
      stillNeeded.add(p.targetCode)
    }
    for (const lang of [pack.nativeCode, pack.targetCode]) {
      if (!stillNeeded.has(lang)) {
        await idbDeleteByPrefix('audio', `a:${lang}:`).catch(() => {})
      }
    }

    this.syncMirror()
    this.emit(true)
  }

  private async savePack(pack: OfflinePack): Promise<void> {
    pack.updatedAt = Date.now()
    try { await idbPut('packs', { ...pack }) } catch (e) {
      if (isQuotaError(e)) throw e
    }
  }

  // localStorage mirror so non-async code (offline banner) can check
  // completed packs synchronously.
  private syncMirror(): void {
    try {
      const complete: { [id: string]: true } = {}
      for (const p of this.packs.values()) {
        if (p.status === 'complete') complete[p.id] = true
      }
      localStorage.setItem(MIRROR_KEY, JSON.stringify(complete))
    } catch {}
  }

  private emit(immediate = false): void {
    if (immediate) {
      if (this.emitTimer) { clearTimeout(this.emitTimer); this.emitTimer = null }
      this.notify()
      return
    }
    // Throttle high-frequency progress events (~6 updates/sec)
    if (this.emitTimer) return
    this.emitTimer = setTimeout(() => {
      this.emitTimer = null
      this.notify()
    }, 160)
  }

  private notify(): void {
    const snapshot = this.getPacks().map(p => ({ ...p }))
    this.listeners.forEach(l => { try { l(snapshot) } catch {} })
    try { window.dispatchEvent(new CustomEvent(PACKS_CHANGED_EVENT)) } catch {}
  }
}

function isQuotaError(err: any): boolean {
  return err?.name === 'QuotaExceededError' ||
    err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    (typeof err?.message === 'string' && err.message.toLowerCase().includes('quota'))
}

function isOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw new DOMException('Download aborted', 'AbortError')
}

function base64ToBlob(b64: string, type: string): Blob {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type })
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Download aborted', 'AbortError'))
    const t = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(t)
      reject(new DOMException('Download aborted', 'AbortError'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

// Synchronous check used by the offline banner: is the currently selected
// language pair fully downloaded?
export function isPairAvailableOffline(nativeCode: string | null, targetCode: string | null): boolean {
  if (!nativeCode || !targetCode || typeof window === 'undefined') return false
  try {
    const mirror = JSON.parse(localStorage.getItem(MIRROR_KEY) || '{}')
    return mirror[packId(nativeCode, targetCode)] === true
  } catch {
    return false
  }
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 MB'
  const mb = bytes / (1024 * 1024)
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
  if (mb >= 100) return `${Math.round(mb)} MB`
  if (mb >= 1) return `${mb.toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export const offlineManager = new OfflineManager()
