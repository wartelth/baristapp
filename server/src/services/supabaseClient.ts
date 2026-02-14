/**
 * Server-side Supabase client using the service role key.
 * Bypasses RLS for server-to-server operations.
 */

import L from "../utils/logger";

let supabase: any = null;

export function getSupabase() {
  if (supabase) return supabase;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    L.warn("SUPABASE", "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — cloud storage disabled");
    return null;
  }

  try {
    const { createClient } = require("@supabase/supabase-js");
    supabase = createClient(url, key);
    L.success("SUPABASE", "Client initialized");
    return supabase;
  } catch {
    L.warn("SUPABASE", "@supabase/supabase-js not installed — cloud storage disabled");
    return null;
  }
}

// ---------------------------------------------------------------------------
// Mini-app spec CRUD
// ---------------------------------------------------------------------------

export async function saveAppSpec(
  userId: string,
  appId: string,
  spec: unknown
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  const { error } = await sb
    .from("mini_apps")
    .upsert(
      { user_id: userId, app_id: appId, spec, updated_at: new Date().toISOString() },
      { onConflict: "user_id,app_id" }
    );

  if (error) {
    L.error("SUPABASE", `saveAppSpec failed — ${error.message}`);
  }
}

export async function loadAppSpec(
  userId: string,
  appId: string
): Promise<unknown | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from("mini_apps")
    .select("spec")
    .eq("user_id", userId)
    .eq("app_id", appId)
    .single();

  if (error && error.code !== "PGRST116") {
    L.error("SUPABASE", `loadAppSpec failed — ${error.message}`);
  }

  return data?.spec ?? null;
}

// ---------------------------------------------------------------------------
// Mini-app state CRUD
// ---------------------------------------------------------------------------

export async function saveAppState(
  userId: string,
  appId: string,
  state: Record<string, unknown>
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  const { error } = await sb
    .from("mini_app_state")
    .upsert(
      { user_id: userId, app_id: appId, state, updated_at: new Date().toISOString() },
      { onConflict: "user_id,app_id" }
    );

  if (error) {
    L.error("SUPABASE", `saveAppState failed — ${error.message}`);
  }
}

export async function loadAppState(
  userId: string,
  appId: string
): Promise<Record<string, unknown> | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from("mini_app_state")
    .select("state")
    .eq("user_id", userId)
    .eq("app_id", appId)
    .single();

  if (error && error.code !== "PGRST116") {
    L.error("SUPABASE", `loadAppState failed — ${error.message}`);
  }

  return (data?.state as Record<string, unknown>) ?? null;
}
