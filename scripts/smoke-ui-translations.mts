import { loadUiStrings, lookup, lookupPlural } from '../lib/i18n/ui-strings'

async function main() {
  console.log('--- lazy chunk load + lookup ---')
  for (const lang of ['tr', 'de', 'ru', 'ar', 'ja', 'id']) {
    await loadUiStrings(lang)
    console.log(
      `${lang.padEnd(3)} common.done="${lookup(lang, 'common.done')}"  ` +
        `progress.title="${lookup(lang, 'progress.title', { language: 'X' })}"`,
    )
  }

  console.log('\n--- plural selection (settings.words) ---')
  for (const lang of ['en', 'tr', 'ru', 'pl', 'ar', 'ja']) {
    await loadUiStrings(lang)
    const out = [1, 2, 5, 11].map((n) => `${n}→${lookupPlural(lang, 'settings.words', n)}`)
    console.log(`${lang.padEnd(3)} ${out.join('  ')}`)
  }

  console.log('\n--- unregistered language falls back to English ---')
  await loadUiStrings('xx')
  console.log(`xx  common.done="${lookup('xx', 'common.done')}"`)
}
main()
