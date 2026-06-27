/**
 * Sprind Progress Tracking Service
 * Handles all progress tracking logic server-side
 */

import { createClient } from '@supabase/supabase-js'

// Lazily create the service-role client so that importing this module during
// the Next.js build (page-data collection) does not crash when Supabase env
// vars are absent in the CI environment.
let _supabase: ReturnType<typeof createClient<any>> | null = null
function getSupabase() {
  if (!_supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    _supabase = createClient(supabaseUrl, supabaseServiceKey)
  }
  return _supabase
}

export interface ProgressStats {
  wordsLearned: number
  wordsLearnedToday: number
  dailyLoginStreak: number
  topicsCompleted: number
  languageCompletionPercentage: number
  totalWordsInLanguage: number
}

export interface TopicProgress {
  topicId: number
  totalWords: number
  wordsLearned: number
  isCompleted: boolean
  completionPercentage: number
}

class ProgressService {
  /**
   * Track a word being played by the user
   * This is the main entry point for progress tracking
   */
  async trackWordPlayed(
    userId: string,
    vocabularyId: number,
    targetLanguageCode: string,
    // When a play happened, ISO string. Offline events replayed on reconnect
    // pass their original time so leaderboard weekly windows and daily counts
    // land on the right day; live plays omit it and default to now.
    playedAt?: string
  ): Promise<{ success: boolean; error?: string; isNewWord?: boolean }> {
    try {
      const playedTs = playedAt || new Date().toISOString()
      const now = new Date().toISOString()
      // Check if word already exists in progress
      const { data: existing, error: checkError } = await getSupabase()
        .from('user_word_progress')
        .select('id, play_count')
        .eq('user_id', userId)
        .eq('vocabulary_id', vocabularyId)
        .eq('target_language_code', targetLanguageCode)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 means no rows found, which is fine
        throw checkError
      }

      if (existing) {
        // Word already played - update play count and timestamp
        const { error: updateError } = await getSupabase()
          .from('user_word_progress')
          .update({
            last_played_at: playedTs,
            play_count: existing.play_count + 1,
            updated_at: now
          })
          .eq('id', existing.id)

        if (updateError) throw updateError
        return { success: true, isNewWord: false }
      } else {
        // First time playing this word - insert new record
        // Triggers will automatically:
        // 1. Update topic completion
        // 2. Update language progress
        // 3. Update daily progress
        const { error: insertError } = await getSupabase()
          .from('user_word_progress')
          .insert({
            user_id: userId,
            vocabulary_id: vocabularyId,
            target_language_code: targetLanguageCode,
            first_played_at: playedTs,
            last_played_at: playedTs,
            play_count: 1,
            created_at: now,
            updated_at: now
          })

        if (insertError) throw insertError
        return { success: true, isNewWord: true }
      }
    } catch (error: any) {
      console.error('Error tracking word:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Idempotency for offline replay: a client generates a stable clientEventId
   * per word-played event. We record processed ids so a replayed/retried event
   * (ambiguous reconnect) never double-counts play_count / leaderboard score.
   */
  async isEventProcessed(clientEventId: string): Promise<boolean> {
    try {
      const { data, error } = await getSupabase()
        .from('processed_progress_events')
        .select('client_event_id')
        .eq('client_event_id', clientEventId)
        .single()
      if (error && error.code !== 'PGRST116') throw error
      return !!data
    } catch (error) {
      console.error('Error checking processed event:', error)
      // Fail open (treat as unprocessed) — a missed dedup is better than
      // dropping a real play because the dedup table was briefly unavailable.
      return false
    }
  }

  async markEventProcessed(clientEventId: string, userId: string): Promise<void> {
    try {
      await getSupabase()
        .from('processed_progress_events')
        .insert({ client_event_id: clientEventId, user_id: userId })
    } catch (error) {
      // Unique-violation just means a concurrent request already marked it.
      console.error('Error marking processed event:', error)
    }
  }

  /**
   * Get comprehensive progress stats for a user and target language
   */
  async getProgressStats(
    userId: string,
    targetLanguageCode: string
  ): Promise<ProgressStats> {
    try {
      // Get language progress summary
      const { data: languageProgress } = await getSupabase()
        .from('user_language_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('target_language_code', targetLanguageCode)
        .single()

      // Get daily progress for today
      const today = new Date().toISOString().split('T')[0]
      const { data: dailyProgress } = await getSupabase()
        .from('user_daily_progress')
        .select('words_learned_count')
        .eq('user_id', userId)
        .eq('target_language_code', targetLanguageCode)
        .eq('activity_date', today)
        .single()

      // Get login streak
      const { data: loginStreak } = await getSupabase()
        .from('user_login_streaks')
        .select('current_streak')
        .eq('user_id', userId)
        .single()

      // Get total words in database
      const { count: totalWords } = await getSupabase()
        .from('vocabulary')
        .select('*', { count: 'exact', head: true })

      // Count completed topics from topic completion table
      const { count: completedTopics } = await getSupabase()
        .from('user_topic_completion')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('target_language_code', targetLanguageCode)
        .eq('is_completed', true)

      return {
        wordsLearned: languageProgress?.total_words_learned || 0,
        wordsLearnedToday: dailyProgress?.words_learned_count || 0,
        dailyLoginStreak: loginStreak?.current_streak || 0,
        topicsCompleted: completedTopics || 0,
        languageCompletionPercentage: parseFloat(languageProgress?.completion_percentage || '0'),
        totalWordsInLanguage: totalWords || 0
      }
    } catch (error) {
      console.error('Error getting progress stats:', error)
      // Return default stats if there's an error
      return {
        wordsLearned: 0,
        wordsLearnedToday: 0,
        dailyLoginStreak: 0,
        topicsCompleted: 0,
        languageCompletionPercentage: 0,
        totalWordsInLanguage: 0
      }
    }
  }

  /**
   * Get progress for a specific topic
   */
  async getTopicProgress(
    userId: string,
    topicId: number,
    targetLanguageCode: string
  ): Promise<TopicProgress | null> {
    try {
      const { data, error } = await getSupabase()
        .from('user_topic_completion')
        .select('*')
        .eq('user_id', userId)
        .eq('topic_id', topicId)
        .eq('target_language_code', targetLanguageCode)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (!data) {
        // Topic not started yet - get total words count
        const { count } = await getSupabase()
          .from('vocabulary')
          .select('*', { count: 'exact', head: true })
          .eq('topic_id', topicId)

        return {
          topicId,
          totalWords: count || 0,
          wordsLearned: 0,
          isCompleted: false,
          completionPercentage: 0
        }
      }

      return {
        topicId: data.topic_id,
        totalWords: data.total_words,
        wordsLearned: data.words_learned,
        isCompleted: data.is_completed,
        completionPercentage: (data.words_learned / data.total_words) * 100
      }
    } catch (error) {
      console.error('Error getting topic progress:', error)
      return null
    }
  }

  /**
   * Get progress for all topics for a user and language
   */
  async getAllTopicProgress(
    userId: string,
    targetLanguageCode: string
  ): Promise<Map<number, TopicProgress>> {
    try {
      const { data, error } = await getSupabase()
        .from('user_topic_completion')
        .select('*')
        .eq('user_id', userId)
        .eq('target_language_code', targetLanguageCode)

      if (error) throw error

      const progressMap = new Map<number, TopicProgress>()
      
      data?.forEach(item => {
        progressMap.set(item.topic_id, {
          topicId: item.topic_id,
          totalWords: item.total_words,
          wordsLearned: item.words_learned,
          isCompleted: item.is_completed,
          completionPercentage: (item.words_learned / item.total_words) * 100
        })
      })

      return progressMap
    } catch (error) {
      console.error('Error getting all topic progress:', error)
      return new Map()
    }
  }

  /**
   * Get completed topic IDs for a user and language
   */
  async getCompletedTopicIds(
    userId: string,
    targetLanguageCode: string
  ): Promise<number[]> {
    try {
      const { data, error } = await getSupabase()
        .from('user_topic_completion')
        .select('topic_id')
        .eq('user_id', userId)
        .eq('target_language_code', targetLanguageCode)
        .eq('is_completed', true)

      if (error) throw error

      return data?.map(item => item.topic_id) || []
    } catch (error) {
      console.error('Error getting completed topics:', error)
      return []
    }
  }

  async getTopicCompletionCounts(
    userId: string,
    targetLanguageCode: string
  ): Promise<Record<number, number>> {
    try {
      const { data, error } = await getSupabase()
        .from('user_topic_completion')
        .select('topic_id, completion_count')
        .eq('user_id', userId)
        .eq('target_language_code', targetLanguageCode)
        .gt('completion_count', 0)

      if (error) throw error

      const counts: Record<number, number> = {}
      data?.forEach(item => {
        counts[item.topic_id] = item.completion_count
      })
      return counts
    } catch (error) {
      console.error('Error getting topic completion counts:', error)
      return {}
    }
  }

  async updateCompletionCountForWord(
    userId: string,
    vocabularyId: number,
    targetLanguageCode: string
  ): Promise<void> {
    try {
      const { data: vocab } = await getSupabase()
        .from('vocabulary')
        .select('topic_id')
        .eq('id', vocabularyId)
        .single()

      if (!vocab) return

      const { data: topicCompletion } = await getSupabase()
        .from('user_topic_completion')
        .select('completion_count, is_completed, completed_at')
        .eq('user_id', userId)
        .eq('topic_id', vocab.topic_id)
        .eq('target_language_code', targetLanguageCode)
        .single()

      if (!topicCompletion || !topicCompletion.is_completed || !topicCompletion.completed_at) return

      const { data: topicVocab } = await getSupabase()
        .from('vocabulary')
        .select('id')
        .eq('topic_id', vocab.topic_id)

      if (!topicVocab || topicVocab.length === 0) return

      const { data: wordProgress } = await getSupabase()
        .from('user_word_progress')
        .select('vocabulary_id, last_played_at')
        .eq('user_id', userId)
        .eq('target_language_code', targetLanguageCode)
        .in('vocabulary_id', topicVocab.map(v => v.id))

      if (!wordProgress || wordProgress.length < topicVocab.length) return

      const completedAt = new Date(topicCompletion.completed_at).getTime()
      const allReplayedSinceCompletion = topicVocab.every(v => {
        const wp = wordProgress.find(w => w.vocabulary_id === v.id)
        return wp && new Date(wp.last_played_at).getTime() > completedAt
      })

      if (allReplayedSinceCompletion) {
        await getSupabase()
          .from('user_topic_completion')
          .update({
            completion_count: (topicCompletion.completion_count || 0) + 1,
            completed_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('topic_id', vocab.topic_id)
          .eq('target_language_code', targetLanguageCode)
      }
    } catch (error) {
      console.error('Error updating completion count:', error)
    }
  }

  /**
   * Update login streak when user logs in (timezone-aware with 1-day grace period)
   */
  async updateLoginStreak(userId: string, userTimezone?: string, activeDate?: string): Promise<void> {
    try {
      // Get user's local date (not UTC). Offline-active days replayed on
      // reconnect pass their original local date (YYYY-MM-DD) so the streak
      // credits the day they actually learned, not the reconnect day.
      const today = activeDate
        ? activeDate
        : userTimezone
        ? new Date().toLocaleDateString('en-CA', { timeZone: userTimezone })
        : new Date().toLocaleDateString('en-CA') // Fallback to system timezone
      
      // Get existing streak data
      const { data: existing, error: checkError } = await getSupabase()
        .from('user_login_streaks')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError
      }

      if (!existing) {
        // First login ever - create new streak
        await getSupabase()
          .from('user_login_streaks')
          .insert({
            user_id: userId,
            current_streak: 1,
            longest_streak: 1,
            last_login_date: today,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        return
      }

      // Check if already logged in today
      if (existing.last_login_date === today) {
        // Already logged in today, no update needed
        return
      }

      // Calculate calendar day difference (not time-based)
      const daysDiff = this.calculateDayDifference(existing.last_login_date, today)

      let newStreak = existing.current_streak
      
      if (daysDiff === 1) {
        // Consecutive day - increment streak
        newStreak = existing.current_streak + 1
      } else if (daysDiff === 2) {
        // 1-day grace period - user missed yesterday but keep streak alive
        newStreak = existing.current_streak + 1
      } else if (daysDiff > 2) {
        // Streak broken - reset to 1
        newStreak = 1
      }

      // Update streak
      await getSupabase()
        .from('user_login_streaks')
        .update({
          current_streak: newStreak,
          longest_streak: Math.max(newStreak, existing.longest_streak),
          last_login_date: today,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

    } catch (error) {
      console.error('Error updating login streak:', error)
    }
  }

  /**
   * Calculate calendar day difference between two date strings
   */
  private calculateDayDifference(date1: string, date2: string): number {
    const d1 = new Date(date1 + 'T00:00:00')
    const d2 = new Date(date2 + 'T00:00:00')
    const diffTime = d2.getTime() - d1.getTime()
    return Math.round(diffTime / (1000 * 60 * 60 * 24))
  }

  /**
   * Check if a topic is completed for a user
   */
  async isTopicCompleted(
    userId: string,
    topicId: number,
    targetLanguageCode: string
  ): Promise<boolean> {
    try {
      const { data, error } = await getSupabase()
        .from('user_topic_completion')
        .select('is_completed')
        .eq('user_id', userId)
        .eq('topic_id', topicId)
        .eq('target_language_code', targetLanguageCode)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return data?.is_completed || false
    } catch (error) {
      console.error('Error checking topic completion:', error)
      return false
    }
  }
}

export const progressService = new ProgressService()
