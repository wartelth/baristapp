/**
 * Server-side Supabase client using a secret server key.
 * Prefers SUPABASE_SECRET_KEY (sb_secret_...) and falls back to legacy
 * SUPABASE_SERVICE_ROLE_KEY for backward compatibility.
 * Bypasses RLS for server-to-server operations.
 */

import L from "../utils/logger";
import crypto from "crypto";

let supabase: any = null;

export function getSupabase() {
  if (supabase) return supabase;

  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    L.warn(
      "SUPABASE",
      "Missing SUPABASE_URL or server key (SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY) — cloud storage disabled"
    );
    return null;
  }

  try {
    const { createClient } = require("@supabase/supabase-js");
    if (key.startsWith("sb_publishable_")) {
      L.warn(
        "SUPABASE",
        "Configured key looks publishable (sb_publishable_...). Use SUPABASE_SECRET_KEY on the server."
      );
    }
    if (key.startsWith("eyJ")) {
      L.warn(
        "SUPABASE",
        "Using legacy JWT service_role key. Prefer SUPABASE_SECRET_KEY (sb_secret_...) from API Keys dashboard."
      );
    }

    supabase = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
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

/**
 * Load the most recent spec for an appId across all users.
 * Used for lazy-mounting server endpoints when a request arrives
 * for an app that isn't in the in-memory registry.
 */
export async function loadAnyAppSpec(
  appId: string
): Promise<unknown | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from("mini_apps")
    .select("spec")
    .eq("app_id", appId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    L.error("SUPABASE", `loadAnyAppSpec failed — ${error.message}`);
  }

  return data?.spec ?? null;
}

// ---------------------------------------------------------------------------
// App versioning + deployments
// ---------------------------------------------------------------------------

export interface MiniAppVersionRecord {
  id: string;
  userId: string;
  appId: string;
  parentVersionId: string | null;
  sourceRequestType: "generate" | "modify" | "rollback";
  commitMessage: string;
  diffSummary: string | null;
  testsPassed: boolean;
  spec: unknown;
  createdAt: string;
}

export interface MiniAppDeploymentRecord {
  id: string;
  userId: string;
  appId: string;
  versionId: string;
  provider: string;
  status: "deployed" | "failed" | "skipped";
  previewUrl: string | null;
  runtimeId: string | null;
  healthStatus: string | null;
  createdAt: string;
}

export async function saveAppVersion(input: {
  userId: string;
  appId: string;
  parentVersionId?: string | null;
  sourceRequestType: "generate" | "modify" | "rollback";
  commitMessage: string;
  diffSummary?: string | null;
  testsPassed: boolean;
  spec: unknown;
}): Promise<MiniAppVersionRecord | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("mini_app_versions")
    .insert({
      user_id: input.userId,
      app_id: input.appId,
      parent_version_id: input.parentVersionId ?? null,
      source_request_type: input.sourceRequestType,
      commit_message: input.commitMessage,
      diff_summary: input.diffSummary ?? null,
      tests_passed: input.testsPassed,
      spec: input.spec,
      created_at: new Date().toISOString(),
    })
    .select(
      "id, user_id, app_id, parent_version_id, source_request_type, commit_message, diff_summary, tests_passed, spec, created_at"
    )
    .single();

  if (error) {
    L.error("SUPABASE", `saveAppVersion failed — ${error.message}`);
    return null;
  }

  return {
    id: String(data.id),
    userId: String(data.user_id),
    appId: String(data.app_id),
    parentVersionId: data.parent_version_id ? String(data.parent_version_id) : null,
    sourceRequestType: String(data.source_request_type) as "generate" | "modify" | "rollback",
    commitMessage: String(data.commit_message),
    diffSummary: data.diff_summary ? String(data.diff_summary) : null,
    testsPassed: Boolean(data.tests_passed),
    spec: data.spec,
    createdAt: String(data.created_at),
  };
}

export async function listAppVersions(
  userId: string,
  appId: string
): Promise<MiniAppVersionRecord[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("mini_app_versions")
    .select(
      "id, user_id, app_id, parent_version_id, source_request_type, commit_message, diff_summary, tests_passed, spec, created_at"
    )
    .eq("user_id", userId)
    .eq("app_id", appId)
    .order("created_at", { ascending: false });
  if (error) {
    L.error("SUPABASE", `listAppVersions failed — ${error.message}`);
    return [];
  }
  return (data ?? []).map((row: any) => ({
    id: String(row.id),
    userId: String(row.user_id),
    appId: String(row.app_id),
    parentVersionId: row.parent_version_id ? String(row.parent_version_id) : null,
    sourceRequestType: String(row.source_request_type) as "generate" | "modify" | "rollback",
    commitMessage: String(row.commit_message ?? ""),
    diffSummary: row.diff_summary ? String(row.diff_summary) : null,
    testsPassed: Boolean(row.tests_passed),
    spec: row.spec,
    createdAt: String(row.created_at),
  }));
}

export async function loadAppVersion(
  userId: string,
  appId: string,
  versionId: string
): Promise<MiniAppVersionRecord | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("mini_app_versions")
    .select(
      "id, user_id, app_id, parent_version_id, source_request_type, commit_message, diff_summary, tests_passed, spec, created_at"
    )
    .eq("user_id", userId)
    .eq("app_id", appId)
    .eq("id", versionId)
    .single();
  if (error && error.code !== "PGRST116") {
    L.error("SUPABASE", `loadAppVersion failed — ${error.message}`);
    return null;
  }
  if (!data) return null;
  return {
    id: String(data.id),
    userId: String(data.user_id),
    appId: String(data.app_id),
    parentVersionId: data.parent_version_id ? String(data.parent_version_id) : null,
    sourceRequestType: String(data.source_request_type) as "generate" | "modify" | "rollback",
    commitMessage: String(data.commit_message ?? ""),
    diffSummary: data.diff_summary ? String(data.diff_summary) : null,
    testsPassed: Boolean(data.tests_passed),
    spec: data.spec,
    createdAt: String(data.created_at),
  };
}

export async function saveAppDeployment(input: {
  userId: string;
  appId: string;
  versionId: string;
  provider: string;
  status: "deployed" | "failed" | "skipped";
  previewUrl?: string | null;
  runtimeId?: string | null;
  healthStatus?: string | null;
}): Promise<MiniAppDeploymentRecord | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("mini_app_deployments")
    .insert({
      user_id: input.userId,
      app_id: input.appId,
      version_id: input.versionId,
      provider: input.provider,
      status: input.status,
      preview_url: input.previewUrl ?? null,
      runtime_id: input.runtimeId ?? null,
      health_status: input.healthStatus ?? null,
      created_at: new Date().toISOString(),
    })
    .select(
      "id, user_id, app_id, version_id, provider, status, preview_url, runtime_id, health_status, created_at"
    )
    .single();
  if (error) {
    L.error("SUPABASE", `saveAppDeployment failed — ${error.message}`);
    return null;
  }
  return {
    id: String(data.id),
    userId: String(data.user_id),
    appId: String(data.app_id),
    versionId: String(data.version_id),
    provider: String(data.provider),
    status: String(data.status) as "deployed" | "failed" | "skipped",
    previewUrl: data.preview_url ? String(data.preview_url) : null,
    runtimeId: data.runtime_id ? String(data.runtime_id) : null,
    healthStatus: data.health_status ? String(data.health_status) : null,
    createdAt: String(data.created_at),
  };
}

export async function loadLatestDeployment(
  userId: string,
  appId: string
): Promise<MiniAppDeploymentRecord | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("mini_app_deployments")
    .select(
      "id, user_id, app_id, version_id, provider, status, preview_url, runtime_id, health_status, created_at"
    )
    .eq("user_id", userId)
    .eq("app_id", appId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    L.error("SUPABASE", `loadLatestDeployment failed — ${error.message}`);
    return null;
  }
  if (!data) return null;
  return {
    id: String(data.id),
    userId: String(data.user_id),
    appId: String(data.app_id),
    versionId: String(data.version_id),
    provider: String(data.provider),
    status: String(data.status) as "deployed" | "failed" | "skipped",
    previewUrl: data.preview_url ? String(data.preview_url) : null,
    runtimeId: data.runtime_id ? String(data.runtime_id) : null,
    healthStatus: data.health_status ? String(data.health_status) : null,
    createdAt: String(data.created_at),
  };
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

export async function deleteAllUserData(
  userId: string
): Promise<{ deletedApps: number; deletedStates: number }> {
  const sb = getSupabase();
  if (!sb) return { deletedApps: 0, deletedStates: 0 };

  const { data: appsData, error: appsError } = await sb
    .from("mini_apps")
    .delete()
    .eq("user_id", userId)
    .select("id");
  if (appsError) {
    L.error("SUPABASE", `deleteAllUserData mini_apps failed — ${appsError.message}`);
  }

  const { data: stateData, error: stateError } = await sb
    .from("mini_app_state")
    .delete()
    .eq("user_id", userId)
    .select("id");
  if (stateError) {
    L.error("SUPABASE", `deleteAllUserData mini_app_state failed — ${stateError.message}`);
  }

  return {
    deletedApps: Array.isArray(appsData) ? appsData.length : 0,
    deletedStates: Array.isArray(stateData) ? stateData.length : 0,
  };
}

export interface SocialProfile {
  displayName: string;
  avatarIndex: number;
}

export interface UserBadge {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface BadgeProgress {
  appsCreated: number;
  appsShared: number;
  appsImported: number;
  profileCustomized: boolean;
}

export async function upsertUserProfile(
  userId: string,
  profile: SocialProfile
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  const { error } = await sb.from("user_profiles").upsert(
    {
      user_id: userId,
      display_name: profile.displayName,
      avatar_index: profile.avatarIndex,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) {
    L.error("SUPABASE", `upsertUserProfile failed — ${error.message}`);
  }
}

export async function loadUserProfile(
  userId: string
): Promise<SocialProfile | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from("user_profiles")
    .select("display_name, avatar_index")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    L.error("SUPABASE", `loadUserProfile failed — ${error.message}`);
  }
  if (!data) return null;

  return {
    displayName: String(data.display_name ?? "user"),
    avatarIndex: Number(data.avatar_index ?? 0),
  };
}

async function countRows(
  table: string,
  filters: Array<{ key: string; value: string }>
): Promise<number> {
  const sb = getSupabase();
  if (!sb) return 0;

  let query = sb.from(table).select("*", { count: "exact", head: true });
  for (const filter of filters) {
    query = query.eq(filter.key, filter.value);
  }
  const { count, error } = await query;
  if (error) {
    L.error("SUPABASE", `countRows failed for ${table} — ${error.message}`);
    return 0;
  }
  return Number(count ?? 0);
}

export async function getUserBadges(
  userId: string
): Promise<{ badges: UserBadge[]; progress: BadgeProgress }> {
  const [appsCreated, appsShared, appsImported, profile] = await Promise.all([
    countRows("mini_apps", [{ key: "user_id", value: userId }]),
    countRows("mini_app_shares", [{ key: "owner_user_id", value: userId }]),
    countRows("mini_app_installs", [{ key: "installer_user_id", value: userId }]),
    loadUserProfile(userId),
  ]);

  const profileCustomized = Boolean(
    profile &&
      (profile.displayName.trim().toLowerCase() !== "user" || profile.avatarIndex !== 0)
  );

  const badges: UserBadge[] = [];
  if (appsCreated >= 1) {
    badges.push({
      id: "first-craft",
      title: "First Craft",
      description: "Create your first mini-app.",
      icon: "sparkles-outline",
    });
  }
  if (appsCreated >= 3) {
    badges.push({
      id: "maker-tier-1",
      title: "Maker Tier I",
      description: "Create at least 3 mini-apps.",
      icon: "build-outline",
    });
  }
  if (appsCreated >= 10) {
    badges.push({
      id: "maker-tier-2",
      title: "Maker Tier II",
      description: "Create at least 10 mini-apps.",
      icon: "flame-outline",
    });
  }
  if (appsShared >= 1) {
    badges.push({
      id: "social-sharer",
      title: "Social Sharer",
      description: "Share a mini-app with a friend.",
      icon: "share-social-outline",
    });
  }
  if (appsImported >= 1) {
    badges.push({
      id: "community-explorer",
      title: "Community Explorer",
      description: "Import a mini-app from a friend.",
      icon: "people-outline",
    });
  }
  if (profileCustomized) {
    badges.push({
      id: "identity-forged",
      title: "Identity Forged",
      description: "Customize your profile name or avatar.",
      icon: "color-wand-outline",
    });
  }

  return {
    badges,
    progress: {
      appsCreated,
      appsShared,
      appsImported,
      profileCustomized,
    },
  };
}

const SHARE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const SHARE_GROUP_SIZE = 3;
const SHARE_GROUP_COUNT = 3;
const SHARE_CODE_LENGTH = SHARE_GROUP_SIZE * SHARE_GROUP_COUNT;

function formatShareCode(compact: string): string {
  const groups: string[] = [];
  for (let i = 0; i < compact.length; i += SHARE_GROUP_SIZE) {
    groups.push(compact.slice(i, i + SHARE_GROUP_SIZE));
  }
  return groups.join("-");
}

function normalizeShareCode(raw: string): string {
  const compact = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (compact.length !== SHARE_CODE_LENGTH) return "";
  return formatShareCode(compact);
}

function randomShareCode(): string {
  const bytes = crypto.randomBytes(SHARE_CODE_LENGTH);
  let compact = "";
  for (let i = 0; i < SHARE_CODE_LENGTH; i += 1) {
    compact += SHARE_ALPHABET[bytes[i] % SHARE_ALPHABET.length];
  }
  return formatShareCode(compact);
}

export async function createOrRotateShare(
  ownerUserId: string,
  appId: string
): Promise<{ shareCode: string } | null> {
  const sb = getSupabase();
  if (!sb) return null;

  // Ensure owner owns app
  const { data: appRow, error: appError } = await sb
    .from("mini_apps")
    .select("id")
    .eq("user_id", ownerUserId)
    .eq("app_id", appId)
    .single();
  if (appError || !appRow) {
    return null;
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const shareCode = randomShareCode();
    const { error } = await sb.from("mini_app_shares").upsert(
      {
        owner_user_id: ownerUserId,
        app_id: appId,
        share_code: shareCode,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "owner_user_id,app_id" }
    );
    if (!error) {
      return { shareCode };
    }
    // Retry on unique constraint conflicts for share_code
    if (error.code === "23505") {
      continue;
    }
    L.error("SUPABASE", `createOrRotateShare failed — ${error.message}`);
    return null;
  }

  L.error("SUPABASE", "createOrRotateShare failed — could not allocate unique share code");
  return null;
}

export async function importSharedApp(
  installerUserId: string,
  shareCode: string
): Promise<{
  installedAppId: string;
  spec: unknown;
  ownerUserId: string;
  ownerDisplayName: string;
  ownerAvatarIndex: number;
} | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const normalizedShareCode = normalizeShareCode(shareCode);
  const legacyCode = shareCode.trim().toLowerCase();
  const codesToTry = normalizedShareCode
    ? Array.from(new Set([normalizedShareCode, legacyCode]))
    : [legacyCode];
  if (!codesToTry[0]) return null;

  const { data: shareRows, error: shareErr } = await sb
    .from("mini_app_shares")
    .select("owner_user_id, app_id, share_code")
    .in("share_code", codesToTry)
    .limit(1);
  const shareRow = Array.isArray(shareRows) ? shareRows[0] : null;
  if (shareErr || !shareRow) return null;

  const ownerUserId = String(shareRow.owner_user_id);
  const sourceAppId = String(shareRow.app_id);

  const { data: appData, error: appErr } = await sb
    .from("mini_apps")
    .select("spec")
    .eq("user_id", ownerUserId)
    .eq("app_id", sourceAppId)
    .single();
  if (appErr || !appData?.spec) return null;

  const installedAppId = `${sourceAppId}-friend-${ownerUserId.slice(0, 6)}`;
  const specObj = { ...(appData.spec as Record<string, unknown>), appId: installedAppId };

  const { error: saveErr } = await sb.from("mini_apps").upsert(
    {
      user_id: installerUserId,
      app_id: installedAppId,
      spec: specObj,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,app_id" }
  );
  if (saveErr) {
    L.error("SUPABASE", `importSharedApp save failed — ${saveErr.message}`);
    return null;
  }

  await sb.from("mini_app_installs").upsert(
    {
      owner_user_id: ownerUserId,
      source_app_id: sourceAppId,
      installer_user_id: installerUserId,
      installed_app_id: installedAppId,
    },
    { onConflict: "owner_user_id,source_app_id,installer_user_id" }
  );

  const ownerProfile = await loadUserProfile(ownerUserId);
  return {
    installedAppId,
    spec: specObj,
    ownerUserId,
    ownerDisplayName: ownerProfile?.displayName ?? "friend",
    ownerAvatarIndex: ownerProfile?.avatarIndex ?? 0,
  };
}

export async function listInstalledSharedApps(
  installerUserId: string
): Promise<
  Array<{
    installedAppId: string;
    ownerUserId: string;
    ownerDisplayName: string;
    ownerAvatarIndex: number;
  }>
> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from("mini_app_installs")
    .select("installed_app_id, owner_user_id")
    .eq("installer_user_id", installerUserId);

  if (error) {
    L.error("SUPABASE", `listInstalledSharedApps failed — ${error.message}`);
    return [];
  }

  const rows = Array.isArray(data) ? data : [];
  const ownerIds = Array.from(new Set(rows.map((r: any) => String(r.owner_user_id))));
  const profiles = new Map<string, SocialProfile>();
  for (const ownerId of ownerIds) {
    const profile = await loadUserProfile(ownerId);
    if (profile) profiles.set(ownerId, profile);
  }

  return rows.map((row: any) => {
    const ownerUserId = String(row.owner_user_id);
    const profile = profiles.get(ownerUserId);
    return {
      installedAppId: String(row.installed_app_id),
      ownerUserId,
      ownerDisplayName: profile?.displayName ?? "friend",
      ownerAvatarIndex: profile?.avatarIndex ?? 0,
    };
  });
}

export async function listSharedWithMe(
  installerUserId: string
): Promise<
  Array<{
    installedAppId: string;
    title: string;
    icon: string;
    ownerUserId: string;
    ownerDisplayName: string;
    ownerAvatarIndex: number;
  }>
> {
  const sb = getSupabase();
  if (!sb) return [];

  const installed = await listInstalledSharedApps(installerUserId);
  const output: Array<{
    installedAppId: string;
    title: string;
    icon: string;
    ownerUserId: string;
    ownerDisplayName: string;
    ownerAvatarIndex: number;
  }> = [];

  for (const item of installed) {
    const { data, error } = await sb
      .from("mini_apps")
      .select("spec")
      .eq("user_id", installerUserId)
      .eq("app_id", item.installedAppId)
      .single();
    if (error || !data?.spec) continue;
    const spec = data.spec as Record<string, unknown>;
    output.push({
      installedAppId: item.installedAppId,
      title: String(spec.title ?? item.installedAppId),
      icon: String(spec.icon ?? "🔧"),
      ownerUserId: item.ownerUserId,
      ownerDisplayName: item.ownerDisplayName,
      ownerAvatarIndex: item.ownerAvatarIndex,
    });
  }

  return output;
}

export interface FeaturedMiniApp {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  spec: unknown;
  status: "new" | "added" | "ignored";
  installedAppId?: string;
}

export async function listFeaturedAppsForUser(
  userId: string
): Promise<FeaturedMiniApp[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data: featuredRows, error: featuredError } = await sb
    .from("featured_mini_apps")
    .select("id, slug, title, description, icon, spec")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (featuredError) {
    L.error("SUPABASE", `listFeaturedAppsForUser featured list failed — ${featuredError.message}`);
    return [];
  }

  const { data: actionRows, error: actionError } = await sb
    .from("featured_app_user_actions")
    .select("featured_app_id, action, installed_app_id")
    .eq("user_id", userId);
  if (actionError) {
    L.error("SUPABASE", `listFeaturedAppsForUser actions failed — ${actionError.message}`);
  }

  const actionMap = new Map<
    string,
    { action: "added" | "ignored"; installedAppId?: string }
  >();
  for (const row of actionRows ?? []) {
    actionMap.set(String((row as any).featured_app_id), {
      action: String((row as any).action) as "added" | "ignored",
      installedAppId: (row as any).installed_app_id
        ? String((row as any).installed_app_id)
        : undefined,
    });
  }

  return (featuredRows ?? []).map((row: any) => {
    const action = actionMap.get(String(row.id));
    return {
      id: String(row.id),
      slug: String(row.slug),
      title: String(row.title),
      description: String(row.description ?? ""),
      icon: String(row.icon ?? "🔧"),
      spec: row.spec,
      status: action?.action ?? "new",
      installedAppId: action?.installedAppId,
    };
  });
}

export async function markFeaturedAppIgnored(
  userId: string,
  featuredAppId: string
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  const { error } = await sb.from("featured_app_user_actions").upsert(
    {
      user_id: userId,
      featured_app_id: featuredAppId,
      action: "ignored",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,featured_app_id" }
  );
  if (error) {
    L.error("SUPABASE", `markFeaturedAppIgnored failed — ${error.message}`);
  }
}

export async function addFeaturedAppToUser(
  userId: string,
  featuredAppId: string
): Promise<{ installedAppId: string; spec: unknown } | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { data: featured, error: featuredError } = await sb
    .from("featured_mini_apps")
    .select("slug, spec")
    .eq("id", featuredAppId)
    .eq("is_active", true)
    .single();
  if (featuredError || !featured?.spec) return null;

  const baseAppId = String((featured.spec as any).appId ?? featured.slug);
  const installedAppId = `${baseAppId}-template`;
  const specObj = { ...(featured.spec as Record<string, unknown>), appId: installedAppId };

  const { error: saveError } = await sb.from("mini_apps").upsert(
    {
      user_id: userId,
      app_id: installedAppId,
      spec: specObj,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,app_id" }
  );
  if (saveError) {
    L.error("SUPABASE", `addFeaturedAppToUser save failed — ${saveError.message}`);
    return null;
  }

  const { error: actionError } = await sb.from("featured_app_user_actions").upsert(
    {
      user_id: userId,
      featured_app_id: featuredAppId,
      action: "added",
      installed_app_id: installedAppId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,featured_app_id" }
  );
  if (actionError) {
    L.error("SUPABASE", `addFeaturedAppToUser action failed — ${actionError.message}`);
  }

  return { installedAppId, spec: specObj };
}
