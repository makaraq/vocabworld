// Achievement & badge definitions for Sprind.
// Pure data — no React, no side effects. Imported by the engine and UI.

export type AchievementCategory =
  | 'words'
  | 'topics'
  | 'streak'
  | 'section'
  | 'language'
  | 'time'
  | 'special'

export type Tier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'

export interface AchievementDef {
  id: string
  title: string
  description: string
  icon: string // iconify name
  category: AchievementCategory
  tier: Tier
  /** Numeric goal — used by the progress bar and evaluator. */
  threshold: number
  /** Stat key from EvaluationContext that this achievement checks (when applicable). */
  metric?:
    | 'wordsLearned'
    | 'topicsCompleted'
    | 'currentStreak'
    | 'languagesStarted'
    | 'wordsToday'
    | 'sectionTopicsCompleted'
  /** Optional section id for section-clear achievements. */
  sectionKey?: string
}

const TIER_GRADIENT: Record<Tier, string> = {
  bronze: 'from-amber-700 to-orange-500',
  silver: 'from-slate-400 to-slate-200',
  gold: 'from-yellow-500 to-amber-300',
  platinum: 'from-cyan-300 to-blue-400',
  diamond: 'from-fuchsia-400 to-indigo-500',
}

export function tierGradient(tier: Tier): string {
  return TIER_GRADIENT[tier]
}

// Section keys mirror the language-selector sections so we can detect
// "section cleared" achievements without coupling to UI strings.
export const SECTION_TOPIC_IDS: Record<string, number[]> = {
  first_aid_kit: [1, 2, 3, 4, 5, 6],
  daily_life: [7, 8, 9, 10, 11, 12, 13, 14],
  work_school: [21, 22, 23, 24, 25, 26, 27, 28],
  personal_social: [15, 16, 17, 18, 19, 20],
  culture_society: [29, 30, 31, 32, 33, 34, 35, 36],
  professional: [37, 38, 39, 40, 41, 42, 43, 44],
}

// Section index ranges into the topics[] array as ordered in the UI.
// Order matters: this is the order the user actually swipes through sections.
// Each entry: [start, end) into the topics array (matches `topics.slice(...)`
// calls in language-selector.tsx so the "next topic" suggestion mirrors what
// the user sees in the menu).
export interface SectionRange {
  key: string
  start: number
  end: number
}
export const SECTION_INDEX_RANGES: SectionRange[] = [
  { key: 'first_aid_kit', start: 0, end: 6 },
  { key: 'daily_life', start: 6, end: 14 },
  { key: 'work_school', start: 20, end: 28 },
  { key: 'personal_social', start: 14, end: 20 },
  { key: 'culture_society', start: 28, end: 36 },
  { key: 'professional', start: 36, end: 44 },
]

export const SECTION_LABEL: Record<string, string> = {
  first_aid_kit: 'First Aid Kit',
  daily_life: 'Daily Life',
  work_school: 'Work & School',
  personal_social: 'Personal & Social',
  culture_society: 'Culture & Society',
  professional: 'Professional',
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // Words learned
  { id: 'words_1', title: 'First Steps', description: 'Learn your very first word', icon: 'solar:walking-bold', category: 'words', tier: 'bronze', threshold: 1, metric: 'wordsLearned' },
  { id: 'words_5', title: 'Getting Started', description: 'Learn 5 words', icon: 'solar:pen-new-square-bold', category: 'words', tier: 'bronze', threshold: 5, metric: 'wordsLearned' },
  { id: 'words_10', title: 'Word Apprentice', description: 'Learn 10 words', icon: 'solar:notebook-bold', category: 'words', tier: 'bronze', threshold: 10, metric: 'wordsLearned' },
  { id: 'words_25', title: 'Quick Learner', description: 'Learn 25 words', icon: 'solar:pen-bold', category: 'words', tier: 'silver', threshold: 25, metric: 'wordsLearned' },
  { id: 'words_50', title: 'Word Adept', description: 'Learn 50 words', icon: 'solar:book-bookmark-bold', category: 'words', tier: 'silver', threshold: 50, metric: 'wordsLearned' },
  { id: 'words_100', title: 'Word Master', description: 'Learn 100 words', icon: 'solar:book-2-bold', category: 'words', tier: 'gold', threshold: 100, metric: 'wordsLearned' },
  { id: 'words_250', title: 'Wordsmith', description: 'Learn 250 words', icon: 'solar:notebook-square-bold', category: 'words', tier: 'gold', threshold: 250, metric: 'wordsLearned' },
  { id: 'words_500', title: 'Word Sage', description: 'Learn 500 words', icon: 'solar:diploma-bold', category: 'words', tier: 'platinum', threshold: 500, metric: 'wordsLearned' },
  { id: 'words_1000', title: 'Word Legend', description: 'Learn 1,000 words', icon: 'solar:crown-bold', category: 'words', tier: 'platinum', threshold: 1000, metric: 'wordsLearned' },
  { id: 'words_2500', title: 'Word Virtuoso', description: 'Learn 2,500 words', icon: 'solar:crown-star-bold', category: 'words', tier: 'diamond', threshold: 2500, metric: 'wordsLearned' },
  { id: 'words_5000', title: 'Linguist', description: 'Learn 5,000 words', icon: 'solar:medal-ribbons-star-bold', category: 'words', tier: 'diamond', threshold: 5000, metric: 'wordsLearned' },
  { id: 'words_10000', title: 'Word God', description: 'Learn 10,000 words', icon: 'solar:stars-bold', category: 'words', tier: 'diamond', threshold: 10000, metric: 'wordsLearned' },

  // Topics completed
  { id: 'topics_1', title: 'First Topic', description: 'Complete your first topic', icon: 'solar:check-circle-bold', category: 'topics', tier: 'bronze', threshold: 1, metric: 'topicsCompleted' },
  { id: 'topics_2', title: 'Double Up', description: 'Complete 2 topics', icon: 'solar:checklist-minimalistic-bold', category: 'topics', tier: 'bronze', threshold: 2, metric: 'topicsCompleted' },
  { id: 'topics_5', title: 'Topic Explorer', description: 'Complete 5 topics', icon: 'solar:medal-ribbon-star-bold', category: 'topics', tier: 'silver', threshold: 5, metric: 'topicsCompleted' },
  { id: 'topics_10', title: 'Topic Conqueror', description: 'Complete 10 topics', icon: 'solar:cup-star-bold', category: 'topics', tier: 'gold', threshold: 10, metric: 'topicsCompleted' },
  { id: 'topics_15', title: 'Subject Buff', description: 'Complete 15 topics', icon: 'solar:notes-bold', category: 'topics', tier: 'gold', threshold: 15, metric: 'topicsCompleted' },
  { id: 'topics_20', title: 'Topic Tactician', description: 'Complete 20 topics', icon: 'solar:cup-first-bold', category: 'topics', tier: 'platinum', threshold: 20, metric: 'topicsCompleted' },
  { id: 'topics_25', title: 'Topic Champion', description: 'Complete 25 topics', icon: 'solar:cup-bold', category: 'topics', tier: 'platinum', threshold: 25, metric: 'topicsCompleted' },
  { id: 'topics_35', title: 'Almost There', description: 'Complete 35 topics', icon: 'solar:flag-bold', category: 'topics', tier: 'platinum', threshold: 35, metric: 'topicsCompleted' },
  { id: 'topics_44', title: 'Completionist', description: 'Complete every topic in a language', icon: 'solar:medal-star-bold', category: 'topics', tier: 'diamond', threshold: 44, metric: 'topicsCompleted' },

  // Streaks
  { id: 'streak_3', title: 'Sparked', description: '3-day learning streak', icon: 'solar:fire-bold', category: 'streak', tier: 'bronze', threshold: 3, metric: 'currentStreak' },
  { id: 'streak_7', title: 'On a Roll', description: '7-day learning streak', icon: 'solar:fire-square-bold', category: 'streak', tier: 'silver', threshold: 7, metric: 'currentStreak' },
  { id: 'streak_14', title: 'Two Weeks Strong', description: '14-day learning streak', icon: 'solar:fire-bold', category: 'streak', tier: 'gold', threshold: 14, metric: 'currentStreak' },
  { id: 'streak_21', title: 'Habit Formed', description: '21-day learning streak', icon: 'solar:calendar-add-bold', category: 'streak', tier: 'gold', threshold: 21, metric: 'currentStreak' },
  { id: 'streak_30', title: 'Streak Master', description: '30-day learning streak', icon: 'solar:flame-bold', category: 'streak', tier: 'platinum', threshold: 30, metric: 'currentStreak' },
  { id: 'streak_50', title: 'Iron Will', description: '50-day learning streak', icon: 'solar:shield-star-bold', category: 'streak', tier: 'platinum', threshold: 50, metric: 'currentStreak' },
  { id: 'streak_100', title: 'Unstoppable', description: '100-day learning streak', icon: 'solar:bolt-bold', category: 'streak', tier: 'diamond', threshold: 100, metric: 'currentStreak' },
  { id: 'streak_200', title: 'Phenomenon', description: '200-day learning streak', icon: 'solar:meteor-bold', category: 'streak', tier: 'diamond', threshold: 200, metric: 'currentStreak' },
  { id: 'streak_365', title: 'Year-Round', description: '365-day learning streak', icon: 'solar:calendar-bold', category: 'streak', tier: 'diamond', threshold: 365, metric: 'currentStreak' },

  // Section clears
  { id: 'section_first_aid_kit', title: 'First Aid Expert', description: 'Complete every topic in First Aid Kit', icon: 'solar:medical-kit-bold', category: 'section', tier: 'gold', threshold: 6, metric: 'sectionTopicsCompleted', sectionKey: 'first_aid_kit' },
  { id: 'section_daily_life', title: 'Everyday Pro', description: 'Complete every topic in Daily Life', icon: 'solar:tea-cup-bold', category: 'section', tier: 'gold', threshold: 8, metric: 'sectionTopicsCompleted', sectionKey: 'daily_life' },
  { id: 'section_work_school', title: 'Scholar', description: 'Complete every topic in Work & School', icon: 'solar:square-academic-cap-bold', category: 'section', tier: 'gold', threshold: 8, metric: 'sectionTopicsCompleted', sectionKey: 'work_school' },
  { id: 'section_personal_social', title: 'Social Butterfly', description: 'Complete every topic in Personal & Social', icon: 'solar:hearts-bold', category: 'section', tier: 'gold', threshold: 6, metric: 'sectionTopicsCompleted', sectionKey: 'personal_social' },
  { id: 'section_culture_society', title: 'Worldly', description: 'Complete every topic in Culture & Society', icon: 'solar:planet-bold', category: 'section', tier: 'gold', threshold: 8, metric: 'sectionTopicsCompleted', sectionKey: 'culture_society' },
  { id: 'section_professional', title: 'Pro Speaker', description: 'Complete every topic in Professional', icon: 'solar:case-bold', category: 'section', tier: 'gold', threshold: 8, metric: 'sectionTopicsCompleted', sectionKey: 'professional' },

  // Languages
  { id: 'languages_2', title: 'Bilingual', description: 'Start learning a 2nd language', icon: 'solar:translate-bold', category: 'language', tier: 'silver', threshold: 2, metric: 'languagesStarted' },
  { id: 'languages_3', title: 'Trilingual', description: 'Start learning a 3rd language', icon: 'solar:dialog-bold', category: 'language', tier: 'gold', threshold: 3, metric: 'languagesStarted' },
  { id: 'languages_5', title: 'Polyglot', description: 'Start learning 5 languages', icon: 'solar:global-bold', category: 'language', tier: 'platinum', threshold: 5, metric: 'languagesStarted' },
  { id: 'languages_7', title: 'Hyperglot', description: 'Start learning 7 languages', icon: 'solar:earth-bold', category: 'language', tier: 'diamond', threshold: 7, metric: 'languagesStarted' },
  { id: 'languages_10', title: 'World Citizen', description: 'Start learning 10 languages', icon: 'solar:planet-2-bold', category: 'language', tier: 'diamond', threshold: 10, metric: 'languagesStarted' },

  // Daily goals (wordsToday metric)
  { id: 'goal_daily_5', title: 'Warm-Up', description: 'Learn 5 words in a day', icon: 'solar:cup-hot-bold', category: 'time', tier: 'bronze', threshold: 5, metric: 'wordsToday' },
  { id: 'goal_daily_10', title: 'Getting Warmed Up', description: 'Learn 10 words in a day', icon: 'solar:dumbbells-bold', category: 'time', tier: 'bronze', threshold: 10, metric: 'wordsToday' },
  { id: 'goal_daily', title: 'Daily Dose', description: 'Hit the 20-word daily goal', icon: 'solar:target-bold', category: 'time', tier: 'silver', threshold: 20, metric: 'wordsToday' },
  { id: 'goal_daily_50', title: 'Double Dose', description: 'Learn 50 words in a day', icon: 'solar:rocket-bold', category: 'time', tier: 'gold', threshold: 50, metric: 'wordsToday' },
  { id: 'goal_daily_100', title: 'Marathon Day', description: 'Learn 100 words in a day', icon: 'solar:running-bold', category: 'time', tier: 'platinum', threshold: 100, metric: 'wordsToday' },

  // Time-of-day (event-only, no metric)
  { id: 'time_early_bird', title: 'Early Bird', description: 'Practice between 4 AM and 8 AM', icon: 'solar:sun-2-bold', category: 'time', tier: 'bronze', threshold: 1 },
  { id: 'time_lunch', title: 'Lunch & Learn', description: 'Practice between 12 PM and 2 PM', icon: 'solar:plate-bold', category: 'time', tier: 'bronze', threshold: 1 },
  { id: 'time_night_owl', title: 'Night Owl', description: 'Practice between 10 PM and 4 AM', icon: 'solar:moon-stars-bold', category: 'time', tier: 'bronze', threshold: 1 },
  { id: 'time_weekend', title: 'Weekend Warrior', description: 'Practice on a weekend', icon: 'solar:calendar-mark-bold', category: 'time', tier: 'bronze', threshold: 1 },
]

export const ACHIEVEMENTS_BY_ID: Record<string, AchievementDef> =
  Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]))
