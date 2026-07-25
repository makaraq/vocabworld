// Generates trimmed, offline Iconify collections for exactly the icons the app
// renders — so <Icon> resolves from bundled data instead of fetching
// api.iconify.design at runtime (which fails offline → missing icons/flags).
//
// It scans the source for `solar:*`, `mdi:*` and `flag:*-1x1` literals, fetches
// just those from the Iconify API, and writes self-contained collection JSON:
//   lib/icons/data/solar.json
//   lib/icons/data/mdi.json
//   lib/icons/data/flag.json
// committed to the repo, so no network is needed at build or runtime.
//
// Run after adding/removing icons:  node scripts/generate-offline-icons.mjs

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, extname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DATA_DIR = join(ROOT, 'lib', 'icons', 'data')
const SCAN_DIRS = ['app', 'components', 'lib', 'utils']
// Dead / dev-only files whose icon references must not drive the bundle.
const EXCLUDE = new Set([join('components', 'test-icons.tsx')])
const API = 'https://api.iconify.design'
const CHUNK = 50

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry === '.next' || entry === 'data') continue
      walk(full, acc)
    } else if (['.ts', '.tsx'].includes(extname(entry))) {
      const rel = full.slice(ROOT.length + 1)
      if (!EXCLUDE.has(rel)) acc.push(full)
    }
  }
  return acc
}

function collectNames() {
  const files = SCAN_DIRS.flatMap((d) => walk(join(ROOT, d)))
  const solar = new Set()
  const mdi = new Set()
  const flag = new Set()
  for (const file of files) {
    const text = readFileSync(file, 'utf8')
    for (const m of text.matchAll(/solar:([a-z0-9-]+)/g)) solar.add(m[1])
    for (const m of text.matchAll(/\bmdi:([a-z0-9-]+)/g)) mdi.add(m[1])
    for (const m of text.matchAll(/flag:([a-z0-9-]+-1x1)/g)) flag.add(m[1])
  }
  return {
    solar: [...solar].sort(),
    mdi: [...mdi].sort(),
    flag: [...flag].sort(),
  }
}

function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

async function buildCollection(prefix, names) {
  const merged = { prefix, icons: {}, aliases: {} }
  let width, height

  for (const part of chunk(names, CHUNK)) {
    const res = await fetch(`${API}/${prefix}.json?icons=${part.join(',')}`)
    if (!res.ok) throw new Error(`${prefix}: API ${res.status}`)
    const data = await res.json()
    if (data.width) width = data.width
    if (data.height) height = data.height
    Object.assign(merged.icons, data.icons || {})
    Object.assign(merged.aliases, data.aliases || {})
    if (data.not_found?.length) {
      console.warn(`  ! ${prefix} NOT FOUND (fix the source reference): ${data.not_found.join(', ')}`)
    }
  }

  if (width) merged.width = width
  if (height) merged.height = height
  if (Object.keys(merged.aliases).length === 0) delete merged.aliases

  console.log(`  ✓ ${prefix}: ${Object.keys(merged.icons).length}/${names.length} icons`)
  writeFileSync(join(DATA_DIR, `${prefix}.json`), JSON.stringify(merged))
}

async function main() {
  console.log('Scanning source for icon references…')
  const sets = collectNames()
  console.log(
    Object.entries(sets)
      .map(([prefix, names]) => `${names.length} ${prefix}`)
      .join(' + ') + ' icons found',
  )
  for (const [prefix, names] of Object.entries(sets)) {
    await buildCollection(prefix, names)
  }
  console.log('Done → lib/icons/data/{solar,mdi,flag}.json')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
