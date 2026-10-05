// Auto-maintained by scripts/generate-ui-translations.ts — regenerated from
// the language files present in this directory. Each entry becomes its own
// lazy-loaded chunk so only the active language ever ships to the client.
// English lives in ./en.ts and is statically bundled as the fallback.

type UiStringsModule = { uiStrings: Record<string, string> }

export const uiStringLoaders: Record<string, () => Promise<UiStringsModule>> = {
  ar: () => import('./ar'),
  cs: () => import('./cs'),
  da: () => import('./da'),
  de: () => import('./de'),
  es: () => import('./es'),
  fr: () => import('./fr'),
  id: () => import('./id'),
  it: () => import('./it'),
  ja: () => import('./ja'),
  ko: () => import('./ko'),
  nl: () => import('./nl'),
  no: () => import('./no'),
  pl: () => import('./pl'),
  pt: () => import('./pt'),
  ru: () => import('./ru'),
  sv: () => import('./sv'),
  tr: () => import('./tr'),
  uk: () => import('./uk'),
  zh: () => import('./zh'),
}
