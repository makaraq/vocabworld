-- Schema for storing example sentences for vocabulary words
-- Run this in Supabase Dashboard SQL Editor

-- Create example_sentences table
CREATE TABLE IF NOT EXISTS example_sentences (
  id SERIAL PRIMARY KEY,
  vocabulary_id INTEGER NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL, -- Language of the example sentence
  sentence TEXT NOT NULL, -- Example sentence in the specified language
  translation TEXT, -- Translation of the sentence (usually English)
  sentence_order INTEGER DEFAULT 1, -- Order of the sentence (1, 2, or 3)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_example_sentences_vocab_id ON example_sentences(vocabulary_id);
CREATE INDEX IF NOT EXISTS idx_example_sentences_lang ON example_sentences(language_code);
CREATE INDEX IF NOT EXISTS idx_example_sentences_vocab_lang ON example_sentences(vocabulary_id, language_code);

-- Enable Row Level Security
ALTER TABLE example_sentences ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
CREATE POLICY "Allow public read access on example_sentences" 
  ON example_sentences FOR SELECT USING (true);

-- Create policy to allow authenticated users to insert
CREATE POLICY "Allow authenticated users to insert example_sentences" 
  ON example_sentences FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Create policy to allow authenticated users to update
CREATE POLICY "Allow authenticated users to update example_sentences" 
  ON example_sentences FOR UPDATE 
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Add unique constraint to prevent duplicate entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_example_sentence 
  ON example_sentences(vocabulary_id, language_code, sentence_order);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_example_sentences_updated_at 
  BEFORE UPDATE ON example_sentences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
