// Registers the app's icon sets with Iconify from bundled data, so every
// <Icon icon="solar:…" /> and flag renders WITHOUT hitting api.iconify.design.
// That network fetch is what left icons and flags blank offline.
//
// The JSON is generated from the exact icons the source references —
// regenerate with: node scripts/generate-offline-icons.mjs
//
// addCollection is synchronous and idempotent; running it at module load (before
// React renders) means icons resolve from cache on first paint, no flash.

import { addCollection, addIcon } from '@iconify/react'
import type { IconifyJSON } from '@iconify/types'
import solar from './data/solar.json'
import mdi from './data/mdi.json'
import flag from './data/flag.json'

// One-off glyphs that belong to no published set. Registering them under a
// `sprind:` prefix means they render through <Icon> like everything else, so no
// component needs a raw-SVG escape hatch.
const CUSTOM_ICONS: Record<string, { body: string; width: number; height: number }> = {
  // The Travel suitcase, drawn for this app. Kept verbatim — it predates the
  // move to mdi and matches nothing in any set (checked mdi, material-symbols,
  // ic, fluent, tabler, ph).
  'sprind:travel': {
    body: '<path fill="currentColor" d="M11 6h2V4h-2zm1 6q-1.9 0-3.625-.788T5 9.45V8q0-.825.588-1.412T7 6h2V3q0-.425.288-.712T10 2h4q.425 0 .713.288T15 3v3h2q.825 0 1.413.588T19 8v1.45q-1.65.975-3.375 1.763T12 12m-5 9q-.825 0-1.412-.587T5 19v-7.3q1.4.85 2.888 1.45t3.112.8V14q0 .425.288.713T12 15t.713-.288T13 14v-.05q1.625-.2 3.113-.8T19 11.7V19q0 .825-.587 1.413T17 21q0 .425-.288.713T16 22q-.4 0-.562-.363T15 21H9q0 .425-.288.713T8 22q-.4 0-.562-.363T7 21"/>',
    width: 24,
    height: 24,
  },
}

let registered = false

export function registerOfflineIcons(): void {
  if (registered) return
  registered = true
  addCollection(solar as IconifyJSON)
  addCollection(mdi as IconifyJSON)
  addCollection(flag as IconifyJSON)
  for (const [name, data] of Object.entries(CUSTOM_ICONS)) addIcon(name, data)
}

// Side effect on import — keeps registration ahead of first render even if a
// consumer forgets to call the function explicitly.
registerOfflineIcons()
