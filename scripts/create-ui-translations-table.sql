-- Create ui_translations table for UI element translations
-- This stores translations for section names, button labels, and other UI text

CREATE TABLE IF NOT EXISTS ui_translations (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL,                         -- Translation key (e.g., "PROFILE", "FIRST_AID_KIT")
  language_code TEXT NOT NULL,               -- Language code (ar, es, fr, etc.)
  translated_text TEXT NOT NULL,             -- Translated text
  category TEXT DEFAULT 'section',           -- Category: 'section', 'button', 'label', etc.
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure one translation per key per language
  UNIQUE(key, language_code)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ui_translations_key 
  ON ui_translations(key);

CREATE INDEX IF NOT EXISTS idx_ui_translations_lang 
  ON ui_translations(language_code);

CREATE INDEX IF NOT EXISTS idx_ui_translations_category 
  ON ui_translations(category);

-- Enable Row Level Security
ALTER TABLE ui_translations ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists, then recreate
DROP POLICY IF EXISTS "Allow public read access on ui_translations" ON ui_translations;

-- Allow public read access
CREATE POLICY "Allow public read access on ui_translations" 
  ON ui_translations FOR SELECT USING (true);

-- Comments
COMMENT ON TABLE ui_translations IS 'Translations for UI elements like section names, buttons, labels';
COMMENT ON COLUMN ui_translations.key IS 'Unique identifier for the UI element (e.g., PROFILE, FIRST_AID_KIT)';
COMMENT ON COLUMN ui_translations.translated_text IS 'Translated text for display in target language';
COMMENT ON COLUMN ui_translations.category IS 'Category of UI element for organization';
