// ============================================================
// Shared types for translated UI-string files.
// ============================================================
// English (./en.ts) carries only `.one` / `.other` because that is all
// English needs. Many languages need more CLDR plural categories:
//   ru/uk/pl/cs  → one, few, many, other
//   ar           → zero, one, two, few, many, other
//   ja/ko/zh/id  → other only
//
// lookupPlural() in ./index.ts already resolves `${baseKey}.${category}`
// against the TARGET language dict before falling back to English, so the
// runtime supports these forms today — this type is what lets a translated
// file declare them without a type error.
// ============================================================

import type { UiKey } from './en'

/** Every key in en.ts that is one half of a plural pair (has a `.one` form). */
type PluralBaseOf<K extends string> = K extends `${infer B}.one` ? B : never
export type PluralBase = PluralBaseOf<UiKey>

/** The six CLDR plural categories. */
export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other'

/** A key a translated file may define: any English key, plus extra plural forms. */
export type TranslatedUiKey = UiKey | `${PluralBase}.${PluralCategory}`

/**
 * Shape of every `./{lang}.ts` export. Partial by design — a missing key
 * falls back to English at runtime rather than breaking the build.
 */
export type UiStringsFile = Partial<Record<TranslatedUiKey, string>>
