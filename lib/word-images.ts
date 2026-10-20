// Flashcard illustrations, keyed by vocabulary id. The art is language-neutral,
// so one image serves a word in every language. Files live in
// public/word-images/<id>.webp (transparent, trimmed, long side 640px). Listing
// ids here, rather than probing the URL, means a word without art never fires
// a 404.
const WORD_IMAGE_IDS = new Set<number>([
  // Greetings (topic 1): every word. "catch you later" (2712) and "see you
  // soon" (2715) had no art and were unlinked from the topic (topic_id null).
  2682, // hello
  2683, // good morning
  2684, // good evening
  2685, // good night
  2686, // my name is Alex
  2687, // what is your name?
  2688, // nice to meet you
  2689, // how are you?
  2690, // I'm fine, thank you
  2692, // please
  2693, // thank you
  2694, // yes
  2695, // no
  2696, // okay
  2697, // sure
  2698, // you're welcome
  2699, // excuse me
  2700, // sorry
  2701, // no problem
  2702, // welcome
  2703, // come in
  2704, // how do you do?
  2705, // pleasure to meet you
  2708, // what's up?
  2709, // long time no see
  2710, // how's it going?
  2711, // glad to see you
  2713, // bye
  2714, // goodbye
  2716, // talk to you later
  2717, // have a good evening
])

export function getWordImageUrl(vocabularyId: unknown): string | null {
  const id = Number(vocabularyId)
  return WORD_IMAGE_IDS.has(id) ? `/word-images/${id}.webp` : null
}
