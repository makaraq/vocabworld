/**
 * scripts/check-ui-translations.ts
 *
 * Coverage + integrity gate for the UI-string catalog.
 *
 * Why this exists: an empty-but-valid `{lang}.ts` is indistinguishable from a
 * working one at build time. In July 2026 the generator hit a depleted Gemini
 * key, wrote `tr.ts` with `{}` plus a loader entry, and the app silently served
 * English for every language for three months. This script makes that loud.
 *
 * Usage:
 *   npx tsx scripts/check-ui-translations.ts              # gate (exits 1 on failure)
 *   npx tsx scripts/check-ui-translations.ts --report      # full per-language table
 *   npx tsx scripts/check-ui-translations.ts --min 90      # custom coverage floor
 */

import { en } from '../lib/i18n/ui-strings/en'
import { uiStringLoaders } from '../lib/i18n/ui-strings/loaders'

const argv = process.argv.slice(2)
const REPORT = argv.includes('--report')
const MIN = Number(argv[argv.indexOf('--min') + 1]) || 90

const enStrings = en as unknown as Record<string, string>
const enKeys = Object.keys(enStrings)

// ── Helpers ──────────────────────────────────────────────────────────────────

/** `{token}` names in a template, sorted — word order may change, the set must not. */
function tokens(s: string): string[] {
  return (s.match(/\{(\w+)\}/g) ?? []).map((t) => t.slice(1, -1)).sort()
}

/** CLDR plural categories this locale actually uses. */
function requiredCategories(lang: string): string[] {
  try {
    const pr = new Intl.PluralRules(lang)
    const probes = [0, 1, 2, 3, 5, 6, 11, 21, 22, 100, 101, 1000]
    return [...new Set(probes.map((n) => pr.select(n)))].sort()
  } catch {
    return ['other']
  }
}

/** Keys in en.ts that form a plural pair (`x.one` + `x.other`). */
const pluralBases = enKeys
  .filter((k) => k.endsWith('.one'))
  .map((k) => k.slice(0, -'.one'.length))
  .filter((b) => enKeys.includes(`${b}.other`))

interface Issue {
  lang: string
  kind: string
  key: string
  detail: string
}

// ── Check one language ───────────────────────────────────────────────────────

async function checkLang(lang: string) {
  const mod = await uiStringLoaders[lang]()
  const strings = mod.uiStrings as Record<string, string>
  const keys = Object.keys(strings)
  const issues: Issue[] = []

  const pluralKeys = new Set(pluralBases.flatMap((b) => [`${b}.one`, `${b}.other`]))
  // Non-plural English keys are the coverage denominator; plural forms are
  // counted separately because the required set is per-locale.
  const baseKeys = enKeys.filter((k) => !pluralKeys.has(k))
  const translated = baseKeys.filter((k) => typeof strings[k] === 'string' && strings[k].trim() !== '')

  // Unknown keys — typo or a key renamed in en.ts without updating translations.
  const allowed = new Set([
    ...enKeys,
    ...pluralBases.flatMap((b) =>
      ['zero', 'one', 'two', 'few', 'many', 'other'].map((c) => `${b}.${c}`),
    ),
  ])
  for (const k of keys) {
    if (!allowed.has(k)) issues.push({ lang, kind: 'unknown-key', key: k, detail: 'not in en.ts' })
  }

  // Interpolation + markup parity against English.
  for (const k of keys) {
    const src = enStrings[k]
    const dst = strings[k]
    if (!src || typeof dst !== 'string') continue

    // Plural forms may legitimately drop `{n}`: the grammatical category
    // already encodes the count, so Arabic renders `.one` as "كلمة واحدة"
    // and `.two` as "كلمتان" with no numeral. Every OTHER token must match.
    const isPluralForm = pluralBases.some((b) =>
      /^(zero|one|two|few|many|other)$/.test(k.slice(b.length + 1)) && k.startsWith(`${b}.`),
    )
    const drop = (t: string[]) => (isPluralForm ? t.filter((x) => x !== 'n') : t)
    const a = drop(tokens(src)).join(',')
    const b = drop(tokens(dst)).join(',')
    if (a !== b) {
      issues.push({ lang, kind: 'token-mismatch', key: k, detail: `en{${a}} vs {${b}}` })
    }

    const ob = (dst.match(/<b>/g) ?? []).length
    const cb = (dst.match(/<\/b>/g) ?? []).length
    if (ob !== cb) {
      issues.push({ lang, kind: 'unbalanced-b', key: k, detail: `${ob} open / ${cb} close` })
    }
    if ((src.match(/<b>/g) ?? []).length !== ob) {
      issues.push({ lang, kind: 'markup-count', key: k, detail: 'differs from English' })
    }

    // Literal \n is load-bearing in paywall legal copy and titles.
    const sn = (src.match(/\n/g) ?? []).length
    const dn = (dst.match(/\n/g) ?? []).length
    if (sn !== dn) {
      issues.push({ lang, kind: 'newline-count', key: k, detail: `en ${sn} vs ${dn}` })
    }

    if (dst.trim() === '') {
      issues.push({ lang, kind: 'empty', key: k, detail: 'empty string' })
    }
  }

  // Plural completeness for this locale.
  const need = requiredCategories(lang)
  for (const base of pluralBases) {
    const have = need.filter((c) => typeof strings[`${base}.${c}`] === 'string')
    if (have.length !== need.length && translated.length > 0) {
      const missing = need.filter((c) => !have.includes(c))
      issues.push({
        lang,
        kind: 'plural-missing',
        key: base,
        detail: `needs ${need.join('/')} — missing ${missing.join('/')}`,
      })
    }
  }

  const pct = baseKeys.length ? (translated.length / baseKeys.length) * 100 : 0
  return { lang, pct, translated: translated.length, total: baseKeys.length, need, issues }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const langs = Object.keys(uiStringLoaders).sort()
  if (langs.length === 0) {
    console.error('✗ No languages registered in loaders.ts — every locale serves English.')
    process.exit(1)
  }

  const results = await Promise.all(langs.map(checkLang))
  const failed: string[] = []

  console.log(`\nUI translation coverage — ${enKeys.length} keys in en.ts, ${langs.length} language(s) registered\n`)
  console.log('  lang   coverage          keys   plural forms        issues')
  console.log('  ' + '─'.repeat(66))

  for (const r of results) {
    const bar = '█'.repeat(Math.round(r.pct / 5)).padEnd(20, '·')
    const flag = r.pct < MIN ? '✗' : '✓'
    if (r.pct < MIN) failed.push(`${r.lang} at ${r.pct.toFixed(1)}%`)
    console.log(
      `  ${flag} ${r.lang.padEnd(4)} ${bar} ${r.pct.toFixed(0).padStart(3)}%  ` +
        `${String(r.translated).padStart(3)}/${r.total}  ${r.need.join('/').padEnd(18)} ${r.issues.length || ''}`,
    )
  }

  const allIssues = results.flatMap((r) => r.issues)
  if (allIssues.length) {
    console.log('\nIntegrity issues:\n')
    const byKind = new Map<string, Issue[]>()
    for (const i of allIssues) byKind.set(i.kind, [...(byKind.get(i.kind) ?? []), i])
    for (const [kind, list] of byKind) {
      console.log(`  ${kind} (${list.length})`)
      for (const i of (REPORT ? list : list.slice(0, 8))) {
        console.log(`    ${i.lang}  ${i.key}  — ${i.detail}`)
      }
      if (!REPORT && list.length > 8) console.log(`    … ${list.length - 8} more (--report)`)
    }
  }

  // An empty catalog registered as a loader is the exact July 2026 bug.
  const empty = results.filter((r) => r.translated === 0)
  if (empty.length) {
    console.error(
      `\n✗ ${empty.length} language(s) registered with ZERO translated strings: ` +
        `${empty.map((r) => r.lang).join(', ')}\n` +
        `  An empty loader entry silently serves English. Remove the entry or fill the file.`,
    )
  }

  const blocking = allIssues.filter((i) => i.kind !== 'plural-missing')
  if (failed.length || empty.length || blocking.length) {
    console.error(
      `\n✗ FAIL — ${failed.length} below ${MIN}%, ${empty.length} empty, ${blocking.length} integrity issue(s)\n`,
    )
    process.exit(1)
  }
  console.log(`\n✓ PASS — ${langs.length} language(s), all ≥ ${MIN}%, no integrity issues\n`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
