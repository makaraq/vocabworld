// Context annotations fed to Gemini by scripts/generate-ui-translations.ts.
// NEVER imported by app code — not part of the bundle.
//
// namespaceContext: where a group of strings appears + tone/length guidance.
// uiStringContext: per-key overrides for strings that need extra care
// (character limits, placeholders that must not move, legal text, etc.)

import type { UiKey } from '../lib/i18n/ui-strings/en'

/** Keyed by the first dot-segment of the string key (e.g. 'settings'). */
export const namespaceContext: Record<string, string> = {
  common:
    'Generic buttons/labels reused across the app (Done, Cancel, Close, Loading).',
  tutorial:
    'Onboarding coach-mark tour shown over the app UI. Friendly, encouraging teacher voice. Titles max ~30 chars; bodies 1-2 short sentences. Button labels (Skip/Back/Next/Got it) must stay very short.',
  sentences:
    'Modal showing example sentences for a vocabulary word.',
  offlineBanner:
    'Slim banner at the top of the screen when the device loses internet.',
  badges:
    'Achievements/badges gallery. Gamified, celebratory tone. Category headers are short (1-2 words).',
  notifPrompt:
    'Modal asking the user to enable push notifications. Persuasive but not pushy.',
  review:
    'Small dashboard card showing how many words are due for spaced-repetition review.',
  quiz:
    'Multiple-choice vocabulary quiz. Short punchy headings; result lines are celebratory.',
  leaderboard:
    'Weekly/all-time leaderboard modal. "plays" counts words played. Keep tab labels short (fit in half-width buttons).',
  progress:
    'Progress dashboard: stat tiles and a per-topic completion modal. Stat tile labels must stay short (~15 chars) to fit small cards.',
  achievements:
    'Badge titles and descriptions (50 badges). Titles are punchy names (1-3 words, may be idiomatic — translate the SPIRIT, not literally, e.g. "Word God", "Night Owl"). Descriptions state the requirement plainly.',
  congrats:
    'Random congratulation line shown above a topic name when the user completes the topic. Each line leads INTO the topic name shown on the next line, e.g. "Nice work — you finished" / "Greetings". Keep that lead-in structure.',
  topicComplete:
    'Topic-completed celebration modal. {topic} is a topic name like "Greetings".',
  paywall:
    'Subscription paywall. Motivating but honest. CTA buttons must stay short enough for one line on a phone (~28 chars).',
  account:
    'Manage-account sheet: profile, subscription, notifications, delete-account flow. Clear and calm; the delete flow must be unambiguous.',
  offline:
    'Offline download manager inside the account sheet. Technical but friendly; status pills (Downloaded/Downloading/Paused) max ~14 chars.',
  searchWord:
    'Dictionary-style word search screen ("Add word").',
  playlistSelect:
    'Small modal to pick/create a playlist when saving a word.',
  notif:
    'PUSH NOTIFICATION copy (title + body pairs). Must be motivating, natural, and feel native — this is the most visible copy in the app. Titles ~40 chars max, bodies ~90 chars max. Keep emoji exactly as in the source.',
  myWords:
    '"My Words" section: word search entry card and the user\'s playlists.',
  accountSection: 'Button on the account dashboard.',
  sections: 'Navigation dots between app sections; tiny labels under the dots.',
  settings:
    'Audio/playback settings panel used while learning. Toggle labels 1-4 words; descriptions one short sentence. Slider unit strings ({n}s, {n}x, {n} words) must stay COMPACT.',
  createPlaylist: 'Modal for creating a new word playlist (name max 22 chars).',
  learning:
    'The main learning view (flashcards + audio controls). Mostly accessibility labels read by screen readers.',
}

/** Per-key annotations that override/extend the namespace context. */
export const uiStringContext: Partial<Record<UiKey, string>> = {
  'settings.seconds':
    'Compact seconds abbreviation shown at slider ends, e.g. "0.2s", "10s". Use the standard short form for seconds in this language. Keep to a few characters.',
  'settings.times':
    'Compact repeat-count marker, e.g. "1x", "5x". Keep to a few characters.',
  'paywall.legal.trial':
    'App-Store-required legal disclosure under the purchase button. Must remain factually accurate. Keep the \\n line breaks at natural phrase boundaries (3 lines).',
  'paywall.legal.yearly':
    'App-Store-required legal disclosure. Keep factual; keep 3 lines via \\n.',
  'paywall.legal.monthly':
    'App-Store-required legal disclosure. Keep factual; keep 2 lines via \\n.',
  'paywall.store.web':
    'Inserted into "Cancel in {storeName}." — lowercase phrase, not a title.',
  'paywall.title.trial':
    'Big headline, 2 lines via \\n. FREE may be uppercase for emphasis if natural in this language.',
  'paywall.title.noTrial': 'Big headline, 2 lines via \\n. "Sprind" is the app name — never translate it.',
  'paywall.plan.trialBadge': 'Tiny badge on the yearly plan card. UPPERCASE if the language supports it. Max ~14 chars.',
  'paywall.plan.perMonth': 'Suffix after a price, e.g. "$5.99 /mo". Use the shortest natural per-month abbreviation.',
  'account.delete.subscriptionWarning':
    'Warning shown before account deletion. Keep every <b>…</b> pair intact around the same content. "Apple ID → Subscriptions" and "Google Play → Subscriptions" are OS navigation paths — translate the words but keep the → arrows.',
  'account.delete.confirmHint':
    '{word} is the literal English word "delete" the user must type — do NOT translate the placeholder or add articles that break it. Keep <b>{word}</b> intact.',
  'offline.idleDesc': '{size} is a size label like "≈200 MB".',
  'offline.eta.underMinute': 'Suffix after a byte count, starts with "· ".',
  'offline.eta.minutes': 'Suffix after a byte count, starts with "· ". {n} = minutes.',
  'offline.other.paused': '{size} is a byte size like "120 MB".',
  'searchWord.placeholder': '{language} is a language name, e.g. "Spanish".',
  'searchWord.noResults': '{word} is the word the user typed; keep the quotes around it (or the natural quote marks for this language).',
  'leaderboard.learnerHash': 'Anonymous user display name; {hash} is a 4-char code. Keep the # symbol.',
  'leaderboard.plays': 'Very short unit label after a number, meaning "words played".',
  'quiz.topic.title': '{topic} is a topic name like "Greetings". Natural word order for this language (e.g. "Quiz: {topic}" is fine).',
  'topicComplete.takeQuiz': '{topic} is a topic name. Button label — keep reasonably short.',
  'topicComplete.practiceAgain': '{topic} is a topic name. Button label — keep reasonably short.',
  'tutorial.stepOf': 'Step indicator, e.g. "1 of 3".',
  'quiz.progress': 'Question counter, e.g. "3 of 20".',
  'sentences.counter': 'Position indicator, e.g. "1 / 3". Usually needs no translation.',
  'badges.border.completedTimes': 'How many times a topic was completed, e.g. "3x completed". Keep it compact.',
  'notif.trial.body': 'Reminder that the paid subscription starts when the trial ends. "Settings" = the device settings app.',
  'account.renewsOn': '{date} is a formatted date like "Jan 5, 2027".',
  'progress.aria.rank': 'Screen-reader label; {rank} is a number. Keep the # if natural.',
  'myWords.searchWordDesc': 'Subtitle under "Search Word" card. The & may be written as a word.',
}
