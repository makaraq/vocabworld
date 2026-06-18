-- Idempotency for offline progress replay.
--
-- When the client replays word-played events queued offline, an ambiguous
-- reconnect (server applied the write but the response was lost) could re-send
-- the same event and double-count play_count / leaderboard score. The client
-- generates a stable clientEventId per play; the /api/progress/track route
-- records processed ids here and skips the increment on a repeat.
--
-- Apply on Supabase (SQL editor) before deploying the updated API.

CREATE TABLE IF NOT EXISTS processed_progress_events (
  client_event_id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lookups/cleanup by user
CREATE INDEX IF NOT EXISTS idx_processed_progress_events_user
ON processed_progress_events(user_id);

-- Enable Row Level Security
ALTER TABLE processed_progress_events ENABLE ROW LEVEL SECURITY;

-- RLS: users may only see/insert their own dedup rows. (The API uses the
-- service-role key, which bypasses RLS; these policies cover any client-side
-- access and keep the table consistent with the other progress tables.)
DROP POLICY IF EXISTS "Users can view own processed events" ON processed_progress_events;
CREATE POLICY "Users can view own processed events"
  ON processed_progress_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own processed events" ON processed_progress_events;
CREATE POLICY "Users can insert own processed events"
  ON processed_progress_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
