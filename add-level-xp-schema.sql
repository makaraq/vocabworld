-- Levels: each user's total XP, synced from every device they learn on.
-- Devices send what they earned since their last sync (a delta) and the
-- server adds it in one statement, so two phones learning at once never
-- overwrite each other's XP. The one-time back-pay for progress made before
-- levels existed (lib/leveling/engine.ts seedFromStats) is granted once per
-- user: a second device's back-pay is ignored. Used by app/api/level/route.ts.

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS xp_total BIGINT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS xp_seeded BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN user_profiles.xp_total IS 'Total XP across all devices (lib/leveling). Only ever grows, via add_user_xp().';
COMMENT ON COLUMN user_profiles.xp_seeded IS 'The one-time back-pay for pre-levels progress has been granted.';

CREATE OR REPLACE FUNCTION add_user_xp(p_user UUID, p_delta INTEGER, p_seed INTEGER DEFAULT 0)
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO user_profiles (id, xp_total, xp_seeded, updated_at)
  VALUES (p_user, GREATEST(p_delta, 0) + GREATEST(p_seed, 0), p_seed > 0, NOW())
  ON CONFLICT (id) DO UPDATE
    SET xp_total = user_profiles.xp_total + GREATEST(p_delta, 0)
          + CASE WHEN user_profiles.xp_seeded THEN 0 ELSE GREATEST(p_seed, 0) END,
        xp_seeded = user_profiles.xp_seeded OR p_seed > 0,
        updated_at = CASE WHEN p_delta > 0 OR p_seed > 0 THEN NOW() ELSE user_profiles.updated_at END
  RETURNING xp_total;
$$;

-- Only the server (service role, after verifying the caller) may add XP --
-- never the public anon key or a signed-in client directly.
REVOKE EXECUTE ON FUNCTION add_user_xp(UUID, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION add_user_xp(UUID, INTEGER, INTEGER) TO service_role;
