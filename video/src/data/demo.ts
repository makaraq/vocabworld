import type { ExampleSentence } from '../app-ui/ExampleSentencesModal'
import type { LeaderboardEntry } from '../app-ui/LeaderboardModal'
import type { PlaylistRow } from '../app-ui/PlaylistSelectModal'
import { APP_VOCABULARY } from '../generated/app-vocabulary'

// What the film shows that is not the app's code: the hook's words, and
// sample content for screens whose data lives in the app's database.

const HELLO = APP_VOCABULARY[1][0]
if (HELLO.english !== 'hello') throw new Error('Greetings no longer starts with "hello"')

/**
 * "hello" in the order the hook flips through it, each as the app's
 * Greetings topic has it (public/data/vocabulary.json), lowercased as the
 * flashcards show words. German "hallo" is left out on purpose: it reads
 * too much like the English. French lands last.
 */
export const HELLO_WORDS: { code: string; language: string; word: string }[] = [
  { code: 'en', language: 'English', word: 'hello' },
  { code: 'es', language: 'Spanish', word: 'hola' },
  { code: 'it', language: 'Italian', word: 'ciao' },
  { code: 'ja', language: 'Japanese', word: 'こんにちは' },
  { code: 'tr', language: 'Turkish', word: 'merhaba' },
  { code: 'ko', language: 'Korean', word: '안녕하세요' },
  { code: 'pl', language: 'Polish', word: 'cześć' },
  { code: 'pt', language: 'Portuguese', word: 'olá' },
  { code: 'ru', language: 'Russian', word: 'привет' },
  { code: 'zh', language: 'Chinese', word: '你好' },
  { code: 'hi', language: 'Hindi', word: 'नमस्ते' },
  { code: 'ar', language: 'Arabic', word: 'مرحبا' },
  { code: 'fr', language: 'French', word: 'bonjour' },
]

/**
 * Sample example sentences for "gauche" (left). The app's come from its
 * example_sentences table, three per word.
 */
export const GAUCHE_SENTENCES: ExampleSentence[] = [
  { target: 'Tournez à gauche au feu.', native: 'Turn left at the traffic light.' },
  { target: 'La gare est sur votre gauche.', native: 'The station is on your left.' },
  { target: 'Prenez la deuxième rue à gauche.', native: 'Take the second street on the left.' },
]

/** Sample playlists for French learned from English. */
export const PLAYLISTS: PlaylistRow[] = [
  { id: 'paris', name: 'Paris trip', wordCount: 28 },
  { id: 'around', name: 'Getting around', wordCount: 12 },
  { id: 'everyday', name: 'Everyday French', wordCount: 41 },
]

/**
 * A sample weekly French leaderboard. The seeds are the ones the landing
 * page draws its smileys from; the user is 8th, as on the ACCOUNT page.
 */
export const LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, firstName: 'Mia', avatarSeed: 'k3p1', wordsPlayed: 2140, streak: 41 },
  { rank: 2, firstName: 'Lucas', avatarSeed: 'w2x8', wordsPlayed: 1986, streak: 35 },
  { rank: 3, firstName: 'Aiko', avatarSeed: '9fz2', wordsPlayed: 1702, streak: 28 },
  { rank: 4, firstName: 'Omar', avatarSeed: 'q7m4', wordsPlayed: 1455, streak: 22 },
  { rank: 5, firstName: 'Sofia', avatarSeed: 'm8d3', wordsPlayed: 1311, streak: 19 },
  { rank: 6, firstName: 'Léa', avatarSeed: 'z4v7', wordsPlayed: 1090, streak: 16 },
  { rank: 7, firstName: 'Noah', avatarSeed: 'p5t9', wordsPlayed: 1032, streak: 14 },
  { rank: 8, firstName: 'Alex', avatarSeed: 'a1x3', wordsPlayed: 968, streak: 12, isCurrentUser: true },
]
