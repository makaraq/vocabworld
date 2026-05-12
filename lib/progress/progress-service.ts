/**
 * Sprind Progress Tracking Service
 * Handles all progress tracking logic server-side
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

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
    targetLanguageCode: string
  ): Promise<{ success: boolean; error?: string; isNewWord?: boolean }> {
    try {
      // Check if word already exists in progress
      const { data: existing, error: checkError } = await supabase
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
        const { error: updateError } = await supabase
          .from('user_word_progress')
          .update({
            last_played_at: new Date().toISOString(),
            play_count: existing.play_count + 1,
            updated_at: new Date().toISOString()
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
        const { error: insertError } = await supabase
          .from('user_word_progress')
          .insert({
            user_id: userId,
            vocabulary_id: vocabularyId,
            target_language_code: targetLanguageCode,
            first_played_at: new Date().toISOString(),
            last_played_at: new Date().toISOString(),
            play_count: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
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
   * Get comprehensive progress stats for a user and target language
   */
  async getProgressStats(
    userId: string,
    targetLanguageCode: string
  ): Promise<ProgressStats> {
    try {
      // Get language progress summary
      const { data: languageProgress } = await supabase
        .from('user_language_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('target_language_code', targetLanguageCode)
        .single()

      // Get daily progress for today
      const today = new Date().toISOString().split('T')[0]
      const { data: dailyProgress } = await supabase
        .from('user_daily_progress')
        .select('words_learned_count')
        .eq('user_id', userId)
        .eq('target_language_code', targetLanguageCode)
        .eq('activity_date', today)
        .single()

      // Get login streak
      const { data: loginStreak } = await supabase
        .from('user_login_streaks')
        .select('current_streak')
        .eq('user_id', userId)
        .single()

      // Get total words in database
      const { count: totalWords } = await supabase
        .from('vocabulary')
        .select('*', { count: 'exact', head: true })

      // Count completed topics from topic completion table
      const { count: completedTopics } = await supabase
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
      const { data, error } = await supabase
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
        const { count } = await supabase
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
      const { data, error } = await supabase
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
      const { data, error } = await supabase
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

  /**
   * Update login streak when user logs in (timezone-aware with 1-day grace period)
   */
  async updateLoginStreak(userId: string, userTimezone?: string): Promise<void> {
    try {
      // Get user's local date (not UTC)
      const today = userTimezone 
        ? new Date().toLocaleDateString('en-CA', { timeZone: userTimezone })
        : new Date().toLocaleDateString('en-CA') // Fallback to system timezone
      
      // Get existing streak data
      const { data: existing, error: checkError } = await supabase
        .from('user_login_streaks')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError
      }

      if (!existing) {
        // First login ever - create new streak
        await supabase
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
      await supabase
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
      const { data, error } = await supabase
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
