-- Create topic_translations table for topic name translations
-- This stores translations for topic names like "Greetings" → "Selamlaşmalar"

CREATE TABLE IF NOT EXISTS topic_translations (
  id SERIAL PRIMARY KEY,
  topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL,               -- Language code (tr, pt, es, etc.)
  translated_name TEXT NOT NULL,             -- Translated topic name
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure one translation per topic per language
  UNIQUE(topic_id, language_code)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_topic_translations_topic 
  ON topic_translations(topic_id);

CREATE INDEX IF NOT EXISTS idx_topic_translations_lang 
  ON topic_translations(language_code);

-- Enable Row Level Security
ALTER TABLE topic_translations ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists, then recreate
DROP POLICY IF EXISTS "Allow public read access on topic_translations" ON topic_translations;

-- Allow public read access
CREATE POLICY "Allow public read access on topic_translations" 
  ON topic_translations FOR SELECT USING (true);

-- Comments
COMMENT ON TABLE topic_translations IS 'Translations for topic names displayed in the UI';
COMMENT ON COLUMN topic_translations.topic_id IS 'Reference to the topic being translated';
COMMENT ON COLUMN topic_translations.translated_name IS 'Translated topic name for display in target language';
