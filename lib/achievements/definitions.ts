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
  { id: 'words_10', title: 'Word Apprentice', description: 'Learn 10 words', icon: 'solar:notebook-bold', category: 'words', tier: 'bronze', threshold: 10, metric: 'wordsLearned' },
  { id: 'words_50', title: 'Word Adept', description: 'Learn 50 words', icon: 'solar:book-bookmark-bold', category: 'words', tier: 'silver', threshold: 50, metric: 'wordsLearned' },
  { id: 'words_100', title: 'Word Master', description: 'Learn 100 words', icon: 'solar:book-2-bold', category: 'words', tier: 'gold', threshold: 100, metric: 'wordsLearned' },
  { id: 'words_500', title: 'Word Sage', description: 'Learn 500 words', icon: 'solar:diploma-bold', category: 'words', tier: 'platinum', threshold: 500, metric: 'wordsLearned' },
  { id: 'words_1000', title: 'Word Legend', description: 'Learn 1,000 words', icon: 'solar:crown-bold', category: 'words', tier: 'diamond', threshold: 1000, metric: 'wordsLearned' },

  // Topics completed
  { id: 'topics_1', title: 'First Topic', description: 'Complete your first topic', icon: 'solar:check-circle-bold', category: 'topics', tier: 'bronze', threshold: 1, metric: 'topicsCompleted' },
  { id: 'topics_5', title: 'Topic Explorer', description: 'Complete 5 topics', icon: 'solar:medal-ribbon-star-bold', category: 'topics', tier: 'silver', threshold: 5, metric: 'topicsCompleted' },
  { id: 'topics_10', title: 'Topic Conqueror', description: 'Complete 10 topics', icon: 'solar:cup-star-bold', category: 'topics', tier: 'gold', threshold: 10, metric: 'topicsCompleted' },
  { id: 'topics_25', title: 'Topic Champion', description: 'Complete 25 topics', icon: 'solar:cup-bold', category: 'topics', tier: 'platinum', threshold: 25, metric: 'topicsCompleted' },
  { id: 'topics_44', title: 'Completionist', description: 'Complete every topic in a language', icon: 'solar:medal-star-bold', category: 'topics', tier: 'diamond', threshold: 44, metric: 'topicsCompleted' },

  // Streaks
  { id: 'streak_3', title: 'Sparked', description: '3-day learning streak', icon: 'solar:fire-bold', category: 'streak', tier: 'bronze', threshold: 3, metric: 'currentStreak' },
  { id: 'streak_7', title: 'On a Roll', description: '7-day learning streak', icon: 'solar:fire-square-bold', category: 'streak', tier: 'silver', threshold: 7, metric: 'currentStreak' },
  { id: 'streak_14', title: 'Two Weeks Strong', description: '14-day learning streak', icon: 'solar:fire-bold', category: 'streak', tier: 'gold', threshold: 14, metric: 'currentStreak' },
  { id: 'streak_30', title: 'Streak Master', description: '30-day learning streak', icon: 'solar:flame-bold', category: 'streak', tier: 'platinum', threshold: 30, metric: 'currentStreak' },
  { id: 'streak_100', title: 'Unstoppable', description: '100-day learning streak', icon: 'solar:bolt-bold', category: 'streak', tier: 'diamond', threshold: 100, metric: 'currentStreak' },

  // Section clears
  { id: 'section_first_aid_kit', title: 'First Aid Expert', description: 'Complete every topic in First Aid Kit', icon: 'solar:medical-kit-bold', category: 'section', tier: 'gold', threshold: 6, metric: 'sectionTopicsCompleted', sectionKey: 'first_aid_kit' },
  { id: 'section_daily_life', title: 'Everyday Pro', description: 'Complete every topic in Daily Life', icon: 'solar:tea-cup-bold', category: 'section', tier: 'gold', threshold: 8, metric: 'sectionTopicsCompleted', sectionKey: 'daily_life' },
  { id: 'section_work_school', title: 'Scholar', description: 'Complete every topic in Work & School', icon: 'solar:square-academic-cap-bold', category: 'section', tier: 'gold', threshold: 8, metric: 'sectionTopicsCompleted', sectionKey: 'work_school' },
  { id: 'section_personal_social', title: 'Social Butterfly', description: 'Complete every topic in Personal & Social', icon: 'solar:hearts-bold', category: 'section', tier: 'gold', threshold: 6, metric: 'sectionTopicsCompleted', sectionKey: 'personal_social' },
  { id: 'section_culture_society', title: 'Worldly', description: 'Complete every topic in Culture & Society', icon: 'solar:planet-bold', category: 'section', tier: 'gold', threshold: 8, metric: 'sectionTopicsCompleted', sectionKey: 'culture_society' },
  { id: 'section_professional', title: 'Pro Speaker', description: 'Complete every topic in Professional', icon: 'solar:case-bold', category: 'section', tier: 'gold', threshold: 8, metric: 'sectionTopicsCompleted', sectionKey: 'professional' },

  // Languages
  { id: 'languages_2', title: 'Bilingual', description: 'Start learning a 2nd language', icon: 'solar:translate-bold', category: 'language', tier: 'silver', threshold: 2, metric: 'languagesStarted' },
  { id: 'languages_5', title: 'Polyglot', description: 'Start learning 5 languages', icon: 'solar:global-bold', category: 'language', tier: 'platinum', threshold: 5, metric: 'languagesStarted' },

  // Time-of-day & daily goal (event-only, no metric)
  { id: 'goal_daily', title: 'Daily Dose', description: 'Hit the 20-word daily goal', icon: 'solar:target-bold', category: 'time', tier: 'silver', threshold: 20, metric: 'wordsToday' },
  { id: 'time_early_bird', title: 'Early Bird', description: 'Practice before 7 AM', icon: 'solar:sun-2-bold', category: 'time', tier: 'bronze', threshold: 1 },
  { id: 'time_night_owl', title: 'Night Owl', description: 'Practice after midnight', icon: 'solar:moon-stars-bold', category: 'time', tier: 'bronze', threshold: 1 },
  { id: 'time_weekend', title: 'Weekend Warrior', description: 'Practice on a weekend', icon: 'solar:calendar-mark-bold', category: 'time', tier: 'bronze', threshold: 1 },
]

export const ACHIEVEMENTS_BY_ID: Record<string, AchievementDef> =
  Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]))
