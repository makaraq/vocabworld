// What the film writes in other languages. Every non-Latin character here
// must also be listed in scripts/glyphs.mjs, which fetches the fonts for it.

/** Letterforms the globe is built from: one script after another. */
export const GLOBE_CHARS = [
  'A', 'あ', '字', 'α', 'Б', '한',
  'é', 'ñ', 'の', 'λ', 'Ж', '글',
  'ß', 'ç', '語', 'Ω', 'Я', '말',
  'ü', 'ø', '文', 'β', 'д', 'ع',
  'å', 'k', '言', 'π', 'ш', 'א',
  'R', 'ő', '葉', 'Σ', 'ф', 'अ',
  'w', 'ã', '中', 'γ', 'ю', 'ก',
]

export interface LanguageLabel {
  /** The language's own name. */
  name: string
  /** Its code in the app (src/app-ui/app-data.ts), for the flag. */
  code: string
}

/** Labels around the globe: the brief's seven first, then more at depth. */
export const GLOBE_LANGUAGES: LanguageLabel[] = [
  { name: 'Français', code: 'fr' },
  { name: 'English', code: 'en' },
  { name: 'Español', code: 'es' },
  { name: '日本語', code: 'ja' },
  { name: 'Deutsch', code: 'de' },
  { name: 'Italiano', code: 'it' },
  { name: 'Türkçe', code: 'tr' },
  { name: 'Português', code: 'pt' },
  { name: '한국어', code: 'ko' },
  { name: 'Русский', code: 'ru' },
  { name: '中文', code: 'zh' },
  { name: 'Ελληνικά', code: 'el' },
  { name: 'Polski', code: 'pl' },
  { name: 'العربية', code: 'ar' },
  { name: 'हिन्दी', code: 'hi' },
  { name: 'Svenska', code: 'sv' },
  { name: 'עברית', code: 'he' },
  { name: 'ไทย', code: 'th' },
]
