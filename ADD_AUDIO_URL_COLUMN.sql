-- ============================================
-- ADD AUDIO URL SUPPORT TO VOCABULARY SYSTEM
-- ============================================
-- Run this in Supabase Dashboard > SQL Editor

-- 1. Add audio_url column to vocabulary_translations
ALTER TABLE vocabulary_translations 
ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- 2. Create index for faster audio URL lookups
CREATE INDEX IF NOT EXISTS idx_vocabulary_translations_audio 
ON vocabulary_translations(vocabulary_id, language_code) 
WHERE audio_url IS NOT NULL;

-- 3. Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'vocabulary_translations' 
AND column_name = 'audio_url';

-- Expected output: audio_url | text
