// Auto-maintained by scripts/generate-ui-translations.ts — regenerated from
// the language files present in this directory. Each entry becomes its own
// lazy-loaded chunk so only the active language ever ships to the client.
// English lives in ./en.ts and is statically bundled as the fallback.

type UiStringsModule = { uiStrings: Record<string, string> }

export const uiStringLoaders: Record<string, () => Promise<UiStringsModule>> = {
  tr: () => import('./tr'),
}
