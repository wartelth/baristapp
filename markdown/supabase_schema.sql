-- SwissKnife Supabase Schema
-- Run this in Supabase SQL Editor to set up the database.
-- Compatible with device_id (current) and Supabase Auth (future).
--
-- NOTE: If mini_apps or mini_app_state have duplicate (user_id, app_id) rows,
-- deduplicate before adding the UNIQUE constraint (keep latest by updated_at).

-- =============================================================================
-- 0. MIGRATION: If you already have mini_apps / mini_app_state
-- =============================================================================
-- Run this block first if tables exist but lack unique constraints.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mini_apps') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'mini_apps_user_app_unique'
    ) THEN
      ALTER TABLE public.mini_apps ADD CONSTRAINT mini_apps_user_app_unique UNIQUE (user_id, app_id);
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mini_app_state') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'mini_app_state_user_app_unique'
    ) THEN
      ALTER TABLE public.mini_app_state ADD CONSTRAINT mini_app_state_user_app_unique UNIQUE (user_id, app_id);
    END IF;
  END IF;
END $$;

-- =============================================================================
-- 1. USER PROFILES (new)
-- =============================================================================
-- Stores user metadata, age declaration (Apple 4.7.5), and quotas.
-- user_id = device UUID (current) or auth.users.id (when Supabase Auth added)

CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id text PRIMARY KEY,
  -- Apple 4.7.5: age restriction for mini-apps that exceed app rating
  -- 'all' = no restriction, '13+' = must declare 13+, '18+' = must declare 18+
  declared_age_bracket text NOT NULL DEFAULT 'all' CHECK (declared_age_bracket IN ('all', '13+', '18+')),
  -- Quotas (reset daily)
  generations_used_today int NOT NULL DEFAULT 0,
  modifications_used_today int NOT NULL DEFAULT 0,
  last_quota_reset_at date DEFAULT CURRENT_DATE,
  max_mini_apps int NOT NULL DEFAULT 50,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================================================
-- 2. MINI APPS (existing — ensure unique constraint)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.mini_apps (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  app_id text NOT NULL,
  spec jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT mini_apps_pkey PRIMARY KEY (id),
  CONSTRAINT mini_apps_user_app_unique UNIQUE (user_id, app_id)
);

CREATE INDEX IF NOT EXISTS idx_mini_apps_user_id ON public.mini_apps (user_id);

-- =============================================================================
-- 3. MINI APP STATE (existing — ensure unique constraint)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.mini_app_state (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  app_id text NOT NULL,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT mini_app_state_pkey PRIMARY KEY (id),
  CONSTRAINT mini_app_state_user_app_unique UNIQUE (user_id, app_id)
);

CREATE INDEX IF NOT EXISTS idx_mini_app_state_user_id ON public.mini_app_state (user_id);

-- =============================================================================
-- 4. HELPER: Ensure user profile exists on first use
-- =============================================================================
-- Call from server when user is first seen (e.g. on generate or storage PUT).

-- Example usage in server:
-- await supabase.from('user_profiles').upsert(
--   { user_id, updated_at: new Date().toISOString() },
--   { onConflict: 'user_id' }
-- );

-- =============================================================================
-- 5. QUOTA RESET (run daily via cron or on-demand)
-- =============================================================================
-- Resets daily counters when date has changed.

CREATE OR REPLACE FUNCTION public.reset_daily_quotas()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.user_profiles
  SET
    generations_used_today = 0,
    modifications_used_today = 0,
    last_quota_reset_at = CURRENT_DATE,
    updated_at = now()
  WHERE last_quota_reset_at < CURRENT_DATE;
END;
$$;

-- Optional: Supabase cron (if available) — run at midnight UTC
-- SELECT cron.schedule('reset-quotas', '0 0 * * *', 'SELECT public.reset_daily_quotas()');

-- =============================================================================
-- SUMMARY: User data we store
-- =============================================================================
-- user_profiles:  user_id, declared_age_bracket (Apple 4.7.5), quotas
-- mini_apps:      user_id, app_id, spec (one row per user per mini-app)
-- mini_app_state: user_id, app_id, state (one row per user per mini-app)
--
-- Not stored (keep minimal): name, email — only when Supabase Auth added
