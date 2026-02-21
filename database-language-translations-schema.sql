-- Database Schema for Language Name Translations
-- Stores translations of language names in all 49 supported languages

CREATE TABLE IF NOT EXISTS language_translations (
  id BIGSERIAL PRIMARY KEY,
  language_code TEXT NOT NULL, -- The language code this translation is IN (e.g., 'tr' for Turkish)
  english_name TEXT NOT NULL, -- The English name being translated (e.g., 'Spanish')
  translated_name TEXT NOT NULL, -- The translated name (e.g., 'İspanyolca')
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  -- Constraints
  UNIQUE(language_code, english_name)
);

-- Index for fast lookups by language code
CREATE INDEX IF NOT EXISTS idx_language_translations_language_code 
ON language_translations(language_code);

-- Index for fast lookups by English name
CREATE INDEX IF NOT EXISTS idx_language_translations_english_name 
ON language_translations(english_name);

-- Comments
COMMENT ON TABLE language_translations IS 'Stores translations of language names in all supported languages';
COMMENT ON COLUMN language_translations.language_code IS 'The language code this translation is in (e.g., tr for Turkish)';
COMMENT ON COLUMN language_translations.english_name IS 'The English name of the language (e.g., Spanish)';
COMMENT ON COLUMN language_translations.translated_name IS 'The translated name in the target language (e.g., İspanyolca in Turkish)';

-- Enable Row Level Security (optional - can adjust based on needs)
ALTER TABLE language_translations ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
CREATE POLICY "Allow public read access to language translations"
ON language_translations FOR SELECT
USING (true);
