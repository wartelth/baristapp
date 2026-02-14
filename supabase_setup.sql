-- ============================================================================
-- SwissKnife Supabase Setup
-- Run this entire file in the Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Tables
-- --------------------------------------------------------------------------

-- Stores generated mini-app specs (JSON)
CREATE TABLE IF NOT EXISTS mini_apps (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     text        NOT NULL,
  app_id      text        NOT NULL,
  spec        jsonb       NOT NULL,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, app_id)
);

-- Stores per-user, per-app runtime state (JSON)
CREATE TABLE IF NOT EXISTS mini_app_state (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     text        NOT NULL,
  app_id      text        NOT NULL,
  state       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  updated_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, app_id)
);

-- --------------------------------------------------------------------------
-- 2. Indexes for fast lookups
-- --------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_mini_apps_user_app
  ON mini_apps (user_id, app_id);

CREATE INDEX IF NOT EXISTS idx_mini_app_state_user_app
  ON mini_app_state (user_id, app_id);

CREATE INDEX IF NOT EXISTS idx_mini_apps_user_id
  ON mini_apps (user_id);

-- --------------------------------------------------------------------------
-- 3. Auto-update updated_at on row changes
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_mini_apps_updated_at
  BEFORE UPDATE ON mini_apps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_mini_app_state_updated_at
  BEFORE UPDATE ON mini_app_state
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- --------------------------------------------------------------------------
-- 4. Row-Level Security (RLS)
-- --------------------------------------------------------------------------

ALTER TABLE mini_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE mini_app_state ENABLE ROW LEVEL SECURITY;

-- Allow the service_role key (used by the server) full access.
-- The server proxies all requests and sets x-device-id as user_id,
-- so RLS is mainly a safety net — the server is the gatekeeper.

-- mini_apps: service_role can do everything
CREATE POLICY "service_role_all_mini_apps"
  ON mini_apps
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- mini_app_state: service_role can do everything
CREATE POLICY "service_role_all_mini_app_state"
  ON mini_app_state
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- --------------------------------------------------------------------------
-- 5. Optional: anon key read access (if you ever want direct client reads)
-- --------------------------------------------------------------------------

-- Users can only read their own apps (matched by user_id claim or header)
-- Uncomment these if you want to allow direct Supabase client access later:

-- CREATE POLICY "anon_read_own_mini_apps"
--   ON mini_apps
--   FOR SELECT
--   USING (user_id = current_setting('request.headers')::json->>'x-device-id');

-- CREATE POLICY "anon_read_own_mini_app_state"
--   ON mini_app_state
--   FOR SELECT
--   USING (user_id = current_setting('request.headers')::json->>'x-device-id');

-- --------------------------------------------------------------------------
-- 6. Verify
-- --------------------------------------------------------------------------

-- Quick sanity check — these should return empty results, no errors
SELECT * FROM mini_apps LIMIT 0;
SELECT * FROM mini_app_state LIMIT 0;
