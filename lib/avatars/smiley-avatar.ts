import { createAvatar } from '@dicebear/core'
import { funEmoji } from '@dicebear/collection'

/**
 * Everyone gets a smiley face.
 *
 * Avatars are generated from DiceBear's "fun-emoji" set (CC BY 4.0, by Davis
 * Uche) and rendered locally as inline SVG - no request to api.dicebear.com,
 * so a face is there on first paint and keeps working offline.
 *
 * Nothing is stored: a face is derived from the user's id, so it is assigned
 * the moment an account exists and never has to be backfilled or migrated.
 * The same id always produces the same face, on every device and on both the
 * leaderboard and the account screen.
 */

// The smiley half of the fun-emoji set: every cheerful eye and mouth it has.
// DiceBear pairs one of each per seed, so this is 11 x 10 = 110 faces across
// the palette below.
//
// The style also ships 'sad', 'pissed', 'crying' and 'tearDrop' eyes, and
// 'sad', 'pissed', 'sick', 'faceMask' and 'drip' mouths. Those are left out on
// purpose - nobody should be handed a crying or sick face as their avatar, and
// 'drip' renders close enough to a tear to read as one. Add them back here if
// you want the full range.
export const SMILEY_EYES = [
  'cute', 'wink', 'wink2', 'plain', 'glasses', 'love',
  'stars', 'shades', 'closed', 'closed2', 'sleepClose',
] as const

export const SMILEY_MOUTHS = [
  'lilSmile', 'wideSmile', 'smileTeeth', 'smileLol', 'cute', 'shy',
  'plain', 'tongueOut', 'kissHeart', 'shout',
] as const

// Backgrounds that sit well on the app's glass panels.
const BACKGROUNDS = [
  '7c3aed', 'db2777', '059ff2', '71cf62', 'fcbc34', 'd84be5', 'f6859b', '34c3a0',
]

// When true, a Google or Apple profile photo wins over the generated face.
// Left false so every account shows a smiley, as intended.
export const PREFER_PROVIDER_PHOTO = false

/**
 * The seed an avatar is drawn from.
 *
 * FNV-1a, not a crypto hash: the leaderboard must be able to hand a seed to
 * the browser without shipping anyone's raw user id, while the account screen
 * has to derive the identical seed from the id it already holds - which rules
 * out anything async like crypto.subtle. A 32-bit digest cannot be walked back
 * to a UUID, and it is only ever used to choose a face.
 */
export function avatarSeedFor(userId: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < userId.length; i++) {
    hash ^= userId.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

// Generating one face costs ~3KB of SVG, and a leaderboard page asks for the
// same 20 over and over as it re-renders, so keep what we have built.
const cache = new Map<string, string>()

/** An inline `data:` URI for the face belonging to `seed`. */
export function smileyAvatar(seed: string): string {
  const hit = cache.get(seed)
  if (hit) return hit

  const svg = createAvatar(funEmoji, {
    seed,
    eyes: [...SMILEY_EYES],
    mouth: [...SMILEY_MOUTHS],
    backgroundColor: BACKGROUNDS,
    radius: 50,
  }).toString()

  const uri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
  cache.set(seed, uri)
  return uri
}

/**
 * What to show for someone: their smiley, or their provider photo when that is
 * preferred and present. `seed` is an avatar seed, not a raw user id.
 */
export function resolveAvatar(providerPhotoUrl: string | null | undefined, seed: string | null | undefined): string | null {
  if (PREFER_PROVIDER_PHOTO && providerPhotoUrl) return providerPhotoUrl
  if (!seed) return providerPhotoUrl || null
  return smileyAvatar(seed)
}
