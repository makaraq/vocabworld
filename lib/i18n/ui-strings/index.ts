// ============================================================
// UI-string runtime core — framework-free.
// ============================================================
// Used by the React TranslationProvider AND by non-React code
// (lib/notifications.ts schedules localized notification copy).
//
// Design:
//  - English (./en.ts) is statically bundled → always-available fallback.
//  - Other languages are lazy chunks loaded via ./loaders.ts.
//  - After each successful load a snapshot is persisted to localStorage so
//    a returning user's language is available synchronously on cold start
//    (no flash of English) and offline on web. Snapshots self-heal: the
//    fresh chunk always reloads in the background and overwrites them.
// ============================================================

import { en } from './en'
import { uiStringLoaders } from './loaders'

export type { UiKey } from './en'
export type UiVars = Record<string, string | number>
type Strings = Record<string, string>

const enStrings = en as unknown as Strings

// Module-level cache: lang → strings. Shared by React and non-React callers.
const cache: Record<string, Strings> = { en: enStrings }
// Languages whose cache entry came from a localStorage snapshot (possibly
// stale after an app update) — a fresh chunk load must still replace them.
const fromSnapshot = new Set<string>()
// De-dupe concurrent loads per language.
const pending: Record<string, Promise<Strings>> = {}

const SNAPSHOT_KEY = 'uiStringsCache'

/** The user's chosen main language (UI language). SSR-safe: 'en' on server. */
export function getCurrentUiLang(): string {
  if (typeof window === 'undefined') return 'en'
  try {
    return localStorage.getItem('nativeLanguageCode') || 'en'
  } catch {
    return 'en'
  }
}

/**
 * Synchronously hydrate the cache from the localStorage snapshot.
 * Returns true when strings for `lang` are now available.
 */
export function hydrateFromLocalCache(lang: string): boolean {
  if (lang === 'en') return true
  if (cache[lang] && !fromSnapshot.has(lang)) return true
  if (typeof window === 'undefined') return false
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY)
    if (!raw) return !!cache[lang]
    const snap = JSON.parse(raw)
    if (snap?.lang === lang && snap.strings && typeof snap.strings === 'object') {
      cache[lang] = snap.strings as Strings
      fromSnapshot.add(lang)
      return true
    }
  } catch {
    // Corrupt snapshot — ignore; the chunk load will repopulate it.
  }
  return !!cache[lang]
}

/**
 * Load the language chunk (dynamic import), cache it, and persist a snapshot.
 * Resolves to the best available strings — falls back to English when the
 * language has no chunk or the import fails (e.g. offline first visit).
 */
export function loadUiStrings(lang: string): Promise<Strings> {
  if (!lang || lang === 'en') return Promise.resolve(enStrings)
  if (cache[lang] && !fromSnapshot.has(lang)) return Promise.resolve(cache[lang])
  if (pending[lang]) return pending[lang]

  const loader = uiStringLoaders[lang]
  if (!loader) return Promise.resolve(cache[lang] ?? enStrings)

  pending[lang] = loader()
    .then((mod) => {
      cache[lang] = mod.uiStrings as Strings
      fromSnapshot.delete(lang)
      try {
        localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ lang, strings: cache[lang] }))
      } catch {
        // Storage full/unavailable — snapshot is an optimization only.
      }
      return cache[lang]
    })
    .catch(() => {
      // Import failed (offline before first load, missing chunk) — keep any
      // snapshot we have, otherwise English.
      return cache[lang] ?? enStrings
    })
    .finally(() => {
      delete pending[lang]
    })

  return pending[lang]
}

/** Replace {token} placeholders. Unknown tokens are left intact. */
export function interpolate(template: string, vars?: UiVars): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    name in vars ? String(vars[name]) : match,
  )
}

/**
 * Resolve a key against the cached strings for `lang`, falling back to
 * English, then to the key itself (visible marker for missing catalog keys).
 */
export function lookup(lang: string, key: string, vars?: UiVars): string {
  const template = cache[lang]?.[key] ?? enStrings[key] ?? key
  return interpolate(template, vars)
}

/**
 * Plural-aware lookup: tries `baseKey.{pluralCategory}` then `baseKey.other`
 * in the target language, then English. `{n}` is always available as a var.
 */
export function lookupPlural(lang: string, baseKey: string, n: number, vars?: UiVars): string {
  let category = 'other'
  try {
    category = new Intl.PluralRules(lang).select(n)
  } catch {
    // Unknown locale — 'other' covers it.
  }
  const allVars = { n, ...vars }
  const candidates = [`${baseKey}.${category}`, `${baseKey}.other`, `${baseKey}.one`]
  for (const dict of [cache[lang], enStrings]) {
    if (!dict) continue
    for (const key of candidates) {
      if (dict[key] != null) return interpolate(dict[key], allVars)
    }
  }
  return interpolate(baseKey, allVars)
}

/**
 * Async convenience for non-React callers (notifications): ensures the
 * language chunk is loaded before resolving the key.
 */
export async function getUiString(lang: string, key: string, vars?: UiVars): Promise<string> {
  await loadUiStrings(lang)
  return lookup(lang, key, vars)
}
