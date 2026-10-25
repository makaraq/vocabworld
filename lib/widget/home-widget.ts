// Home-screen flashcard widget (iOS WidgetKit, Android App Widget).
//
// The widget can't run the web app, so the app hands it a ready-made word
// list: each word, its translation, and absolute URLs for its pronunciation
// and picture. The native side (SprindWidget plugin: ios/App/App/
// SprindWidgetPlugin.swift, android/.../widget/SprindWidgetPlugin.java)
// stores the list where the widget can read it (App Group / SharedPreferences)
// and downloads the audio and pictures so the widget works offline.
//
// The user picks the words in Manage Account: one topic, or random words from
// across all topics (reshuffled once a day). The choice is per device.

import { Capacitor, registerPlugin } from '@capacitor/core'
import { getCurrentUiLang, loadUiStrings, lookup } from '@/lib/i18n/ui-strings'
import { languageName } from '@/lib/offline/offline-manager'
import { hasWordImage } from '@/lib/word-images'

export interface WidgetStatus {
  /** The widget exists on this OS version (iOS 17+, any Android). */
  supported: boolean
  /** How many copies of the widget are on the home screen. */
  installed: number
  /** Android 8+ launchers that can add the widget from inside the app. */
  canPin: boolean
}

interface SprindWidgetPlugin {
  setWords(options: { payload: string }): Promise<void>
  getStatus(): Promise<WidgetStatus>
  requestPin(): Promise<{ requested: boolean }>
}

const SprindWidget = registerPlugin<SprindWidgetPlugin>('SprindWidget')

// Where the native apps fetch audio and pictures from (same origin the
// bundled app reroutes its /api/ calls to in app/layout.tsx)
const ORIGIN = 'https://www.sprind.uk'
const SOURCE_KEY = 'sprind:widget-source'
const SYNC_KEY = 'sprind:widget-sync'
const RANDOM_REFRESH_MS = 24 * 60 * 60 * 1000
// Enough to page through for a while without a big download
const MAX_WORDS = 60
const RANDOM_TOPICS = 6
const RANDOM_PER_TOPIC = 7

/** 'random', or a topic id */
export type WidgetSource = 'random' | number

interface WidgetWord {
  id: number
  word: string
  translation: string
  audio: string
  image: string | null
}

export function isWidgetPlatform(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('SprindWidget')
}

export function getWidgetSource(): WidgetSource | null {
  try {
    const raw = localStorage.getItem(SOURCE_KEY)
    if (!raw) return null
    if (raw === 'random') return 'random'
    const id = Number(raw)
    return Number.isFinite(id) && id > 0 ? id : null
  } catch {
    return null
  }
}

export async function getWidgetStatus(): Promise<WidgetStatus> {
  if (!isWidgetPlatform()) return { supported: false, installed: 0, canPin: false }
  try {
    return await SprindWidget.getStatus()
  } catch {
    return { supported: false, installed: 0, canPin: false }
  }
}

/** Android only: asks the launcher to place the widget. */
export async function requestPinWidget(): Promise<boolean> {
  try {
    return (await SprindWidget.requestPin()).requested
  } catch {
    return false
  }
}

function shuffle<T>(items: T[]): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// Same request as the learn flow and the offline packs, so a downloaded pack
// answers it offline (lib/offline/offline-fetch.ts)
async function fetchTopicWords(topicId: number, nativeCode: string, targetCode: string): Promise<any[]> {
  const params = new URLSearchParams({
    topicId: String(topicId),
    sourceLanguage: languageName(targetCode),
    targetLanguage: languageName(nativeCode),
    limit: '1000',
    offset: '0',
  })
  const res = await fetch(`/api/vocabulary?${params}`)
  if (!res.ok) throw new Error(`vocabulary ${res.status}`)
  const json = await res.json()
  return Array.isArray(json?.vocabulary) ? json.vocabulary : []
}

function toWidgetWord(w: any, targetCode: string): WidgetWord | null {
  // The vocabulary API's sourceWord is the LEARNING-language word and
  // targetWord the native one (inverted naming, see language-selector)
  const word = String(w?.sourceWord || '').trim()
  const translation = String(w?.targetWord || '').trim()
  if (typeof w?.id !== 'number' || !word) return null
  // Must match buildAudioUrl in offline-manager so the server resolves the
  // same file the app plays
  let audio = `${ORIGIN}/api/universal-audio?wordId=${w.id}&languageCode=${targetCode}`
  if (w.english_word) audio += `&word=${encodeURIComponent(w.english_word)}`
  audio += `&targetWord=${encodeURIComponent(word)}`
  return {
    id: w.id,
    word,
    translation,
    audio,
    image: hasWordImage(w.id) ? `${ORIGIN}/word-images/${w.id}.webp` : null,
  }
}

// The topic's name in the user's language, as the topic menu shows it
async function topicLabel(topicId: number, nativeCode: string): Promise<string> {
  try {
    const res = await fetch(`/api/topic-translations?languageCode=${nativeCode}`)
    const name = res.ok ? (await res.json())?.translations?.[topicId] : null
    if (name) return String(name)
  } catch {}
  try {
    const res = await fetch('/api/topics')
    const topics = res.ok ? await res.json() : []
    const topic = Array.isArray(topics) ? topics.find((t: any) => t?.id === topicId) : null
    if (topic?.name) return String(topic.name)
  } catch {}
  return ''
}

async function buildWords(source: WidgetSource, nativeCode: string, targetCode: string): Promise<WidgetWord[]> {
  let picked: any[]
  if (source === 'random') {
    const res = await fetch('/api/topics')
    const topics = res.ok ? await res.json() : []
    const ids: number[] = (Array.isArray(topics) ? topics : [])
      .map((t: any) => t?.id)
      .filter((id: any) => typeof id === 'number' && id > 0)
    const lists = await Promise.all(
      shuffle(ids).slice(0, RANDOM_TOPICS).map(id =>
        fetchTopicWords(id, nativeCode, targetCode).catch(() => [] as any[])
      )
    )
    picked = shuffle(lists.flatMap(list => shuffle(list).slice(0, RANDOM_PER_TOPIC)))
  } else {
    const all = await fetchTopicWords(source, nativeCode, targetCode)
    // A long topic (Verbs, Common Phrases) gets a sample, kept in learning order
    picked = all.length <= MAX_WORDS
      ? all
      : shuffle(all.map((w, i) => ({ w, i }))).slice(0, MAX_WORDS).sort((a, b) => a.i - b.i).map(x => x.w)
  }
  return picked
    .map(w => toWidgetWord(w, targetCode))
    .filter((w): w is WidgetWord => !!w)
    .slice(0, MAX_WORDS)
}

/**
 * Rebuilds the widget's word list when the choice or the language pair has
 * changed, or a random list is a day old. `force` rebuilds regardless (a new
 * choice in Manage Account). Returns false when nothing could be sent.
 */
export async function syncHomeWidget(opts: { source?: WidgetSource; force?: boolean } = {}): Promise<boolean> {
  if (!isWidgetPlatform()) return false
  let nativeCode = ''
  let targetCode = ''
  try {
    if (opts.source !== undefined) localStorage.setItem(SOURCE_KEY, String(opts.source))
    nativeCode = localStorage.getItem('nativeLanguageCode') || ''
    targetCode = localStorage.getItem('targetLanguageCode') || ''
  } catch {}
  let source = getWidgetSource()
  // Added from the widget gallery before choosing anything: start with random words
  if (!source && (await getWidgetStatus()).installed > 0) {
    source = 'random'
    try { localStorage.setItem(SOURCE_KEY, source) } catch {}
  }
  if (!source || !nativeCode || !targetCode || nativeCode === targetCode) return false

  const uiLang = getCurrentUiLang()
  const key = `${source}|${nativeCode}|${targetCode}|${uiLang}`
  if (!opts.force) {
    try {
      const last = JSON.parse(localStorage.getItem(SYNC_KEY) || 'null')
      const fresh = source !== 'random' || Date.now() - (last?.at || 0) < RANDOM_REFRESH_MS
      if (last?.key === key && fresh) return true
    } catch {}
  }

  const [words, label] = await Promise.all([
    buildWords(source, nativeCode, targetCode),
    loadUiStrings(uiLang).then(() =>
      source === 'random' ? lookup(uiLang, 'widget.source.random') : topicLabel(source, nativeCode)
    ),
  ])
  if (words.length === 0) return false
  // label: shown above the card. empty: shown if the list is ever unreadable
  const empty = lookup(uiLang, 'widget.native.empty')
  await SprindWidget.setWords({ payload: JSON.stringify({ v: 1, key, label, empty, words }) })
  try {
    localStorage.setItem(SYNC_KEY, JSON.stringify({ key, at: Date.now() }))
  } catch {}
  return true
}
