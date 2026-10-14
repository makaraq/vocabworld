// The app's own rules for what the screens say, ported from
// components/language/language-selector.tsx so the film's labels are the
// labels a user sees with English as their main language.

import { API_TOPICS } from '../generated/app-sections'
import { APP_VOCABULARY } from '../generated/app-vocabulary'

export interface Topic {
  id: number
  name: string
}

export interface Section {
  name: string
  topics: Topic[]
  gridCols: number
  isAccount?: boolean
  isMyWords?: boolean
}

// Section names are the fallbacks passed to getTranslatedSectionName; the
// topic ranges are the same slices of /api/topics the app takes.
export const SECTIONS: Section[] = [
  { name: 'ACCOUNT', topics: [], gridCols: 1, isAccount: true },
  { name: 'FIRST AID KIT', topics: API_TOPICS.slice(0, 6), gridCols: 2 },
  { name: 'DAILY LIFE', topics: API_TOPICS.slice(6, 14), gridCols: 2 },
  { name: 'WORK & SCHOOL', topics: API_TOPICS.slice(20, 28), gridCols: 2 },
  { name: 'PERSONAL & SOCIAL LIFE', topics: API_TOPICS.slice(14, 20), gridCols: 2 },
  { name: 'CULTURE & SOCIETY', topics: API_TOPICS.slice(28, 36), gridCols: 2 },
  { name: 'PROFESSIONAL', topics: API_TOPICS.slice(36, 43), gridCols: 2 },
  { name: 'MY WORDS', topics: [], gridCols: 1, isMyWords: true },
]

export const sectionIndex = (name: string) => SECTIONS.findIndex((s) => s.name === name)

/** getTopicDisplayName for English: /api/topic-translations returns nothing for 'en'. */
export function topicDisplayName(topic: Topic): string {
  const nameMapping: Record<number, string> = {
    8: 'Health',
    11: 'Weather',
    12: 'Family',
    17: 'City',
    18: 'Travel',
  }
  return nameMapping[topic.id] || topic.name
}

export const topicById = (id: number): Topic => {
  const topic = API_TOPICS.find((t) => t.id === id)
  if (!topic) throw new Error(`No topic ${id} in /api/topics`)
  return topic
}

/** getCurrentContent's formatCategory, for an English main language. */
export function formatCategory(context: string): string {
  if (!context) return ''
  let text = context.replace(/_/g, ' ')
  const dash = text.indexOf(' - ')
  if (dash !== -1) text = text.substring(0, dash)
  return text.toUpperCase()
}

export interface LearningWord {
  /** Learning language (French), as the target-language card shows it. */
  target: string
  /** Main language (English). */
  native: string
  category: string
  /** IPA, shown when "Show phonetic pronunciation" is on. */
  phonetic?: string
}

// The IPA the phonetics endpoint would return; the app wraps it in slashes.
const PHONETICS: Record<string, string> = {
  bonjour: 'bɔ̃.ʒuʁ',
  "s'il vous plaît": 'sil vu plɛ',
  merci: 'mɛʁ.si',
  oui: 'wi',
  non: 'nɔ̃',
  "d'accord": 'da.kɔʁ',
  'bien sûr': 'bjɛ̃ syʁ',
  'de rien': 'də ʁjɛ̃',
  gare: 'ɡaʁ',
  'station de métro': 'sta.sjɔ̃ də me.tʁo',
  'aéroport': 'a.e.ʁɔ.pɔʁ',
  'station de taxis': 'sta.sjɔ̃ də tak.si',
  parking: 'paʁ.kiŋ',
  guichet: 'ɡi.ʃɛ',
  billet: 'bi.jɛ',
  bagages: 'ba.ɡaʒ',
  départ: 'de.paʁ',
}

/**
 * Words of a topic as the learning view shows them: both sides lowercased
 * (getCurrentContent), the category from the word's context.
 */
export function topicWords(topicId: number): LearningWord[] {
  return APP_VOCABULARY[topicId].map((w) => {
    const target = w.fr.toLowerCase()
    return {
      target,
      native: w.english.toLowerCase(),
      category: formatCategory(w.context),
      phonetic: PHONETICS[target],
    }
  })
}

/** Index of a word in its topic, by its English form. */
export function wordIndex(topicId: number, english: string): number {
  const i = APP_VOCABULARY[topicId].findIndex((w) => w.english === english)
  if (i === -1) throw new Error(`"${english}" is not in topic ${topicId}`)
  return i
}

// ── Languages ────────────────────────────────────────────────────────

/** getLanguageName (English names). */
export const LANGUAGE_NAMES: Record<string, string> = {
  ar: 'Arabic', bg: 'Bulgarian', bn: 'Bengali', ca: 'Catalan', cs: 'Czech', cy: 'Welsh',
  da: 'Danish', de: 'German', el: 'Greek', en: 'English', es: 'Spanish', et: 'Estonian',
  eu: 'Basque', fa: 'Persian', fi: 'Finnish', fr: 'French', ga: 'Irish', gu: 'Gujarati',
  he: 'Hebrew', hi: 'Hindi', hr: 'Croatian', hu: 'Hungarian', id: 'Indonesian', is: 'Icelandic',
  it: 'Italian', ja: 'Japanese', ko: 'Korean', lt: 'Lithuanian', lv: 'Latvian', mk: 'Macedonian',
  ml: 'Malayalam', mr: 'Marathi', mt: 'Maltese', nl: 'Dutch', no: 'Norwegian', pl: 'Polish',
  pt: 'Portuguese', ro: 'Romanian', ru: 'Russian', sk: 'Slovak', sl: 'Slovenian', sv: 'Swedish',
  ta: 'Tamil', te: 'Telugu', th: 'Thai', tr: 'Turkish', uk: 'Ukrainian', ur: 'Urdu',
  vi: 'Vietnamese', zh: 'Chinese',
}

/** The 50 languages with audio (alnilamLanguageCodes). */
export const LANGUAGE_CODES = Object.keys(LANGUAGE_NAMES)

const TOP_LANGUAGES = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'tr', 'ko', 'zh']

/** The picker's order: the most common first, then alphabetical by name. */
export const ORDERED_LANGUAGE_CODES = [
  ...TOP_LANGUAGES,
  ...LANGUAGE_CODES.filter((c) => !TOP_LANGUAGES.includes(c)).sort((a, b) =>
    LANGUAGE_NAMES[a].localeCompare(LANGUAGE_NAMES[b]),
  ),
]

/** utils/flags.ts */
const FLAG_MAP: Record<string, string> = {
  ar: 'flag:sa-1x1', bg: 'flag:bg-1x1', bn: 'flag:bd-1x1', ca: 'flag:es-ct-1x1', cs: 'flag:cz-1x1',
  cy: 'flag:gb-wls-1x1', da: 'flag:dk-1x1', de: 'flag:de-1x1', el: 'flag:gr-1x1', en: 'flag:us-1x1',
  es: 'flag:es-1x1', et: 'flag:ee-1x1', eu: 'flag:es-pv-1x1', fa: 'flag:ir-1x1', fi: 'flag:fi-1x1',
  fr: 'flag:fr-1x1', ga: 'flag:ie-1x1', gu: 'flag:in-1x1', he: 'flag:il-1x1', hi: 'flag:in-1x1',
  hr: 'flag:hr-1x1', hu: 'flag:hu-1x1', id: 'flag:id-1x1', is: 'flag:is-1x1', it: 'flag:it-1x1',
  ja: 'flag:jp-1x1', ko: 'flag:kr-1x1', lt: 'flag:lt-1x1', lv: 'flag:lv-1x1', mk: 'flag:mk-1x1',
  ml: 'flag:in-1x1', mr: 'flag:in-1x1', mt: 'flag:mt-1x1', nl: 'flag:nl-1x1', no: 'flag:no-1x1',
  pl: 'flag:pl-1x1', pt: 'flag:pt-1x1', ro: 'flag:ro-1x1', ru: 'flag:ru-1x1', sk: 'flag:sk-1x1',
  sl: 'flag:si-1x1', sv: 'flag:se-1x1', ta: 'flag:in-1x1', te: 'flag:in-1x1', th: 'flag:th-1x1',
  tr: 'flag:tr-1x1', uk: 'flag:ua-1x1', ur: 'flag:pk-1x1', vi: 'flag:vn-1x1', zh: 'flag:cn-1x1',
}

export const flagIcon = (code: string) => FLAG_MAP[code] || 'flag:us-1x1'
