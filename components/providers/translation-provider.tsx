'use client'

// ============================================================
// TranslationProvider — React access to the UI-string catalog.
// ============================================================
// Mounts in app/layout.tsx ABOVE AchievementProvider so every consumer
// (achievement modals, offline banner, everything under the language
// selector) can call useT().
//
// Language resolution:
//  - Initial render is ALWAYS English (matches the server/SSG HTML, so no
//    hydration mismatch). A mount effect then reads the persisted
//    nativeLanguageCode, hydrates the localStorage snapshot synchronously
//    (module cache), and flips uiLang — this lands in the same commit wave
//    as the language-selector's own cold-start restore, so translated
//    surfaces never paint in English for returning users.
//  - The selector calls setUiLanguage() from its persist effect whenever
//    the user picks/changes their main language.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  getCurrentUiLang,
  hydrateFromLocalCache,
  loadUiStrings,
  lookup,
  lookupPlural,
  type UiKey,
  type UiVars,
} from '@/lib/i18n/ui-strings'

interface TranslationContextValue {
  /** Active UI language code ('en' until a main language is chosen). */
  uiLang: string
  /** Type-safe lookup for keys statically known in en.ts. */
  t: (key: UiKey, vars?: UiVars) => string
  /** Lookup for derived keys (e.g. `achievements.${id}.title`). */
  tRaw: (key: string, vars?: UiVars) => string
  /** Plural-aware lookup: resolves `baseKey.one` / `baseKey.other` etc. */
  tPlural: (baseKey: string, n: number, vars?: UiVars) => string
  /** Like t(), but renders whitelisted <b>…</b> spans as <strong>. */
  tMarkup: (key: UiKey, vars?: UiVars) => ReactNode
  /** Switch the UI language (loads + caches the language chunk). */
  setUiLanguage: (lang: string) => Promise<void>
}

/** Split "a <b>x</b> b" into React nodes with <strong> for the bold spans. */
function renderMarkup(text: string): ReactNode {
  const parts = text.split(/(<b>.*?<\/b>)/g)
  if (parts.length === 1) return text
  return parts.map((part, i) => {
    const m = /^<b>(.*?)<\/b>$/.exec(part)
    return m ? <strong key={i}>{m[1]}</strong> : <React.Fragment key={i}>{part}</React.Fragment>
  })
}

function buildValue(uiLang: string, setUiLanguage: (lang: string) => Promise<void>): TranslationContextValue {
  return {
    uiLang,
    t: (key, vars) => lookup(uiLang, key, vars),
    tRaw: (key, vars) => lookup(uiLang, key, vars),
    tPlural: (baseKey, n, vars) => lookupPlural(uiLang, baseKey, n, vars),
    tMarkup: (key, vars) => renderMarkup(lookup(uiLang, key, vars)),
    setUiLanguage,
  }
}

// English no-op fallback so useT() never throws outside the provider
// (e.g. isolated component tests or surfaces above the provider).
const fallbackValue = buildValue('en', async () => {})

const TranslationContext = createContext<TranslationContextValue>(fallbackValue)

export function useT(): TranslationContextValue {
  return useContext(TranslationContext)
}

export function TranslationProvider({ children }: { children: ReactNode }) {
  // Always 'en' on the first (hydration) render — see header comment.
  const [uiLang, setUiLang] = useState('en')
  // Bumped when a language chunk finishes loading so consumers re-render
  // with the fresh strings (string data lives in the module cache).
  const [loadCount, setLoadCount] = useState(0)

  const setUiLanguage = useCallback(async (lang: string) => {
    const next = lang || 'en'
    if (next !== 'en') hydrateFromLocalCache(next)
    setUiLang(next)
    if (next !== 'en') {
      await loadUiStrings(next)
      setLoadCount((c) => c + 1)
    }
  }, [])

  // Cold-start: restore the persisted language. Runs once; the selector's
  // own restore effect fires in the same commit, so the first painted
  // translated surface already uses the snapshot-hydrated strings.
  useEffect(() => {
    const saved = getCurrentUiLang()
    if (saved !== 'en') void setUiLanguage(saved)
  }, [setUiLanguage])

  const value = useMemo(
    () => buildValue(uiLang, setUiLanguage),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadCount forces refresh after chunk load
    [uiLang, setUiLanguage, loadCount],
  )

  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>
}
