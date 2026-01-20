-- Add phonetics table for storing IPA pronunciations
-- Supports multiple languages and phonetic systems

CREATE TABLE IF NOT EXISTS vocabulary_phonetics (
  id SERIAL PRIMARY KEY,
  vocabulary_id INTEGER NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL,
  phonetic_ipa TEXT NOT NULL,
  phonetic_system TEXT DEFAULT 'IPA',
  source TEXT DEFAULT 'espeak-ng',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure one phonetic per word per language
  UNIQUE(vocabulary_id, language_code)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_phonetics_vocab_lang ON vocabulary_phonetics(vocabulary_id, language_code);
CREATE INDEX IF NOT EXISTS idx_phonetics_language ON vocabulary_phonetics(language_code);

-- Add comment for documentation
COMMENT ON TABLE vocabulary_phonetics IS 'Stores phonetic transcriptions (IPA) for vocabulary words in multiple languages';
COMMENT ON COLUMN vocabulary_phonetics.phonetic_ipa IS 'International Phonetic Alphabet representation of pronunciation';
COMMENT ON COLUMN vocabulary_phonetics.source IS 'Tool used to generate phonetics (espeak-ng, google-tts, manual, etc.)';
