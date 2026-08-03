-- Sprind Progress Tracking System
-- Run this in Supabase SQL Editor

-- =====================================================
-- 1. WORD PROGRESS TRACKING
-- =====================================================
-- Tracks every word played per user per target language
CREATE TABLE IF NOT EXISTS user_word_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vocabulary_id INTEGER NOT NULL,
  target_language_code VARCHAR(10) NOT NULL,
  first_played_at TIMESTAMPTZ DEFAULT NOW(),
  last_played_at TIMESTAMPTZ DEFAULT NOW(),
  play_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, vocabulary_id, target_language_code)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_word_progress_user_lang 
  ON user_word_progress(user_id, target_language_code);
CREATE INDEX IF NOT EXISTS idx_user_word_progress_vocab 
  ON user_word_progress(vocabulary_id);

-- =====================================================
-- 2. TOPIC COMPLETION TRACKING
-- =====================================================
-- Tracks which topics are completed per user per language
CREATE TABLE IF NOT EXISTS user_topic_completion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  target_language_code VARCHAR(10) NOT NULL,
  total_words INTEGER NOT NULL DEFAULT 0,
  words_learned INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  first_word_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, topic_id, target_language_code)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_topic_completion_user_lang 
  ON user_topic_completion(user_id, target_language_code);
CREATE INDEX IF NOT EXISTS idx_topic_completion_completed 
  ON user_topic_completion(user_id, target_language_code, is_completed);

-- =====================================================
-- 3. DAILY LOGIN STREAK TRACKING
-- =====================================================
-- Tracks login streaks per user (not language-specific)
CREATE TABLE IF NOT EXISTS user_login_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_login_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_login_streaks_user 
  ON user_login_streaks(user_id);

-- =====================================================
-- 4. DAILY PROGRESS LOG
-- =====================================================
-- Logs daily activity for calculating "words learned today"
CREATE TABLE IF NOT EXISTS user_daily_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_language_code VARCHAR(10) NOT NULL,
  activity_date DATE NOT NULL,
  words_learned_count INTEGER DEFAULT 0,
  words_reviewed_count INTEGER DEFAULT 0,
  topics_practiced TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, target_language_code, activity_date)
);

-- Index for date-based queries
CREATE INDEX IF NOT EXISTS idx_daily_progress_user_lang_date 
  ON user_daily_progress(user_id, target_language_code, activity_date);

-- =====================================================
-- 5. LANGUAGE PROGRESS SUMMARY
-- =====================================================
-- Aggregated stats per user per target language
CREATE TABLE IF NOT EXISTS user_language_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_language_code VARCHAR(10) NOT NULL,
  total_words_learned INTEGER DEFAULT 0,
  total_words_in_language INTEGER DEFAULT 0,
  completion_percentage DECIMAL(5,2) DEFAULT 0,
  topics_completed INTEGER DEFAULT 0,
  total_topics INTEGER DEFAULT 0,
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, target_language_code)
);

-- Index for language-based queries
CREATE INDEX IF NOT EXISTS idx_language_progress_user 
  ON user_language_progress(user_id);

-- =====================================================
-- 6. FUNCTIONS FOR AUTOMATIC UPDATES
-- =====================================================

-- Function to update topic completion when words are learned
CREATE OR REPLACE FUNCTION update_topic_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Get the topic_id for this vocabulary word
  WITH vocab_topic AS (
    SELECT topic_id FROM vocabulary WHERE id = NEW.vocabulary_id
  )
  -- Insert or update topic completion
  INSERT INTO user_topic_completion (
    user_id, 
    topic_id, 
    target_language_code,
    total_words,
    words_learned,
    first_word_at,
    updated_at
  )
  SELECT 
    NEW.user_id,
    vt.topic_id,
    NEW.target_language_code,
    (SELECT COUNT(*) FROM vocabulary WHERE topic_id = vt.topic_id),
    1,
    NEW.first_played_at,
    NOW()
  FROM vocab_topic vt
  ON CONFLICT (user_id, topic_id, target_language_code) 
  DO UPDATE SET
    words_learned = user_topic_completion.words_learned + 1,
    updated_at = NOW(),
    is_completed = (user_topic_completion.words_learned + 1 >= user_topic_completion.total_words),
    completed_at = CASE 
      WHEN (user_topic_completion.words_learned + 1 >= user_topic_completion.total_words) 
      THEN NOW() 
      ELSE user_topic_completion.completed_at 
    END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update topic completion automatically
DROP TRIGGER IF EXISTS trigger_update_topic_completion ON user_word_progress;
CREATE TRIGGER trigger_update_topic_completion
  AFTER INSERT ON user_word_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_topic_completion();

-- Function to update language progress summary
CREATE OR REPLACE FUNCTION update_language_progress()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_language_progress (
    user_id,
    target_language_code,
    total_words_learned,
    total_words_in_language,
    completion_percentage,
    topics_completed,
    total_topics,
    last_activity_at,
    updated_at
  )
  SELECT 
    NEW.user_id,
    NEW.target_language_code,
    1,
    (SELECT COUNT(*) FROM vocabulary),
    (1.0 / NULLIF((SELECT COUNT(*) FROM vocabulary), 0) * 100),
    0,
    (SELECT COUNT(*) FROM topics),
    NEW.last_played_at,
    NOW()
  ON CONFLICT (user_id, target_language_code)
  DO UPDATE SET
    total_words_learned = user_language_progress.total_words_learned + 1,
    completion_percentage = ((user_language_progress.total_words_learned + 1.0) / 
      NULLIF(user_language_progress.total_words_in_language, 0) * 100),
    last_activity_at = NEW.last_played_at,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update language progress automatically
DROP TRIGGER IF EXISTS trigger_update_language_progress ON user_word_progress;
CREATE TRIGGER trigger_update_language_progress
  AFTER INSERT ON user_word_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_language_progress();

-- Function to update daily progress
CREATE OR REPLACE FUNCTION update_daily_progress()
RETURNS TRIGGER AS $$
DECLARE
  topic_id_var INTEGER;
  user_tz TEXT;
  local_date DATE;
BEGIN
  -- Get the topic_id for this vocabulary word
  SELECT topic_id INTO topic_id_var FROM vocabulary WHERE id = NEW.vocabulary_id;

  -- Bucket by the USER'S calendar day so daily counters roll over at the same
  -- midnight the login streak does (CURRENT_DATE is the server's UTC day).
  SELECT timezone INTO user_tz FROM user_profiles WHERE id = NEW.user_id;
  BEGIN
    local_date := (COALESCE(NEW.last_played_at, NOW()) AT TIME ZONE COALESCE(user_tz, 'UTC'))::DATE;
  EXCEPTION WHEN OTHERS THEN
    local_date := (COALESCE(NEW.last_played_at, NOW()) AT TIME ZONE 'UTC')::DATE;
  END;

  INSERT INTO user_daily_progress (
    user_id,
    target_language_code,
    activity_date,
    words_learned_count,
    topics_practiced,
    updated_at
  )
  VALUES (
    NEW.user_id,
    NEW.target_language_code,
    local_date,
    1,
    ARRAY[topic_id_var::TEXT],
    NOW()
  )
  ON CONFLICT (user_id, target_language_code, activity_date)
  DO UPDATE SET
    words_learned_count = user_daily_progress.words_learned_count + 1,
    topics_practiced = array_append(
      user_daily_progress.topics_practiced, 
      topic_id_var::TEXT
    ),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update daily progress automatically
DROP TRIGGER IF EXISTS trigger_update_daily_progress ON user_word_progress;
CREATE TRIGGER trigger_update_daily_progress
  AFTER INSERT ON user_word_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_progress();

-- =====================================================
-- 7. ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE user_word_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_topic_completion ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_login_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_daily_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_language_progress ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only see and modify their own data
CREATE POLICY "Users can view own word progress" ON user_word_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own word progress" ON user_word_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own topic completion" ON user_topic_completion
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own login streaks" ON user_login_streaks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own login streaks" ON user_login_streaks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own login streaks" ON user_login_streaks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own daily progress" ON user_daily_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own language progress" ON user_language_progress
  FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- READY TO USE!
-- =====================================================
-- After running this SQL:
-- 1. User plays a word → automatically tracked in user_word_progress
-- 2. Topic completion updates automatically via trigger
-- 3. Language progress updates automatically via trigger  
-- 4. Daily progress logs are created automatically
-- 5. Call API endpoints to update login streaks and fetch stats
