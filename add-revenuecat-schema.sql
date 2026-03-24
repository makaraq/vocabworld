-- Run this migration ONCE in Supabase SQL Editor
-- Adds RevenueCat user identifier to user_profiles
-- Stripe columns are kept (not dropped) for backwards-compatibility with existing data

-- Add RevenueCat app user ID column (= Supabase UUID by default)
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS revenuecat_app_user_id TEXT;

-- Create an index so webhook lookups by RC user ID are fast
CREATE INDEX IF NOT EXISTS idx_user_profiles_revenuecat_app_user_id
  ON user_profiles (revenuecat_app_user_id);

-- Back-fill: set revenuecat_app_user_id = id for all existing rows
UPDATE user_profiles
SET revenuecat_app_user_id = id::TEXT
WHERE revenuecat_app_user_id IS NULL;

-- Note: stripe_customer_id and stripe_subscription_id columns are intentionally
-- left in place. They will no longer be written by new code but existing data
-- is preserved. Drop them manually once you are confident no code reads them.
