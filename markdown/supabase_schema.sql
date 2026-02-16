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
  display_name text NOT NULL DEFAULT 'user',
  avatar_index int NOT NULL DEFAULT 0,
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
-- 4. SOCIAL SHARING
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.mini_app_shares (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_user_id text NOT NULL,
  app_id text NOT NULL,
  share_code text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT mini_app_shares_pkey PRIMARY KEY (id),
  CONSTRAINT mini_app_shares_owner_app_unique UNIQUE (owner_user_id, app_id)
);

CREATE INDEX IF NOT EXISTS idx_mini_app_shares_owner_app
  ON public.mini_app_shares (owner_user_id, app_id);

CREATE TABLE IF NOT EXISTS public.mini_app_installs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_user_id text NOT NULL,
  source_app_id text NOT NULL,
  installer_user_id text NOT NULL,
  installed_app_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT mini_app_installs_pkey PRIMARY KEY (id),
  CONSTRAINT mini_app_installs_unique UNIQUE (owner_user_id, source_app_id, installer_user_id)
);

CREATE INDEX IF NOT EXISTS idx_mini_app_installs_installer
  ON public.mini_app_installs (installer_user_id);

CREATE TABLE IF NOT EXISTS public.featured_mini_apps (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text,
  spec jsonb NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT featured_mini_apps_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_featured_mini_apps_active
  ON public.featured_mini_apps (is_active);

CREATE TABLE IF NOT EXISTS public.featured_app_user_actions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  featured_app_id uuid NOT NULL REFERENCES public.featured_mini_apps(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('added', 'ignored')),
  installed_app_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT featured_app_user_actions_pkey PRIMARY KEY (id),
  CONSTRAINT featured_user_action_unique UNIQUE (user_id, featured_app_id)
);

CREATE INDEX IF NOT EXISTS idx_featured_actions_user
  ON public.featured_app_user_actions (user_id, featured_app_id);

-- =============================================================================
-- 5. BILLING + MODEL USAGE TRACKING
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_subscription_state (
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

CREATE TABLE IF NOT EXISTS public.model_usage_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  app_id text NOT NULL,
  request_type text NOT NULL CHECK (request_type IN ('generate', 'modify')),
  model_name text NOT NULL,
  cost_usd numeric(12, 6) NOT NULL DEFAULT 0,
  num_turns int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT model_usage_events_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_model_usage_events_user_created
  ON public.model_usage_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_model_usage_events_user_type_created
  ON public.model_usage_events (user_id, request_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_model_usage_events_user_app
  ON public.model_usage_events (user_id, app_id);

CREATE TABLE IF NOT EXISTS public.user_usage_totals (
  user_id text PRIMARY KEY,
  total_model_cost_usd numeric(12, 6) NOT NULL DEFAULT 0,
  total_generations int NOT NULL DEFAULT 0,
  total_modifications int NOT NULL DEFAULT 0,
  last_event_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.app_usage_totals (
  user_id text NOT NULL,
  app_id text NOT NULL,
  total_model_cost_usd numeric(12, 6) NOT NULL DEFAULT 0,
  total_generations int NOT NULL DEFAULT 0,
  total_modifications int NOT NULL DEFAULT 0,
  last_event_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT app_usage_totals_pkey PRIMARY KEY (user_id, app_id)
);

CREATE OR REPLACE FUNCTION public.increment_user_usage_totals(
  p_user_id text,
  p_cost_usd numeric,
  p_generations_delta int,
  p_modifications_delta int,
  p_event_at timestamptz
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.user_usage_totals (
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
    total_model_cost_usd = public.user_usage_totals.total_model_cost_usd + GREATEST(p_cost_usd, 0),
    total_generations = public.user_usage_totals.total_generations + GREATEST(p_generations_delta, 0),
    total_modifications = public.user_usage_totals.total_modifications + GREATEST(p_modifications_delta, 0),
    last_event_at = p_event_at,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_app_usage_totals(
  p_user_id text,
  p_app_id text,
  p_cost_usd numeric,
  p_generations_delta int,
  p_modifications_delta int,
  p_event_at timestamptz
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.app_usage_totals (
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
    total_model_cost_usd = public.app_usage_totals.total_model_cost_usd + GREATEST(p_cost_usd, 0),
    total_generations = public.app_usage_totals.total_generations + GREATEST(p_generations_delta, 0),
    total_modifications = public.app_usage_totals.total_modifications + GREATEST(p_modifications_delta, 0),
    last_event_at = p_event_at,
    updated_at = now();
END;
$$;

-- =============================================================================
-- 6. HELPER: Ensure user profile exists on first use
-- =============================================================================
-- Call from server when user is first seen (e.g. on generate or storage PUT).

-- Example usage in server:
-- await supabase.from('user_profiles').upsert(
--   { user_id, updated_at: new Date().toISOString() },
--   { onConflict: 'user_id' }
-- );

-- =============================================================================
-- 7. QUOTA RESET (run daily via cron or on-demand)
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
-- user_profiles:  user_id, declared_age_bracket (Apple 4.7.5), quotas, display_name, avatar_index
-- mini_apps:      user_id, app_id, spec (one row per user per mini-app)
-- mini_app_state: user_id, app_id, state (one row per user per mini-app)
-- mini_app_shares: share links for each owned app
-- mini_app_installs: imported shared apps per installer
-- featured_mini_apps: developer curated mini-app templates
-- featured_app_user_actions: whether user added/ignored each featured template
-- user_subscription_state: user plan state and provider ids
-- model_usage_events: per-request model usage and spend
-- user_usage_totals: aggregate model spend/counters per user
-- app_usage_totals: aggregate model spend/counters per app
--
-- Not stored (keep minimal): name, email — only when Supabase Auth added
