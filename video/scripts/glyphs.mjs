// Every non-Latin character the film draws, per script, so the Noto subsets
// fetched by fetch-fonts.mjs cover them. Keep in step with src/data/languages.ts
// (globe characters and language labels) and the phonetics in src/data/words.ts.

export const GLYPHS = {
  jp: 'あの字日本語言葉文中',
  kr: '한국어글말',
  ar: 'العربيةع',
  he: 'עבריתא',
  hi: 'हिन्दीअ',
  th: 'ไทยก',
  ipa: 'abcdefghijklmnopqrstuvwxyz./ˈːɔ̃ʒʁɛəɥɡʃœøɑŋ',
}
