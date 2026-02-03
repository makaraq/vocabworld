-- Add translated_description column to topic_translations table

ALTER TABLE topic_translations 
ADD COLUMN IF NOT EXISTS translated_description TEXT;

COMMENT ON COLUMN topic_translations.translated_description IS 'Translated topic description for display in target language';
