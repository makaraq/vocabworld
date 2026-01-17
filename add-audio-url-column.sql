-- Add audio_url column to vocabulary_translations table
-- Run this in Supabase SQL Editor

ALTER TABLE vocabulary_translations 
ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- Create index for faster audio URL lookups
CREATE INDEX IF NOT EXISTS idx_vocabulary_translations_audio 
ON vocabulary_translations(vocabulary_id, language_code) 
WHERE audio_url IS NOT NULL;
