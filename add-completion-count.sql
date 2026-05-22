-- Add completion_count column to track how many times a topic has been completed
ALTER TABLE user_topic_completion
  ADD COLUMN IF NOT EXISTS completion_count INTEGER DEFAULT 0;

-- Backfill: set existing completed topics to count 1
UPDATE user_topic_completion SET completion_count = 1 WHERE is_completed = true AND completion_count = 0;

-- Update the trigger function to increment completion_count on completion transition
CREATE OR REPLACE FUNCTION update_topic_completion()
RETURNS TRIGGER AS $$
BEGIN
  WITH vocab_topic AS (
    SELECT topic_id FROM vocabulary WHERE id = NEW.vocabulary_id
  )
  INSERT INTO user_topic_completion (
    user_id,
    topic_id,
    target_language_code,
    total_words,
    words_learned,
    first_word_at,
    completion_count,
    updated_at
  )
  SELECT
    NEW.user_id,
    vt.topic_id,
    NEW.target_language_code,
    (SELECT COUNT(*) FROM vocabulary WHERE topic_id = vt.topic_id),
    1,
    NEW.first_played_at,
    0,
    NOW()
  FROM vocab_topic vt
  ON CONFLICT (user_id, topic_id, target_language_code)
  DO UPDATE SET
    words_learned = user_topic_completion.words_learned + 1,
    updated_at = NOW(),
    is_completed = (user_topic_completion.words_learned + 1 >= user_topic_completion.total_words),
    completed_at = CASE
      WHEN (user_topic_completion.words_learned + 1 >= user_topic_completion.total_words)
      THEN NOW()
      ELSE user_topic_completion.completed_at
    END,
    completion_count = CASE
      WHEN NOT user_topic_completion.is_completed
        AND (user_topic_completion.words_learned + 1 >= user_topic_completion.total_words)
      THEN COALESCE(user_topic_completion.completion_count, 0) + 1
      ELSE COALESCE(user_topic_completion.completion_count, 0)
    END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
