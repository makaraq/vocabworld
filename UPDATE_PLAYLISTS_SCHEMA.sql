-- UPDATE PLAYLISTS SCHEMA
-- Run this in Supabase SQL Editor to add language pair columns to existing table
-- This is safe to run multiple times

-- Add source_language_code column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_playlists' AND column_name = 'source_language_code'
  ) THEN
    ALTER TABLE user_playlists ADD COLUMN source_language_code VARCHAR(10) NOT NULL DEFAULT 'en';
  END IF;
END $$;

-- Add target_language_code column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_playlists' AND column_name = 'target_language_code'
  ) THEN
    ALTER TABLE user_playlists ADD COLUMN target_language_code VARCHAR(10) NOT NULL DEFAULT 'es';
  END IF;
END $$;

-- Create index for language pair lookups if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_user_playlists_languages 
ON user_playlists(user_id, source_language_code, target_language_code);

-- Add unique constraint for playlist name per user per language pair (if not exists)
-- This prevents duplicate playlist names for the same language combination
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_playlists_user_name_langs_unique'
  ) THEN
    ALTER TABLE user_playlists 
    ADD CONSTRAINT user_playlists_user_name_langs_unique 
    UNIQUE (user_id, name, source_language_code, target_language_code);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Constraint already exists, ignore
END $$;

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_playlists'
ORDER BY ordinal_position;
