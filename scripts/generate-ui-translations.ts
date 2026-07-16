/**
 * scripts/generate-ui-translations.ts
 *
 * Translates the UI-string catalog (lib/i18n/ui-strings/en.ts) into the app's
 * supported languages with Gemini, writing one committed TS file per language
 * (lib/i18n/ui-strings/{lang}.ts) plus a QA report per language
 * (scripts/ui-translation-reports/{lang}.md). Also regenerates loaders.ts
 * from the language files present on disk.
 *
 * Usage:
 *   npx tsx scripts/generate-ui-translations.ts --lang tr        # one language (test batch)
 *   npx tsx scripts/generate-ui-translations.ts --all            # every language (skips complete ones)
 *   npx tsx scripts/generate-ui-translations.ts --all --force    # regenerate everything
 *   npx tsx scripts/generate-ui-translations.ts --lang tr --namespace paywall   # re-run one namespace
 *   npx tsx scripts/generate-ui-translations.ts --lang tr --model gemini-2.5-flash
 *
 * Re-runs are merge-safe: existing keys (including hand edits) are preserved
 * unless --force is passed or --namespace targets them.
 *
 * Requires GEMINI_API_KEY in .env.local.
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { config } from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import { en, type UiKey } from '../lib/i18n/ui-strings/en'
import { ACHIEVEMENTS } from '../lib/achievements/definitions'
import { namespaceContext, uiStringContext } from './ui-strings-context'

config({ path: '.env.local' })

// ── Config ───────────────────────────────────────────────────────────────────

// gemini-3.1-flash-lite has the best usable quota on this project (15 RPM,
// 500 RPD) — enough to run all 49 languages in a day, and strong quality for
// UI microcopy. Override with --model if a different one is preferred.
// NOTE: the whole pipeline requires a FUNDED key. If the API returns
// "prepayment credits are depleted", top up billing or swap GEMINI_API_KEY
// for a key from a project that has quota (see README / --help).
const DEFAULT_MODEL = 'gemini-3.1-flash-lite'
const MAX_KEYS_PER_CALL = 100
const DELAY_BETWEEN_CALLS_MS = 1500
const MAX_RETRIES = 3
const QUOTA_BACKOFF_MS = 60_000
const ERROR_BACKOFF_MS = 5_000

const UI_STRINGS_DIR = path.join(__dirname, '..', 'lib', 'i18n', 'ui-strings')
const REPORTS_DIR = path.join(__dirname, 'ui-translation-reports')

// The 48 non-English languages with translation coverage (matches the
// lib/i18n static maps and the in-app selectable list).
const LANGUAGES: Record<string, string> = {
  ar: 'Arabic', bg: 'Bulgarian', bn: 'Bengali', ca: 'Catalan',
  cs: 'Czech', cy: 'Welsh', da: 'Danish', de: 'German',
  el: 'Greek', es: 'Spanish', et: 'Estonian', eu: 'Basque',
  fa: 'Persian', fi: 'Finnish', fr: 'French', ga: 'Irish',
  gu: 'Gujarati', he: 'Hebrew', hi: 'Hindi', hr: 'Croatian',
  hu: 'Hungarian', id: 'Indonesian', is: 'Icelandic', it: 'Italian',
  ja: 'Japanese', ko: 'Korean', lt: 'Lithuanian', lv: 'Latvian',
  mk: 'Macedonian', ml: 'Malayalam', mr: 'Marathi', mt: 'Maltese',
  nl: 'Dutch', no: 'Norwegian', pl: 'Polish', pt: 'Portuguese',
  ro: 'Romanian', ru: 'Russian', sk: 'Slovak', sl: 'Slovenian',
  sv: 'Swedish', ta: 'Tamil', te: 'Telugu', th: 'Thai',
  tr: 'Turkish', uk: 'Ukrainian', ur: 'Urdu', vi: 'Vietnamese',
  zh: 'Chinese (Simplified)',
}

// Strings allowed to be identical to English without a warning.
const IDENTICAL_OK = new Set(['OK', 'Premium', 'Global'])

// ── CLI args ─────────────────────────────────────────────────────────────────

interface Args {
  lang?: string
  all: boolean
  force: boolean
  namespace?: string
  model: string
}

function parseArgs(): Args {
  const argv = process.argv.slice(2)
  const args: Args = { all: false, force: false, model: DEFAULT_MODEL }
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--lang': args.lang = argv[++i]; break
      case '--all': args.all = true; break
      case '--force': args.force = true; break
      case '--namespace': args.namespace = argv[++i]; break
      case '--model': args.model = argv[++i]; break
      default:
        console.error(`Unknown argument: ${argv[i]}`)
        process.exit(1)
    }
  }
  if (!args.lang && !args.all) {
    console.error('Usage: --lang <code> | --all  [--force] [--namespace <ns>] [--model <id>]')
    process.exit(1)
  }
  if (args.lang && !LANGUAGES[args.lang]) {
    console.error(`Unsupported language code "${args.lang}". Supported: ${Object.keys(LANGUAGES).join(' ')}`)
    process.exit(1)
  }
  return args
}

// ── Catalog helpers ──────────────────────────────────────────────────────────

const EN_KEYS = Object.keys(en) as UiKey[]
const enMap = en as Record<string, string>

function namespaceOf(key: string): string {
  return key.split('.')[0]
}

/** Sanity-check the derived keys used via tRaw() actually exist in the catalog. */
function assertDerivedKeys(): void {
  const missing: string[] = []
  for (const a of ACHIEVEMENTS) {
    if (!(`achievements.${a.id}.title` in enMap)) missing.push(`achievements.${a.id}.title`)
    if (!(`achievements.${a.id}.description` in enMap)) missing.push(`achievements.${a.id}.description`)
  }
  for (let i = 0; i < 7; i++) {
    if (!(`congrats.${i}` in enMap)) missing.push(`congrats.${i}`)
  }
  if (missing.length > 0) {
    console.error('❌ en.ts is missing derived keys used at runtime:')
    missing.forEach((k) => console.error(`   ${k}`))
    process.exit(1)
  }
}

/** Group keys by namespace, then pack into chunks of ≤ MAX_KEYS_PER_CALL. */
function buildChunks(keys: string[]): string[][] {
  const byNs = new Map<string, string[]>()
  for (const key of keys) {
    const ns = namespaceOf(key)
    if (!byNs.has(ns)) byNs.set(ns, [])
    byNs.get(ns)!.push(key)
  }

  const chunks: string[][] = []
  let current: string[] = []
  for (const [, nsKeys] of byNs) {
    if (nsKeys.length > MAX_KEYS_PER_CALL) {
      // Oversized namespace (achievements): flush current, split evenly.
      if (current.length > 0) { chunks.push(current); current = [] }
      const parts = Math.ceil(nsKeys.length / MAX_KEYS_PER_CALL)
      const per = Math.ceil(nsKeys.length / parts)
      for (let i = 0; i < nsKeys.length; i += per) chunks.push(nsKeys.slice(i, i + per))
      continue
    }
    if (current.length + nsKeys.length > MAX_KEYS_PER_CALL) {
      chunks.push(current)
      current = []
    }
    current.push(...nsKeys)
  }
  if (current.length > 0) chunks.push(current)
  return chunks
}

// ── Validation ───────────────────────────────────────────────────────────────

function placeholderSet(s: string): string {
  return (s.match(/\{(\w+)\}/g) ?? []).sort().join(',')
}

function boldTagsBalanced(s: string): boolean {
  return (s.match(/<b>/g) ?? []).length === (s.match(/<\/b>/g) ?? []).length
}

function newlineCount(s: string): number {
  return (s.match(/\n/g) ?? []).length
}

interface Issue { key: string; kind: 'error' | 'warning'; message: string }

function validateEntry(key: string, translated: unknown): Issue[] {
  const issues: Issue[] = []
  const source = enMap[key]
  if (typeof translated !== 'string' || translated.trim() === '') {
    issues.push({ key, kind: 'error', message: 'missing or empty translation' })
    return issues
  }
  if (placeholderSet(translated) !== placeholderSet(source)) {
    issues.push({ key, kind: 'error', message: `placeholder mismatch: en has [${placeholderSet(source)}], got [${placeholderSet(translated)}]` })
  }
  if (!boldTagsBalanced(translated) || (source.includes('<b>') !== translated.includes('<b>'))) {
    issues.push({ key, kind: 'error', message: 'unbalanced or missing <b>…</b> tags' })
  }
  if (newlineCount(translated) !== newlineCount(source)) {
    issues.push({ key, kind: 'warning', message: `\\n count differs (en ${newlineCount(source)}, got ${newlineCount(translated)})` })
  }
  if (translated === source && source.length > 3 && !IDENTICAL_OK.has(source)) {
    issues.push({ key, kind: 'warning', message: 'identical to English' })
  }
  const ratio = translated.length / Math.max(source.length, 1)
  if (source.length > 8 && (ratio > 2.5 || ratio < 0.25)) {
    issues.push({ key, kind: 'warning', message: `suspicious length ratio ${ratio.toFixed(2)} (en ${source.length} chars, got ${translated.length})` })
  }
  return issues
}

// ── Gemini ───────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function buildPrompt(langName: string, keys: string[], correctionNotes?: string): string {
  const namespaces = [...new Set(keys.map(namespaceOf))]
  const sectionCtx = namespaces
    .filter((ns) => namespaceContext[ns])
    .map((ns) => `- ${ns}: ${namespaceContext[ns]}`)
    .join('\n')

  const strings: Record<string, { en: string; context?: string }> = {}
  for (const key of keys) {
    const entry: { en: string; context?: string } = { en: enMap[key] }
    const ctx = uiStringContext[key as UiKey]
    if (ctx) entry.context = ctx
    strings[key] = entry
  }

  return `You are a senior localization specialist translating the user interface of "Sprind" — a casual, motivational mobile app for learning vocabulary in foreign languages — from English into ${langName}.

VOICE & QUALITY
- Write natural, idiomatic ${langName} that reads like it was written by a native copywriter. NEVER translate literally when a natural phrasing exists.
- Use the informal address form consistently (the equivalent of tu/du/sen) — this is a friendly consumer app.
- Keep the motivational, encouraging product voice; keep playfulness where the English is playful.
- Match the brevity of the source: button labels and status pills must stay short enough for small mobile buttons.
- Use the standard UI terminology conventions of ${langName} apps (e.g. platform-typical words for Settings, Cancel, Done).

HARD RULES
1. Preserve every {token} placeholder EXACTLY (same name, same braces). Never translate, drop, or invent placeholders. Reorder them freely to fit ${langName} grammar.
2. Preserve <b> and </b> tags, wrapping the equivalent content.
3. Keep the same number of \\n line breaks, placed at natural phrase boundaries.
4. Keep emoji exactly as in the source.
5. "Sprind" is the product name — never translate it.
6. Numbers interpolated via {n}, {total}, {pct} etc. can be any value — phrase so the sentence works for the plural/"other" form of ${langName}.
7. Return ONLY a valid JSON object mapping every key to its ${langName} translation — every input key must appear. No commentary, no markdown fences.
${correctionNotes ? `\nCORRECTIONS REQUIRED — your previous attempt had these problems; fix them:\n${correctionNotes}\n` : ''}
SECTION CONTEXT (where these strings appear)
${sectionCtx}

STRINGS TO TRANSLATE (key → { en, context? })
${JSON.stringify(strings, null, 2)}`
}

function stripFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/m, '').replace(/```\s*$/m, '').trim()
}

async function callGemini(
  genAI: GoogleGenerativeAI,
  modelId: string,
  prompt: string,
): Promise<Record<string, string>> {
  const model = genAI.getGenerativeModel({
    model: modelId,
    generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
  })

  let lastError: unknown
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await model.generateContent(prompt)
      const text = result.response.text()
      try {
        return JSON.parse(stripFences(text))
      } catch (parseErr) {
        console.error(`   ⚠️ JSON parse failed (attempt ${attempt}). Head: ${text.slice(0, 200)} … Tail: ${text.slice(-200)}`)
        throw parseErr
      }
    } catch (err: any) {
      lastError = err
      const msg = String(err?.message ?? err)
      // Retrying cannot fix a bad/expired key — stop the whole run immediately.
      if (/API_KEY_INVALID|API key not valid/i.test(msg)) {
        console.error('\n❌ GEMINI_API_KEY is invalid or expired. Update it in .env.local and re-run.')
        process.exit(1)
      }
      const isQuota = msg.includes('429') || /quota|RESOURCE_EXHAUSTED/i.test(msg)
      if (attempt < MAX_RETRIES) {
        const wait = isQuota ? QUOTA_BACKOFF_MS : ERROR_BACKOFF_MS
        console.log(`   ⏳ ${isQuota ? 'Rate limited' : 'Error'} — retrying in ${wait / 1000}s (attempt ${attempt}/${MAX_RETRIES})`)
        await delay(wait)
      }
    }
  }
  throw lastError
}

// ── File IO ──────────────────────────────────────────────────────────────────

/** Parse an existing generated language file back into a map (JSON-shaped literal). */
function readExisting(langCode: string): Record<string, string> {
  const file = path.join(UI_STRINGS_DIR, `${langCode}.ts`)
  if (!fs.existsSync(file)) return {}
  const src = fs.readFileSync(file, 'utf-8')
  const start = src.indexOf('export const uiStrings = ')
  const end = src.lastIndexOf('} satisfies')
  if (start === -1 || end === -1) return {}
  const literal = src.slice(start + 'export const uiStrings = '.length, end + 1)
  try {
    return JSON.parse(literal)
  } catch {
    console.warn(`   ⚠️ Could not parse existing ${langCode}.ts — treating as empty`)
    return {}
  }
}

function writeLanguageFile(langCode: string, langName: string, translations: Record<string, string>): void {
  // Emit keys in en.ts order for stable, reviewable diffs. Object literal is
  // valid JSON so re-runs can parse it back (hand edits preserved).
  const ordered: Record<string, string> = {}
  for (const key of EN_KEYS) {
    if (translations[key] != null) ordered[key] = translations[key]
  }
  const body = JSON.stringify(ordered, null, 2)
  const content = `// ${langName} (${langCode}) UI strings — generated by scripts/generate-ui-translations.ts
// on ${new Date().toISOString().slice(0, 10)}. Safe to hand-edit: re-runs preserve existing
// keys unless --force is used. Missing keys fall back to English at runtime.
import type { UiKey } from './en'

export const uiStrings = ${body} satisfies Partial<Record<UiKey, string>>
`
  fs.writeFileSync(path.join(UI_STRINGS_DIR, `${langCode}.ts`), content, 'utf-8')
}

/** Regenerate loaders.ts from the language files actually on disk. */
function regenerateLoaders(): string[] {
  const codes = fs.readdirSync(UI_STRINGS_DIR)
    .filter((f) => /^[a-z]{2,3}\.ts$/.test(f) && !['en.ts'].includes(f))
    .map((f) => f.replace(/\.ts$/, ''))
    .sort()

  const entries = codes.map((c) => `  ${c}: () => import('./${c}'),`).join('\n')
  const content = `// Auto-maintained by scripts/generate-ui-translations.ts — regenerated from
// the language files present in this directory. Each entry becomes its own
// lazy-loaded chunk so only the active language ever ships to the client.
// English lives in ./en.ts and is statically bundled as the fallback.

type UiStringsModule = { uiStrings: Record<string, string> }

export const uiStringLoaders: Record<string, () => Promise<UiStringsModule>> = {
${entries}
}
`
  fs.writeFileSync(path.join(UI_STRINGS_DIR, 'loaders.ts'), content, 'utf-8')
  return codes
}

function writeReport(
  langCode: string,
  langName: string,
  translations: Record<string, string>,
  issues: Issue[],
  omitted: string[],
): void {
  if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true })

  const errors = issues.filter((i) => i.kind === 'error')
  const warnings = issues.filter((i) => i.kind === 'warning')

  let md = `# UI translation report — ${langName} (${langCode})\n\n`
  md += `Generated: ${new Date().toISOString()}\n\n`
  md += `- Keys in catalog: ${EN_KEYS.length}\n`
  md += `- Translated: ${Object.keys(translations).length}\n`
  md += `- Omitted (fall back to English): ${omitted.length}\n`
  md += `- Errors: ${errors.length} · Warnings: ${warnings.length}\n\n`

  if (omitted.length > 0) {
    md += `## Omitted keys (failed validation twice)\n\n`
    omitted.forEach((k) => { md += `- \`${k}\`\n` })
    md += '\n'
  }
  if (errors.length > 0) {
    md += `## Errors\n\n| Key | Problem |\n|---|---|\n`
    errors.forEach((i) => { md += `| \`${i.key}\` | ${i.message} |\n` })
    md += '\n'
  }
  if (warnings.length > 0) {
    md += `## Warnings (review these)\n\n| Key | Warning | English | Translation |\n|---|---|---|---|\n`
    warnings.forEach((i) => {
      const esc = (s: string) => (s ?? '').replace(/\|/g, '\\|').replace(/\n/g, '⏎')
      md += `| \`${i.key}\` | ${i.message} | ${esc(enMap[i.key])} | ${esc(translations[i.key] ?? '')} |\n`
    })
    md += '\n'
  }

  // Sample per namespace for spot-checking quality.
  md += `## Samples (spot-check)\n\n| Key | English | ${langName} |\n|---|---|---|\n`
  const seenNs = new Set<string>()
  for (const key of EN_KEYS) {
    const ns = namespaceOf(key)
    if (seenNs.has(ns) || translations[key] == null) continue
    seenNs.add(ns)
    const esc = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, '⏎')
    md += `| \`${key}\` | ${esc(enMap[key])} | ${esc(translations[key])} |\n`
  }

  fs.writeFileSync(path.join(REPORTS_DIR, `${langCode}.md`), md, 'utf-8')
}

// ── Per-language pipeline ────────────────────────────────────────────────────

async function translateLanguage(
  genAI: GoogleGenerativeAI,
  args: Args,
  langCode: string,
): Promise<void> {
  const langName = LANGUAGES[langCode]
  const existing = args.force ? {} : readExisting(langCode)

  // Which keys still need work?
  let targetKeys = EN_KEYS.filter((k) => existing[k] == null)
  if (args.namespace) {
    targetKeys = EN_KEYS.filter((k) => namespaceOf(k) === args.namespace)
    if (targetKeys.length === 0) {
      console.error(`No keys in namespace "${args.namespace}"`)
      process.exit(1)
    }
  }
  if (targetKeys.length === 0) {
    console.log(`✅ ${langName} (${langCode}) already complete — skipping (use --force to regenerate)`)
    return
  }

  console.log(`\n🌍 ${langName} (${langCode}) — ${targetKeys.length} keys to translate`)

  const translations: Record<string, string> = { ...existing }
  const allIssues: Issue[] = []
  const omitted: string[] = []
  const chunks = buildChunks(targetKeys)

  for (let c = 0; c < chunks.length; c++) {
    const chunk = chunks[c]
    console.log(`   📦 Chunk ${c + 1}/${chunks.length} (${chunk.length} keys: ${[...new Set(chunk.map(namespaceOf))].join(', ')})`)

    let result: Record<string, string> = {}
    try {
      result = await callGemini(genAI, args.model, buildPrompt(langName, chunk))
    } catch (err) {
      console.error(`   ❌ Chunk failed after retries:`, err)
    }

    // Validate; collect keys with errors for one correction round.
    const badKeys: string[] = []
    const notes: string[] = []
    for (const key of chunk) {
      const issues = validateEntry(key, result[key])
      const errors = issues.filter((i) => i.kind === 'error')
      if (errors.length > 0) {
        badKeys.push(key)
        errors.forEach((e) => notes.push(`- ${key}: ${e.message}`))
      } else {
        translations[key] = result[key]
        allIssues.push(...issues) // warnings only
      }
    }

    if (badKeys.length > 0) {
      console.log(`   🔁 Retrying ${badKeys.length} keys with correction notes`)
      await delay(DELAY_BETWEEN_CALLS_MS)
      let retryResult: Record<string, string> = {}
      try {
        retryResult = await callGemini(genAI, args.model, buildPrompt(langName, badKeys, notes.join('\n')))
      } catch (err) {
        console.error(`   ❌ Correction round failed:`, err)
      }
      for (const key of badKeys) {
        const issues = validateEntry(key, retryResult[key])
        const errors = issues.filter((i) => i.kind === 'error')
        if (errors.length > 0) {
          omitted.push(key)
          allIssues.push(...errors)
        } else {
          translations[key] = retryResult[key]
          allIssues.push(...issues)
        }
      }
    }

    if (c < chunks.length - 1) await delay(DELAY_BETWEEN_CALLS_MS)
  }

  writeLanguageFile(langCode, langName, translations)
  writeReport(langCode, langName, translations, allIssues, omitted)

  const warnings = allIssues.filter((i) => i.kind === 'warning').length
  console.log(`   💾 Wrote lib/i18n/ui-strings/${langCode}.ts (${Object.keys(translations).length}/${EN_KEYS.length} keys)`)
  console.log(`   📋 Report: scripts/ui-translation-reports/${langCode}.md (${omitted.length} omitted, ${warnings} warnings)`)
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs()

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not set in .env.local')
    process.exit(1)
  }

  assertDerivedKeys()
  console.log(`Catalog: ${EN_KEYS.length} keys · Model: ${args.model}`)

  const genAI = new GoogleGenerativeAI(apiKey)
  const langs = args.lang ? [args.lang] : Object.keys(LANGUAGES)

  for (const langCode of langs) {
    await translateLanguage(genAI, args, langCode)
  }

  const codes = regenerateLoaders()
  console.log(`\n🔗 loaders.ts regenerated with ${codes.length} language(s): ${codes.join(', ') || '(none)'}`)
  console.log('✅ Done')
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
