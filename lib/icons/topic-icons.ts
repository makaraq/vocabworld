// Single source of truth for topic tile icons.
//
// The set is MDI — Material Design Icons by Pictogrammers (Iconify prefix
// `mdi:`). Confirmed by exact path matching: 18 of the 19 icons that already
// shipped inline in /api/topics are verbatim mdi glyphs. Everything else used
// to fall back to Solar outline icons, which is why most pages looked unlike
// FIRST AID KIT.
//
// Note: mdi is the community Pictogrammers set, NOT Google's Material Symbols
// (`material-symbols:`). They look similar but do not mix cleanly — pick
// replacements from https://pictogrammers.com/library/mdi/ only.
//
// After editing, re-run `node scripts/generate-offline-icons.mjs` so the
// bundled offline collection covers every name used here.

export const TOPIC_ICON_NAMES: Record<number, string> = {
  // ── glyphs the app has always shown, untouched ──
  1: 'mdi:human-greeting-variant', // Greetings
  2: 'mdi:counter', // Numbers
  3: 'mdi:timer-sand', // Time
  4: 'mdi:arrow-decision', // Directions
  6: 'mdi:noodles', // Food
  7: 'mdi:car-brake-alert', // Emergency
  8: 'mdi:hospital-box-outline', // Health & Body Parts
  10: 'mdi:hanger', // Personal Style
  11: 'mdi:weather-partly-cloudy', // Weather & Nature
  19: 'mdi:palette', // Colors & Shapes
  21: 'mdi:lightning-bolt-outline', // Actions
  26: 'mdi:school-outline', // Education
  27: 'mdi:play-network', // Media
  29: 'mdi:handshake-outline', // Business & Economics
  30: 'mdi:arrow-collapse-all', // Common Collocations
  34: 'mdi:pillar', // History & Culture
  35: 'mdi:scale-balance', // Politics & Law

  // Travel is a hand-drawn one-off that matches no published set. Kept exactly
  // as it shipped, registered as `sprind:travel` in offline-icons.ts.
  18: 'sprind:travel', // Travel

  // ── the hand-picked mdi set for the topic tiles ──
  5: 'mdi:shopping-cart-outline', // Shopping
  9: 'mdi:house-outline', // Home
  12: 'mdi:human-male-female-child', // Family & Relationships
  13: 'mdi:emoticon-outline', // Emotions
  14: 'mdi:head-cog-outline', // Personality
  15: 'mdi:controller-classic', // Hobbies
  16: 'mdi:dumbbell', // Fitness
  17: 'mdi:city-variant-outline', // Places Around Town
  22: 'mdi:magnify-plus-outline', // Adjectives
  23: 'mdi:drama-masks', // Art
  24: 'mdi:devices', // Technology
  25: 'mdi:briefcase-variant-outline', // Professions
  28: 'mdi:leaf', // Environment
  31: 'mdi:pound', // Modern Expressions
  32: 'mdi:flask-outline', // Science
  33: 'mdi:calculator-variant-outline', // Mathematics
  36: 'mdi:meditation', // Religion
  37: 'mdi:auto-fix', // Mythology
  38: 'mdi:party-popper', // Holidays
  39: 'mdi:script-text', // Formal Language
  40: 'mdi:earth', // Cultural Integration
  41: 'mdi:run', // Verbs
  42: 'mdi:forum', // Daily Language
  43: 'mdi:star', // Essential Words
  45: 'mdi:format-quote-close', // Example Sentences
}

// Playlist learning uses a synthetic topic id.
export const PLAYLIST_TOPIC_ICON = 'mdi:notebook'

// Used for anything without a mapping (newly added topics).
export const FALLBACK_TOPIC_ICON = 'mdi:message-text'

export function getTopicIcon(topicId: number | undefined | null): string {
  if (topicId == null) return FALLBACK_TOPIC_ICON
  if (topicId === -2) return PLAYLIST_TOPIC_ICON
  return TOPIC_ICON_NAMES[topicId] ?? FALLBACK_TOPIC_ICON
}
