-- Add user settings column to user_profiles table
-- This stores all learning preferences as JSONB for flexibility

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS learning_settings JSONB DEFAULT '{
  "autoPlay": true,
  "trainingLanguageVoice": "Male",
  "mainLanguageVoice": "Male",
  "pronunciationSpeed": "Normal",
  "pauseBetweenTranslations": 0.5,
  "pauseForNextWord": 0.7,
  "repeatTargetLanguage": 1,
  "repeatMainLanguage": 1,
  "playTargetOnly": false
}'::jsonb;

-- Add index for faster JSON queries if needed
CREATE INDEX IF NOT EXISTS idx_user_profiles_learning_settings ON user_profiles USING GIN (learning_settings);

-- Add comment for documentation
COMMENT ON COLUMN user_profiles.learning_settings IS 'User learning preferences and audio playback settings stored as JSON';
