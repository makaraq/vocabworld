-- Leaderboard Feature Schema
-- Run this in Supabase SQL Editor

-- =====================================================
-- 1. OPT-IN COLUMN ON USER PROFILES
-- =====================================================
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS show_on_leaderboard BOOLEAN DEFAULT FALSE;

-- =====================================================
-- 2. INDEXES FOR LEADERBOARD QUERIES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_word_progress_user_lang_playcount
  ON user_word_progress(user_id, target_language_code);

CREATE INDEX IF NOT EXISTS idx_word_progress_last_played
  ON user_word_progress(last_played_at);

CREATE INDEX IF NOT EXISTS idx_login_streaks_streak
  ON user_login_streaks(current_streak DESC);
