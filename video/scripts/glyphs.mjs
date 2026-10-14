// Every non-Latin character the film draws, per script, so the Noto subsets
// fetched by fetch-fonts.mjs cover them. Keep in step with the hook's words
// (src/data/hello.ts) and the phonetics in src/app-ui/app-data.ts.

export const GLYPHS = {
  jp: 'こんにちは',
  kr: '안녕하세요',
  sc: '你好',
  ar: 'مرحبا',
  hi: 'नमस्ते',
  ipa: 'abcdefghijklmnopqrstuvwxyz./ˈːɔ̃ʒʁɛəɥɡʃœøɑŋ',
}
