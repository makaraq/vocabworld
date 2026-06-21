-- ============================================================
-- Trial-ending email reminder schema
-- Run ONCE in Supabase SQL Editor
-- ============================================================
--
-- Backs the daily cron at /api/cron/trial-reminders, which emails users
-- ~2 days before their free trial converts to a paid subscription.
--
--   trial_ends_at          — when the current free trial expires.
--                            Set by the RevenueCat webhook on a TRIAL
--                            INITIAL_PURCHASE; cleared once the user
--                            converts / cancels / expires.
--   trial_reminder_sent_at — when we sent the reminder email. NULL means
--                            "not yet sent" — the dedup guard that stops the
--                            daily cron from emailing the same user twice.

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS trial_reminder_sent_at TIMESTAMP WITH TIME ZONE;

-- Partial index so the cron's "trials ending soon" lookup is fast and small.
CREATE INDEX IF NOT EXISTS idx_user_profiles_trial_ends_at
  ON user_profiles (trial_ends_at)
  WHERE trial_ends_at IS NOT NULL;
