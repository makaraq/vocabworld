-- ============================================================
-- Bucket daily progress by the USER'S calendar day, not the server's
-- Run in Supabase SQL Editor
-- ============================================================
-- user_daily_progress.activity_date was written with CURRENT_DATE — the
-- database's UTC day — while the login streak counts the user's local day. The
-- two disagreed for anyone far from UTC: "words learned today" rolled over at
-- 09:00 in Tokyo and 17:00 in Los Angeles, hours away from the streak counter
-- sitting next to it on the same screen.
--
-- This rewrites update_daily_progress() to resolve the day in the timezone
-- stored on user_profiles, falling back to UTC when it is missing or
-- unrecognised. Only the function body changes — the trigger on
-- user_word_progress already points at it by name, so it needs no edit.
--
-- MUST be applied together with the matching app deploy. The app now reads
-- (and writes, for reviews) daily rows keyed by the user's local date; until
-- this runs, new-word rows still land on the UTC date and will not be found
-- for users whose local date currently differs from UTC.
--
-- Historical rows are left as they are — the day a past row belongs to cannot
-- be recovered from the row itself, and re-bucketing them is not worth the risk.

CREATE OR REPLACE FUNCTION update_daily_progress()
RETURNS TRIGGER AS $$
DECLARE
  topic_id_var INTEGER;
  user_tz TEXT;
  local_date DATE;
BEGIN
  -- Get the topic_id for this vocabulary word
  SELECT topic_id INTO topic_id_var FROM vocabulary WHERE id = NEW.vocabulary_id;

  SELECT timezone INTO user_tz FROM user_profiles WHERE id = NEW.user_id;

  -- An unrecognised timezone raises invalid_parameter_value; never let that
  -- take the whole word-play insert down with it.
  BEGIN
    local_date := (COALESCE(NEW.last_played_at, NOW()) AT TIME ZONE COALESCE(user_tz, 'UTC'))::DATE;
  EXCEPTION WHEN OTHERS THEN
    local_date := (COALESCE(NEW.last_played_at, NOW()) AT TIME ZONE 'UTC')::DATE;
  END;

  INSERT INTO user_daily_progress (
    user_id,
    target_language_code,
    activity_date,
    words_learned_count,
    topics_practiced,
    updated_at
  )
  VALUES (
    NEW.user_id,
    NEW.target_language_code,
    local_date,
    1,
    ARRAY[topic_id_var::TEXT],
    NOW()
  )
  ON CONFLICT (user_id, target_language_code, activity_date)
  DO UPDATE SET
    words_learned_count = user_daily_progress.words_learned_count + 1,
    topics_practiced = array_append(
      user_daily_progress.topics_practiced,
      topic_id_var::TEXT
    ),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
