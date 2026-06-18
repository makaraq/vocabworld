// Registers the app's icon sets with Iconify from bundled data, so every
// <Icon icon="solar:…" /> and flag renders WITHOUT hitting api.iconify.design.
// That network fetch is what left icons and flags blank offline.
//
// The JSON is generated from the exact icons the source references —
// regenerate with: node scripts/generate-offline-icons.mjs
//
// addCollection is synchronous and idempotent; running it at module load (before
// React renders) means icons resolve from cache on first paint, no flash.

import { addCollection } from '@iconify/react'
import type { IconifyJSON } from '@iconify/types'
import solar from './data/solar.json'
import flag from './data/flag.json'

let registered = false

export function registerOfflineIcons(): void {
  if (registered) return
  registered = true
  addCollection(solar as IconifyJSON)
  addCollection(flag as IconifyJSON)
}

// Side effect on import — keeps registration ahead of first render even if a
// consumer forgets to call the function explicitly.
registerOfflineIcons()
