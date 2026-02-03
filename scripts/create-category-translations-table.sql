-- Create category_translations table for vocabulary context/category translations
-- This stores translations for category names like "BASIC GREETINGS", "NUMBERS", etc.

CREATE TABLE IF NOT EXISTS category_translations (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL,                    -- Original English category name (e.g., "basic greetings")
  language_code TEXT NOT NULL,               -- Language code (tr, pt, es, etc.)
  translated_category TEXT NOT NULL,         -- Translated category name
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure one translation per category per language
  UNIQUE(category, language_code)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_category_translations_lang 
  ON category_translations(language_code);

CREATE INDEX IF NOT EXISTS idx_category_translations_category 
  ON category_translations(category);

-- Enable Row Level Security
ALTER TABLE category_translations ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists, then recreate
DROP POLICY IF EXISTS "Allow public read access on category_translations" ON category_translations;

-- Allow public read access
CREATE POLICY "Allow public read access on category_translations" 
  ON category_translations FOR SELECT USING (true);

-- Comments
COMMENT ON TABLE category_translations IS 'Translations for vocabulary category/context names displayed in the UI';
COMMENT ON COLUMN category_translations.category IS 'Original English category name from vocabulary.context field';
COMMENT ON COLUMN category_translations.translated_category IS 'Translated category name for display in target language';
