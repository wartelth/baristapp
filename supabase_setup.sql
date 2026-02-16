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

-- Stores user profile fields used for social sharing metadata
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id        text        PRIMARY KEY,
  display_name   text        NOT NULL DEFAULT 'user',
  avatar_index   int         NOT NULL DEFAULT 0,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- Share links for mini-apps (owner can rotate/regenerate)
CREATE TABLE IF NOT EXISTS mini_app_shares (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id  text        NOT NULL,
  app_id         text        NOT NULL,
  share_code     text        NOT NULL UNIQUE,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),
  UNIQUE(owner_user_id, app_id)
);

-- Which shared apps a user imported/installed
CREATE TABLE IF NOT EXISTS mini_app_installs (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id    text        NOT NULL,
  source_app_id    text        NOT NULL,
  installer_user_id text       NOT NULL,
  installed_app_id text        NOT NULL,
  created_at       timestamptz DEFAULT now(),
  UNIQUE(owner_user_id, source_app_id, installer_user_id)
);

-- Developer curated mini-app templates shown in the Library screen
CREATE TABLE IF NOT EXISTS featured_mini_apps (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  slug          text        NOT NULL UNIQUE,
  title         text        NOT NULL,
  description   text        NOT NULL DEFAULT '',
  icon          text,
  spec          jsonb       NOT NULL,
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- Per-user action on featured templates: added or ignored
CREATE TABLE IF NOT EXISTS featured_app_user_actions (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         text        NOT NULL,
  featured_app_id uuid        NOT NULL REFERENCES featured_mini_apps(id) ON DELETE CASCADE,
  action          text        NOT NULL CHECK (action IN ('added', 'ignored')),
  installed_app_id text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(user_id, featured_app_id)
);

-- Subscription state (plan and provider linkage)
CREATE TABLE IF NOT EXISTS user_subscription_state (
  user_id text PRIMARY KEY,
  plan_key text NOT NULL DEFAULT 'free' CHECK (plan_key IN ('free', 'pro')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled')),
  provider text NOT NULL DEFAULT 'manual',
  provider_customer_id text,
  provider_subscription_id text,
  current_period_start timestamptz DEFAULT now(),
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Raw model usage events (one row per generate/modify request)
CREATE TABLE IF NOT EXISTS model_usage_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  app_id text NOT NULL,
  request_type text NOT NULL CHECK (request_type IN ('generate', 'modify')),
  model_name text NOT NULL,
  cost_usd numeric(12, 6) NOT NULL DEFAULT 0,
  num_turns int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Aggregate usage totals per user
CREATE TABLE IF NOT EXISTS user_usage_totals (
  user_id text PRIMARY KEY,
  total_model_cost_usd numeric(12, 6) NOT NULL DEFAULT 0,
  total_generations int NOT NULL DEFAULT 0,
  total_modifications int NOT NULL DEFAULT 0,
  last_event_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

-- Aggregate usage totals per app (scoped to a user)
CREATE TABLE IF NOT EXISTS app_usage_totals (
  user_id text NOT NULL,
  app_id text NOT NULL,
  total_model_cost_usd numeric(12, 6) NOT NULL DEFAULT 0,
  total_generations int NOT NULL DEFAULT 0,
  total_modifications int NOT NULL DEFAULT 0,
  last_event_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, app_id)
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

CREATE INDEX IF NOT EXISTS idx_mini_app_shares_owner_app
  ON mini_app_shares (owner_user_id, app_id);

CREATE INDEX IF NOT EXISTS idx_mini_app_installs_installer
  ON mini_app_installs (installer_user_id);

CREATE INDEX IF NOT EXISTS idx_featured_mini_apps_active
  ON featured_mini_apps (is_active);

CREATE INDEX IF NOT EXISTS idx_featured_actions_user
  ON featured_app_user_actions (user_id, featured_app_id);

CREATE INDEX IF NOT EXISTS idx_model_usage_events_user_created
  ON model_usage_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_model_usage_events_user_type_created
  ON model_usage_events (user_id, request_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_model_usage_events_user_app
  ON model_usage_events (user_id, app_id);

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

DROP TRIGGER IF EXISTS trg_mini_apps_updated_at ON mini_apps;
CREATE TRIGGER trg_mini_apps_updated_at
  BEFORE UPDATE ON mini_apps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_mini_app_state_updated_at ON mini_app_state;
CREATE TRIGGER trg_mini_app_state_updated_at
  BEFORE UPDATE ON mini_app_state
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_mini_app_shares_updated_at ON mini_app_shares;
CREATE TRIGGER trg_mini_app_shares_updated_at
  BEFORE UPDATE ON mini_app_shares
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_featured_mini_apps_updated_at ON featured_mini_apps;
CREATE TRIGGER trg_featured_mini_apps_updated_at
  BEFORE UPDATE ON featured_mini_apps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_featured_actions_updated_at ON featured_app_user_actions;
CREATE TRIGGER trg_featured_actions_updated_at
  BEFORE UPDATE ON featured_app_user_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_user_subscription_state_updated_at ON user_subscription_state;
CREATE TRIGGER trg_user_subscription_state_updated_at
  BEFORE UPDATE ON user_subscription_state
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_user_usage_totals_updated_at ON user_usage_totals;
CREATE TRIGGER trg_user_usage_totals_updated_at
  BEFORE UPDATE ON user_usage_totals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_app_usage_totals_updated_at ON app_usage_totals;
CREATE TRIGGER trg_app_usage_totals_updated_at
  BEFORE UPDATE ON app_usage_totals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Atomic helpers for aggregate updates from the backend
CREATE OR REPLACE FUNCTION increment_user_usage_totals(
  p_user_id text,
  p_cost_usd numeric,
  p_generations_delta int,
  p_modifications_delta int,
  p_event_at timestamptz
)
RETURNS void AS $$
BEGIN
  INSERT INTO user_usage_totals (
    user_id,
    total_model_cost_usd,
    total_generations,
    total_modifications,
    last_event_at,
    updated_at
  )
  VALUES (
    p_user_id,
    GREATEST(p_cost_usd, 0),
    GREATEST(p_generations_delta, 0),
    GREATEST(p_modifications_delta, 0),
    p_event_at,
    now()
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    total_model_cost_usd = user_usage_totals.total_model_cost_usd + GREATEST(p_cost_usd, 0),
    total_generations = user_usage_totals.total_generations + GREATEST(p_generations_delta, 0),
    total_modifications = user_usage_totals.total_modifications + GREATEST(p_modifications_delta, 0),
    last_event_at = p_event_at,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_app_usage_totals(
  p_user_id text,
  p_app_id text,
  p_cost_usd numeric,
  p_generations_delta int,
  p_modifications_delta int,
  p_event_at timestamptz
)
RETURNS void AS $$
BEGIN
  INSERT INTO app_usage_totals (
    user_id,
    app_id,
    total_model_cost_usd,
    total_generations,
    total_modifications,
    last_event_at,
    updated_at
  )
  VALUES (
    p_user_id,
    p_app_id,
    GREATEST(p_cost_usd, 0),
    GREATEST(p_generations_delta, 0),
    GREATEST(p_modifications_delta, 0),
    p_event_at,
    now()
  )
  ON CONFLICT (user_id, app_id)
  DO UPDATE SET
    total_model_cost_usd = app_usage_totals.total_model_cost_usd + GREATEST(p_cost_usd, 0),
    total_generations = app_usage_totals.total_generations + GREATEST(p_generations_delta, 0),
    total_modifications = app_usage_totals.total_modifications + GREATEST(p_modifications_delta, 0),
    last_event_at = p_event_at,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------------------------------------
-- 4. Row-Level Security (RLS)
-- --------------------------------------------------------------------------

ALTER TABLE mini_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE mini_app_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE mini_app_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE mini_app_installs ENABLE ROW LEVEL SECURITY;
ALTER TABLE featured_mini_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE featured_app_user_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscription_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_usage_totals ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_usage_totals ENABLE ROW LEVEL SECURITY;

-- Allow the service_role key (used by the server) full access.
-- The server proxies all requests and sets x-device-id as user_id,
-- so RLS is mainly a safety net — the server is the gatekeeper.

-- mini_apps: service_role can do everything
DROP POLICY IF EXISTS "service_role_all_mini_apps" ON mini_apps;
CREATE POLICY "service_role_all_mini_apps"
  ON mini_apps
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- mini_app_state: service_role can do everything
DROP POLICY IF EXISTS "service_role_all_mini_app_state" ON mini_app_state;
CREATE POLICY "service_role_all_mini_app_state"
  ON mini_app_state
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_user_profiles" ON user_profiles;
CREATE POLICY "service_role_all_user_profiles"
  ON user_profiles
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_mini_app_shares" ON mini_app_shares;
CREATE POLICY "service_role_all_mini_app_shares"
  ON mini_app_shares
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_mini_app_installs" ON mini_app_installs;
CREATE POLICY "service_role_all_mini_app_installs"
  ON mini_app_installs
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_featured_mini_apps" ON featured_mini_apps;
CREATE POLICY "service_role_all_featured_mini_apps"
  ON featured_mini_apps
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_featured_actions" ON featured_app_user_actions;
CREATE POLICY "service_role_all_featured_actions"
  ON featured_app_user_actions
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_user_subscription_state" ON user_subscription_state;
CREATE POLICY "service_role_all_user_subscription_state"
  ON user_subscription_state
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_model_usage_events" ON model_usage_events;
CREATE POLICY "service_role_all_model_usage_events"
  ON model_usage_events
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_user_usage_totals" ON user_usage_totals;
CREATE POLICY "service_role_all_user_usage_totals"
  ON user_usage_totals
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_app_usage_totals" ON app_usage_totals;
CREATE POLICY "service_role_all_app_usage_totals"
  ON app_usage_totals
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
-- 6. Seed official featured mini-app templates
-- --------------------------------------------------------------------------

INSERT INTO featured_mini_apps (slug, title, description, icon, spec, is_active)
VALUES
  (
    'official-tic-tac-toe',
    'Tic Tac Toe',
    'Pass-and-play tic tac toe scoreboard with round and turn tracking.',
    '⭕',
    $ttt$
    {
      "appId": "official-tic-tac-toe",
      "title": "Tic Tac Toe",
      "icon": "⭕",
      "version": 2,
      "capabilities": ["localStorage", "haptics"],
      "initialState": {
        "currentPlayer": "X",
        "xWins": 0,
        "oWins": 0,
        "draws": 0,
        "round": 1,
        "note": "",
        "history": []
      },
      "screens": [
        {
          "id": "main",
          "title": "Scoreboard",
          "components": [
            { "type": "text", "id": "title", "props": { "content": "Tic Tac Toe", "variant": "title" } },
            { "type": "text", "id": "roundLabel", "props": { "content": "Round", "variant": "subtitle" } },
            { "type": "text", "id": "roundValue", "props": { "content": "1", "stateKey": "round", "variant": "subtitle" } },
            { "type": "text", "id": "turnLabel", "props": { "content": "Current Turn" } },
            { "type": "text", "id": "turnValue", "props": { "content": "X", "stateKey": "currentPlayer", "variant": "subtitle" } },
            {
              "type": "container",
              "id": "scoresRow",
              "props": {
                "direction": "row",
                "gap": 10,
                "children": [
                  { "type": "text", "id": "xWinsLabel", "props": { "content": "X wins:" } },
                  { "type": "text", "id": "xWinsValue", "props": { "content": "0", "stateKey": "xWins" } },
                  { "type": "text", "id": "oWinsLabel", "props": { "content": "O wins:" } },
                  { "type": "text", "id": "oWinsValue", "props": { "content": "0", "stateKey": "oWins" } },
                  { "type": "text", "id": "drawsLabel", "props": { "content": "Draws:" } },
                  { "type": "text", "id": "drawsValue", "props": { "content": "0", "stateKey": "draws" } }
                ]
              }
            },
            {
              "type": "container",
              "id": "winnerButtons",
              "props": {
                "direction": "row",
                "gap": 8,
                "children": [
                  {
                    "type": "button",
                    "id": "xWonBtn",
                    "props": {
                      "label": "X won",
                      "action": {
                        "type": "batch",
                        "actions": [
                          { "type": "compute", "operation": "increment", "key": "xWins" },
                          { "type": "compute", "operation": "increment", "key": "round" },
                          { "type": "setState", "key": "currentPlayer", "value": "X" },
                          { "type": "haptic", "style": "success" }
                        ]
                      }
                    }
                  },
                  {
                    "type": "button",
                    "id": "oWonBtn",
                    "props": {
                      "label": "O won",
                      "action": {
                        "type": "batch",
                        "actions": [
                          { "type": "compute", "operation": "increment", "key": "oWins" },
                          { "type": "compute", "operation": "increment", "key": "round" },
                          { "type": "setState", "key": "currentPlayer", "value": "X" },
                          { "type": "haptic", "style": "success" }
                        ]
                      }
                    }
                  },
                  {
                    "type": "button",
                    "id": "drawBtn",
                    "props": {
                      "label": "Draw",
                      "action": {
                        "type": "batch",
                        "actions": [
                          { "type": "compute", "operation": "increment", "key": "draws" },
                          { "type": "compute", "operation": "increment", "key": "round" },
                          { "type": "setState", "key": "currentPlayer", "value": "X" }
                        ]
                      }
                    }
                  }
                ]
              }
            },
            {
              "type": "button",
              "id": "nextTurnBtn",
              "props": {
                "label": "Switch turn",
                "action": {
                  "type": "conditional",
                  "stateKey": "currentPlayer",
                  "operator": "eq",
                  "value": "X",
                  "thenAction": { "type": "setState", "key": "currentPlayer", "value": "O" },
                  "elseAction": { "type": "setState", "key": "currentPlayer", "value": "X" }
                }
              }
            },
            { "type": "input", "id": "noteInput", "props": { "stateKey": "note", "placeholder": "Round notes" } },
            { "type": "button", "id": "saveNoteBtn", "props": { "label": "Save round note", "action": { "type": "append", "key": "history", "fromKey": "note" } } },
            {
              "type": "list",
              "id": "historyList",
              "props": {
                "dataKey": "history",
                "emptyText": "No notes yet",
                "renderItem": {
                  "components": [
                    { "type": "text", "id": "historyText", "props": { "content": "", "stateKey": "_itemValue" } }
                  ]
                }
              }
            }
          ]
        }
      ]
    }
    $ttt$::jsonb,
    true
  ),
  (
    'official-would-you-rather-party',
    'Would-You-Rather Party',
    'Create fast party prompts and track group votes in real time.',
    '🤔',
    $wyr$
    {
      "appId": "official-would-you-rather-party",
      "title": "Would-You-Rather Party",
      "icon": "🤔",
      "version": 2,
      "capabilities": ["localStorage", "haptics"],
      "initialState": {
        "round": 1,
        "prompt": "",
        "optionA": "",
        "optionB": "",
        "votesA": 0,
        "votesB": 0,
        "savedPrompts": []
      },
      "screens": [
        {
          "id": "main",
          "title": "Party",
          "components": [
            { "type": "text", "id": "title", "props": { "content": "Would-You-Rather Party", "variant": "title" } },
            { "type": "text", "id": "roundLabel", "props": { "content": "Round", "variant": "subtitle" } },
            { "type": "text", "id": "roundValue", "props": { "content": "1", "stateKey": "round", "variant": "subtitle" } },
            { "type": "input", "id": "promptInput", "props": { "stateKey": "prompt", "placeholder": "Prompt (for example, beach or mountains?)" } },
            { "type": "input", "id": "optionAInput", "props": { "stateKey": "optionA", "placeholder": "Option A" } },
            { "type": "input", "id": "optionBInput", "props": { "stateKey": "optionB", "placeholder": "Option B" } },
            { "type": "button", "id": "savePromptBtn", "props": { "label": "Save prompt", "action": { "type": "append", "key": "savedPrompts", "fromKey": "prompt" } } },
            {
              "type": "container",
              "id": "voteButtonsRow",
              "props": {
                "direction": "row",
                "gap": 8,
                "children": [
                  { "type": "button", "id": "voteABtn", "props": { "label": "Vote A", "action": { "type": "batch", "actions": [ { "type": "compute", "operation": "increment", "key": "votesA" }, { "type": "haptic", "style": "light" } ] } } },
                  { "type": "button", "id": "voteBBtn", "props": { "label": "Vote B", "action": { "type": "batch", "actions": [ { "type": "compute", "operation": "increment", "key": "votesB" }, { "type": "haptic", "style": "light" } ] } } }
                ]
              }
            },
            {
              "type": "container",
              "id": "votesRow",
              "props": {
                "direction": "row",
                "gap": 10,
                "children": [
                  { "type": "text", "id": "votesALabel", "props": { "content": "A:" } },
                  { "type": "text", "id": "votesAValue", "props": { "content": "0", "stateKey": "votesA" } },
                  { "type": "text", "id": "votesBLabel", "props": { "content": "B:" } },
                  { "type": "text", "id": "votesBValue", "props": { "content": "0", "stateKey": "votesB" } }
                ]
              }
            },
            {
              "type": "button",
              "id": "nextRoundBtn",
              "props": {
                "label": "Next round",
                "action": {
                  "type": "batch",
                  "actions": [
                    { "type": "compute", "operation": "increment", "key": "round" },
                    { "type": "setState", "key": "votesA", "value": 0 },
                    { "type": "setState", "key": "votesB", "value": 0 }
                  ]
                }
              }
            },
            {
              "type": "list",
              "id": "savedPromptsList",
              "props": {
                "dataKey": "savedPrompts",
                "emptyText": "No prompts saved yet",
                "renderItem": {
                  "components": [
                    { "type": "text", "id": "savedPromptText", "props": { "content": "", "stateKey": "_itemValue" } }
                  ]
                }
              }
            }
          ]
        }
      ]
    }
    $wyr$::jsonb,
    true
  ),
  (
    'official-debate-duel-timer',
    'Debate Duel Timer',
    'Alternating timer for two speakers with quick side switching.',
    '🎤',
    $debate$
    {
      "appId": "official-debate-duel-timer",
      "title": "Debate Duel Timer",
      "icon": "🎤",
      "version": 2,
      "capabilities": ["localStorage", "haptics"],
      "initialState": {
        "activeSide": "A",
        "sideASeconds": 0,
        "sideBSeconds": 0,
        "totalSeconds": 0
      },
      "screens": [
        {
          "id": "main",
          "title": "Timer",
          "components": [
            { "type": "text", "id": "title", "props": { "content": "Debate Duel Timer", "variant": "title" } },
            { "type": "text", "id": "activeSideLabel", "props": { "content": "Active side", "variant": "subtitle" } },
            { "type": "text", "id": "activeSideValue", "props": { "content": "A", "stateKey": "activeSide", "variant": "subtitle" } },
            {
              "type": "container",
              "id": "controlsRow",
              "props": {
                "direction": "row",
                "gap": 8,
                "children": [
                  {
                    "type": "button",
                    "id": "startBtn",
                    "props": {
                      "label": "Start",
                      "action": {
                        "type": "timer",
                        "timerId": "debate",
                        "command": "start",
                        "intervalMs": 1000,
                        "tickAction": {
                          "type": "batch",
                          "actions": [
                            { "type": "compute", "operation": "increment", "key": "totalSeconds" },
                            {
                              "type": "conditional",
                              "stateKey": "activeSide",
                              "operator": "eq",
                              "value": "A",
                              "thenAction": { "type": "compute", "operation": "increment", "key": "sideASeconds" },
                              "elseAction": { "type": "compute", "operation": "increment", "key": "sideBSeconds" }
                            }
                          ]
                        }
                      }
                    }
                  },
                  { "type": "button", "id": "pauseBtn", "props": { "label": "Pause", "action": { "type": "timer", "timerId": "debate", "command": "stop" } } },
                  {
                    "type": "button",
                    "id": "resetBtn",
                    "props": {
                      "label": "Reset",
                      "action": {
                        "type": "batch",
                        "actions": [
                          { "type": "timer", "timerId": "debate", "command": "stop" },
                          { "type": "setState", "key": "sideASeconds", "value": 0 },
                          { "type": "setState", "key": "sideBSeconds", "value": 0 },
                          { "type": "setState", "key": "totalSeconds", "value": 0 },
                          { "type": "setState", "key": "activeSide", "value": "A" }
                        ]
                      }
                    }
                  }
                ]
              }
            },
            {
              "type": "button",
              "id": "switchSideBtn",
              "props": {
                "label": "Switch side",
                "action": {
                  "type": "conditional",
                  "stateKey": "activeSide",
                  "operator": "eq",
                  "value": "A",
                  "thenAction": { "type": "setState", "key": "activeSide", "value": "B" },
                  "elseAction": { "type": "setState", "key": "activeSide", "value": "A" }
                }
              }
            },
            { "type": "text", "id": "aLabel", "props": { "content": "Side A time (target 180s)" } },
            { "type": "text", "id": "aTime", "props": { "content": "0", "stateKey": "sideASeconds" } },
            { "type": "progress", "id": "aProgress", "props": { "stateKey": "sideASeconds", "max": 180, "label": "A progress" } },
            { "type": "text", "id": "bLabel", "props": { "content": "Side B time (target 180s)" } },
            { "type": "text", "id": "bTime", "props": { "content": "0", "stateKey": "sideBSeconds" } },
            { "type": "progress", "id": "bProgress", "props": { "stateKey": "sideBSeconds", "max": 180, "label": "B progress" } },
            { "type": "text", "id": "totalLabel", "props": { "content": "Total elapsed seconds" } },
            { "type": "text", "id": "totalTime", "props": { "content": "0", "stateKey": "totalSeconds" } }
          ]
        }
      ]
    }
    $debate$::jsonb,
    true
  ),
  (
    'official-book-club-companion',
    'Book Club Companion',
    'Pull a live classics list from a public API and keep meeting notes.',
    '📚',
    $book$
    {
      "appId": "official-book-club-companion",
      "title": "Book Club Companion",
      "icon": "📚",
      "version": 2,
      "capabilities": ["localStorage", "network"],
      "initialState": {
        "books": [],
        "loadingBooks": false,
        "apiError": "",
        "clubNote": "",
        "clubNotes": []
      },
      "screens": [
        {
          "id": "main",
          "title": "Companion",
          "components": [
            { "type": "text", "id": "title", "props": { "content": "Book Club Companion", "variant": "title" } },
            { "type": "text", "id": "subtitle", "props": { "content": "Load suggestions, then save your meeting notes." } },
            {
              "type": "button",
              "id": "loadBooksBtn",
              "props": {
                "label": "Load classic books (public API)",
                "action": {
                  "type": "http",
                  "url": "https://raw.githubusercontent.com/benoitvallon/100-best-books/master/books.json",
                  "method": "GET",
                  "resultKey": "books",
                  "loadingKey": "loadingBooks",
                  "errorKey": "apiError"
                }
              }
            },
            {
              "type": "text",
              "id": "loadingText",
              "props": { "content": "Loading books..." },
              "visibleWhen": { "stateKey": "loadingBooks", "operator": "truthy" }
            },
            {
              "type": "text",
              "id": "errorText",
              "props": { "content": "", "stateKey": "apiError", "variant": "caption" },
              "visibleWhen": { "stateKey": "apiError", "operator": "truthy" }
            },
            {
              "type": "list",
              "id": "booksList",
              "props": {
                "dataKey": "books",
                "emptyText": "No books loaded yet",
                "renderItem": {
                  "components": [
                    { "type": "text", "id": "bookTitle", "props": { "content": "", "stateKey": "title", "variant": "subtitle" } },
                    { "type": "text", "id": "bookAuthor", "props": { "content": "", "stateKey": "author" } }
                  ]
                }
              }
            },
            { "type": "input", "id": "clubNoteInput", "props": { "stateKey": "clubNote", "placeholder": "Add a meeting note" } },
            { "type": "button", "id": "saveClubNoteBtn", "props": { "label": "Save note", "action": { "type": "append", "key": "clubNotes", "fromKey": "clubNote" } } },
            {
              "type": "list",
              "id": "clubNotesList",
              "props": {
                "dataKey": "clubNotes",
                "emptyText": "No notes yet",
                "renderItem": {
                  "components": [
                    { "type": "text", "id": "clubNoteItem", "props": { "content": "", "stateKey": "_itemValue" } }
                  ]
                }
              }
            }
          ]
        }
      ]
    }
    $book$::jsonb,
    true
  )
ON CONFLICT (slug) DO UPDATE
SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  spec = EXCLUDED.spec,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- --------------------------------------------------------------------------
-- 7. Verify
-- --------------------------------------------------------------------------

-- Quick sanity check — these should return empty results, no errors
SELECT * FROM mini_apps LIMIT 0;
SELECT * FROM mini_app_state LIMIT 0;
SELECT * FROM user_profiles LIMIT 0;
SELECT * FROM mini_app_shares LIMIT 0;
SELECT * FROM mini_app_installs LIMIT 0;
SELECT * FROM featured_mini_apps LIMIT 0;
SELECT * FROM featured_app_user_actions LIMIT 0;
SELECT * FROM user_subscription_state LIMIT 0;
SELECT * FROM model_usage_events LIMIT 0;
SELECT * FROM user_usage_totals LIMIT 0;
SELECT * FROM app_usage_totals LIMIT 0;
