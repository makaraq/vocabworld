-- Topic translations table
-- Stores translated topic names for all languages

CREATE TABLE IF NOT EXISTS topic_translations (
  id BIGSERIAL PRIMARY KEY,
  topic_id INTEGER NOT NULL,
  language_code VARCHAR(5) NOT NULL,
  translated_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one translation per topic per language
  CONSTRAINT unique_topic_language UNIQUE (topic_id, language_code),
  
  -- Foreign key to topics table
  CONSTRAINT fk_topic FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_topic_translations_topic_id ON topic_translations(topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_translations_language ON topic_translations(language_code);
CREATE INDEX IF NOT EXISTS idx_topic_translations_lookup ON topic_translations(topic_id, language_code);

-- Enable RLS
ALTER TABLE topic_translations ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read topic translations
CREATE POLICY "Topic translations are publicly readable"
  ON topic_translations
  FOR SELECT
  USING (true);

COMMENT ON TABLE topic_translations IS 'Stores translated topic names for multilingual support';
COMMENT ON COLUMN topic_translations.topic_id IS 'References topics.id';
COMMENT ON COLUMN topic_translations.language_code IS 'ISO 639-1 language code';
COMMENT ON COLUMN topic_translations.translated_name IS 'Topic name in the target language';
