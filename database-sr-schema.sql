-- Spaced Repetition System Schema
-- Run this in Supabase SQL Editor

-- =====================================================
-- 1. SR CARD STATE TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_sr_cards (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vocabulary_id INTEGER NOT NULL,
  target_language_code VARCHAR(10) NOT NULL,
  state SMALLINT NOT NULL DEFAULT 0,       -- 0=new, 1=learning, 2=review, 3=relearning
  difficulty REAL NOT NULL DEFAULT 0.3,
  stability REAL NOT NULL DEFAULT 0,
  due TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_review TIMESTAMPTZ,
  reps INTEGER NOT NULL DEFAULT 0,
  lapses INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, vocabulary_id, target_language_code)
);

CREATE INDEX IF NOT EXISTS idx_sr_cards_due
  ON user_sr_cards(user_id, target_language_code, due);

CREATE INDEX IF NOT EXISTS idx_sr_cards_user
  ON user_sr_cards(user_id);

-- =====================================================
-- 2. AUTO-ENROLL TRIGGER
-- =====================================================
-- When a word is first played, automatically create an SR card
CREATE OR REPLACE FUNCTION enroll_sr_card()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_sr_cards (user_id, vocabulary_id, target_language_code)
  VALUES (NEW.user_id, NEW.vocabulary_id, NEW.target_language_code)
  ON CONFLICT (user_id, vocabulary_id, target_language_code) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_enroll_sr_card ON user_word_progress;
CREATE TRIGGER trigger_enroll_sr_card
  AFTER INSERT ON user_word_progress
  FOR EACH ROW
  EXECUTE FUNCTION enroll_sr_card();

-- =====================================================
-- 3. ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE user_sr_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sr cards" ON user_sr_cards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sr cards" ON user_sr_cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sr cards" ON user_sr_cards
  FOR UPDATE USING (auth.uid() = user_id);
