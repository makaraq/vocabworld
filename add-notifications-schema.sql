-- ============================================================
-- Notifications schema migration
-- Run in Supabase SQL Editor
-- ============================================================

-- Add timezone column to user_profiles.
-- Used by the /api/notifications/context endpoint to determine
-- the user's local date when checking if they studied "today".
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';

COMMENT ON COLUMN user_profiles.timezone IS
  'IANA timezone string detected client-side, e.g. "America/New_York". '
  'Updated on each app open. Used for notification scheduling context.';

-- Notification preferences live inside the existing
-- learning_settings JSONB column — no schema change needed.
-- Expected shape (added to learning_settings):
--
-- "notifications": {
--   "enabled": false
-- }
--
-- A single master switch. When enabled, streak-protection (8 PM) and review
-- reminders are scheduled on-device. (The daily study reminder was removed.)
