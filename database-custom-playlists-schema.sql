-- Custom Playlists Feature Schema
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. Dictionary Words Table (Cached Translations)
-- ============================================
CREATE TABLE IF NOT EXISTS dictionary_words (
  id SERIAL PRIMARY KEY,
  word_en VARCHAR(100) NOT NULL UNIQUE,
  translations JSONB NOT NULL DEFAULT '{}',  -- {"fr": "choeur", "de": "Chor", ...}
  phonetic_en VARCHAR(100),
  part_of_speech VARCHAR(50),
  definition_en TEXT,
  source VARCHAR(50) DEFAULT 'wiktionary',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast word search
CREATE INDEX IF NOT EXISTS idx_dictionary_words_en ON dictionary_words(word_en);

-- ============================================
-- 2. User Playlists Table
-- ============================================
CREATE TABLE IF NOT EXISTS user_playlists (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50) DEFAULT 'solar:playlist-minimalistic-linear',
  source_language_code VARCHAR(10) NOT NULL DEFAULT 'en',
  target_language_code VARCHAR(10) NOT NULL DEFAULT 'es',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name, source_language_code, target_language_code)
);

-- Index for fast user playlist lookup by language pair
CREATE INDEX IF NOT EXISTS idx_user_playlists_user ON user_playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_user_playlists_languages ON user_playlists(user_id, source_language_code, target_language_code);

-- ============================================
-- 3. User Playlist Words Table
-- ============================================
CREATE TABLE IF NOT EXISTS user_playlist_words (
  id SERIAL PRIMARY KEY,
  playlist_id INTEGER NOT NULL REFERENCES user_playlists(id) ON DELETE CASCADE,
  dictionary_word_id INTEGER NOT NULL REFERENCES dictionary_words(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  learned BOOLEAN DEFAULT FALSE,
  last_practiced TIMESTAMP WITH TIME ZONE,
  practice_count INTEGER DEFAULT 0,
  UNIQUE(playlist_id, dictionary_word_id)
);

-- Indexes for playlist word operations
CREATE INDEX IF NOT EXISTS idx_playlist_words_playlist ON user_playlist_words(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_words_dictionary ON user_playlist_words(dictionary_word_id);

-- ============================================
-- 4. Enable Row Level Security
-- ============================================
ALTER TABLE user_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_playlist_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE dictionary_words ENABLE ROW LEVEL SECURITY;

-- Users can only see their own playlists
DROP POLICY IF EXISTS "Users can view own playlists" ON user_playlists;
CREATE POLICY "Users can view own playlists" ON user_playlists
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own playlists" ON user_playlists;
CREATE POLICY "Users can insert own playlists" ON user_playlists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own playlists" ON user_playlists;
CREATE POLICY "Users can update own playlists" ON user_playlists
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own playlists" ON user_playlists;
CREATE POLICY "Users can delete own playlists" ON user_playlists
  FOR DELETE USING (auth.uid() = user_id);

-- Users can only manage words in their own playlists
DROP POLICY IF EXISTS "Users can view own playlist words" ON user_playlist_words;
CREATE POLICY "Users can view own playlist words" ON user_playlist_words
  FOR SELECT USING (
    playlist_id IN (SELECT id FROM user_playlists WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert own playlist words" ON user_playlist_words;
CREATE POLICY "Users can insert own playlist words" ON user_playlist_words
  FOR INSERT WITH CHECK (
    playlist_id IN (SELECT id FROM user_playlists WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own playlist words" ON user_playlist_words;
CREATE POLICY "Users can update own playlist words" ON user_playlist_words
  FOR UPDATE USING (
    playlist_id IN (SELECT id FROM user_playlists WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete own playlist words" ON user_playlist_words;
CREATE POLICY "Users can delete own playlist words" ON user_playlist_words
  FOR DELETE USING (
    playlist_id IN (SELECT id FROM user_playlists WHERE user_id = auth.uid())
  );

-- Dictionary words are readable by all authenticated users
DROP POLICY IF EXISTS "Authenticated users can read dictionary" ON dictionary_words;
CREATE POLICY "Authenticated users can read dictionary" ON dictionary_words
  FOR SELECT TO authenticated USING (true);

-- Service role can manage dictionary (for API to insert cached translations)
DROP POLICY IF EXISTS "Service role can insert dictionary" ON dictionary_words;
CREATE POLICY "Service role can insert dictionary" ON dictionary_words
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update dictionary" ON dictionary_words;
CREATE POLICY "Service role can update dictionary" ON dictionary_words
  FOR UPDATE USING (true);

-- ============================================
-- 5. Helper Functions
-- ============================================

-- Function to get playlist with word count
CREATE OR REPLACE FUNCTION get_user_playlists_with_counts(p_user_id UUID)
RETURNS TABLE (
  id INTEGER,
  name VARCHAR(100),
  description TEXT,
  icon VARCHAR(50),
  word_count BIGINT,
  learned_count BIGINT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.description,
    p.icon,
    COUNT(pw.id) as word_count,
    COUNT(pw.id) FILTER (WHERE pw.learned = true) as learned_count,
    p.created_at
  FROM user_playlists p
  LEFT JOIN user_playlist_words pw ON p.id = pw.playlist_id
  WHERE p.user_id = p_user_id
  GROUP BY p.id, p.name, p.description, p.icon, p.created_at
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get words in a playlist with translations
CREATE OR REPLACE FUNCTION get_playlist_words(p_playlist_id INTEGER, p_user_id UUID)
RETURNS TABLE (
  id INTEGER,
  word_en VARCHAR(100),
  translations JSONB,
  learned BOOLEAN,
  added_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- Verify user owns the playlist
  IF NOT EXISTS (SELECT 1 FROM user_playlists WHERE id = p_playlist_id AND user_id = p_user_id) THEN
    RAISE EXCEPTION 'Playlist not found or access denied';
  END IF;
  
  RETURN QUERY
  SELECT 
    dw.id,
    dw.word_en,
    dw.translations,
    pw.learned,
    pw.added_at
  FROM user_playlist_words pw
  JOIN dictionary_words dw ON pw.dictionary_word_id = dw.id
  WHERE pw.playlist_id = p_playlist_id
  ORDER BY pw.added_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_playlists_with_counts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_playlist_words(INTEGER, UUID) TO authenticated;
