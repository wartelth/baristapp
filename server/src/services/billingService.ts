import { PLAN_CONFIG, PlanKey, type PlanConfig } from "../config/billingPlans";
import { getSupabase } from "./supabaseClient";
import L from "../utils/logger";

export interface ModelUsageEventInput {
  userId: string;
  appId: string;
  requestType: "generate" | "modify";
  modelName: string;
  costUsd: number;
  numTurns: number;
}

export interface GenerationAllowance {
  allowed: boolean;
  reason?: string;
  planKey: PlanKey;
  plan: PlanConfig;
  usedInPeriod: number;
  remainingInPeriod: number;
  periodDays: number;
  periodStartedAt: string;
  periodEndsAt: string;
}

export interface BillingOverview {
  planKey: PlanKey;
  plan: PlanConfig;
  usage: {
    generatedInCurrentPeriod: number;
    remainingInCurrentPeriod: number;
    periodDays: number;
    periodStartedAt: string;
    periodEndsAt: string;
  };
  costs: {
    totalModelCostUsd: number;
    totalGenerations: number;
    totalModifications: number;
  };
  libraryAccess: boolean;
}

function clampNonNegative(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

function getPlanOrDefault(rawPlan: unknown): PlanKey {
  if (rawPlan === "pro") return "pro";
  return "free";
}

interface UserSubscriptionRow {
  user_id: string;
  plan_key: PlanKey;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
}

interface SubscriptionUpsertInput {
  userId: string;
  planKey: PlanKey;
  status: "active" | "past_due" | "canceled";
  provider?: string;
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
  currentPeriodEnd?: string | null;
}

async function ensureUserSubscription(userId: string): Promise<UserSubscriptionRow> {
  const sb = getSupabase();
  if (!sb) {
    return {
      user_id: userId,
      plan_key: "free",
      status: "active",
      current_period_start: null,
      current_period_end: null,
    };
  }

  const { data: existing, error: readError } = await sb
    .from("user_subscription_state")
    .select("user_id, plan_key, status, current_period_start, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();
  if (readError) {
    L.error("SUPABASE", `ensureUserSubscription read failed — ${readError.message}`);
  }
  if (existing) {
    return {
      user_id: String(existing.user_id),
      plan_key: getPlanOrDefault(existing.plan_key),
      status: String(existing.status ?? "active"),
      current_period_start: existing.current_period_start ? String(existing.current_period_start) : null,
      current_period_end: existing.current_period_end ? String(existing.current_period_end) : null,
    };
  }

  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + PLAN_CONFIG.free.periodDays);
  const row = {
    user_id: userId,
    plan_key: "free" as PlanKey,
    status: "active",
    current_period_start: now.toISOString(),
    current_period_end: end.toISOString(),
  };
  const { error: insertError } = await sb.from("user_subscription_state").upsert(row, {
    onConflict: "user_id",
  });
  if (insertError) {
    L.error("SUPABASE", `ensureUserSubscription insert failed — ${insertError.message}`);
  }
  return row;
}

async function upsertSubscriptionState(input: SubscriptionUpsertInput): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  const nowIso = new Date().toISOString();
  const { error } = await sb.from("user_subscription_state").upsert(
    {
      user_id: input.userId,
      plan_key: input.planKey,
      status: input.status,
      provider: input.provider ?? "revenuecat",
      provider_customer_id: input.providerCustomerId ?? null,
      provider_subscription_id: input.providerSubscriptionId ?? null,
      current_period_start: nowIso,
      current_period_end: input.currentPeriodEnd ?? null,
      updated_at: nowIso,
    },
    { onConflict: "user_id" }
  );
  if (error) {
    L.error("SUPABASE", `upsertSubscriptionState failed — ${error.message}`);
  }
}

async function countGeneratedAppsInWindow(userId: string, startedAtIso: string): Promise<number> {
  const sb = getSupabase();
  if (!sb) return 0;

  const { count, error } = await sb
    .from("model_usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("request_type", "generate")
    .gte("created_at", startedAtIso);

  if (error) {
    L.error("SUPABASE", `countGeneratedAppsInWindow failed — ${error.message}`);
    return 0;
  }
  return Number(count ?? 0);
}

export async function checkGenerationAllowance(userId: string): Promise<GenerationAllowance> {
  const subscription = await ensureUserSubscription(userId);
  const planKey = getPlanOrDefault(subscription.plan_key);
  const plan = PLAN_CONFIG[planKey];

  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - plan.periodDays);
  const periodStartedAt = periodStart.toISOString();
  const usedInPeriod = await countGeneratedAppsInWindow(userId, periodStartedAt);
  const remainingInPeriod = Math.max(0, plan.appLimitPerPeriod - usedInPeriod);
  const periodEndsAt = new Date(Date.now() + plan.periodDays * 24 * 60 * 60 * 1000).toISOString();

  if (remainingInPeriod <= 0) {
    const planMessage =
      planKey === "free"
        ? `Free plan limit reached: ${plan.appLimitPerPeriod} app every ${plan.periodDays} days.`
        : `${plan.label} plan limit reached: ${plan.appLimitPerPeriod} apps every ${plan.periodDays} days.`;
    return {
      allowed: false,
      reason: planMessage,
      planKey,
      plan,
      usedInPeriod,
      remainingInPeriod,
      periodDays: plan.periodDays,
      periodStartedAt,
      periodEndsAt,
    };
  }

  return {
    allowed: true,
    planKey,
    plan,
    usedInPeriod,
    remainingInPeriod,
    periodDays: plan.periodDays,
    periodStartedAt,
    periodEndsAt,
  };
}

export async function ensureLibraryAccess(userId: string): Promise<boolean> {
  const subscription = await ensureUserSubscription(userId);
  const planKey = getPlanOrDefault(subscription.plan_key);
  return PLAN_CONFIG[planKey].libraryAccess;
}

export async function setUserPlanFromRevenueCat(params: {
  userId: string;
  proActive: boolean;
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
  currentPeriodEnd?: string | null;
}): Promise<void> {
  await upsertSubscriptionState({
    userId: params.userId,
    planKey: params.proActive ? "pro" : "free",
    status: params.proActive ? "active" : "canceled",
    provider: "revenuecat",
    providerCustomerId: params.providerCustomerId ?? null,
    providerSubscriptionId: params.providerSubscriptionId ?? null,
    currentPeriodEnd: params.currentPeriodEnd ?? null,
  });
}

export async function recordModelUsage(input: ModelUsageEventInput): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  const safeCost = clampNonNegative(input.costUsd);
  const safeTurns = Math.max(0, Number(input.numTurns || 0));
  const nowIso = new Date().toISOString();

  const { error: eventError } = await sb.from("model_usage_events").insert({
    user_id: input.userId,
    app_id: input.appId,
    request_type: input.requestType,
    model_name: input.modelName,
    cost_usd: safeCost,
    num_turns: safeTurns,
    created_at: nowIso,
  });
  if (eventError) {
    L.error("SUPABASE", `recordModelUsage event insert failed — ${eventError.message}`);
    return;
  }

  const isGenerate = input.requestType === "generate";
  const { error: userAggError } = await sb.rpc("increment_user_usage_totals", {
    p_user_id: input.userId,
    p_cost_usd: safeCost,
    p_generations_delta: isGenerate ? 1 : 0,
    p_modifications_delta: isGenerate ? 0 : 1,
    p_event_at: nowIso,
  });
  if (userAggError) {
    L.error("SUPABASE", `recordModelUsage user aggregate failed — ${userAggError.message}`);
  }

  const { error: appAggError } = await sb.rpc("increment_app_usage_totals", {
    p_user_id: input.userId,
    p_app_id: input.appId,
    p_cost_usd: safeCost,
    p_generations_delta: isGenerate ? 1 : 0,
    p_modifications_delta: isGenerate ? 0 : 1,
    p_event_at: nowIso,
  });
  if (appAggError) {
    L.error("SUPABASE", `recordModelUsage app aggregate failed — ${appAggError.message}`);
  }
}

export async function getBillingOverview(userId: string): Promise<BillingOverview> {
  const allowance = await checkGenerationAllowance(userId);
  const sb = getSupabase();

  let totals = {
    totalModelCostUsd: 0,
    totalGenerations: 0,
    totalModifications: 0,
  };

  if (sb) {
    const { data, error } = await sb
      .from("user_usage_totals")
      .select("total_model_cost_usd, total_generations, total_modifications")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      L.error("SUPABASE", `getBillingOverview totals failed — ${error.message}`);
    } else if (data) {
      totals = {
        totalModelCostUsd: Number(data.total_model_cost_usd ?? 0),
        totalGenerations: Number(data.total_generations ?? 0),
        totalModifications: Number(data.total_modifications ?? 0),
      };
    }
  }

  return {
    planKey: allowance.planKey,
    plan: allowance.plan,
    usage: {
      generatedInCurrentPeriod: allowance.usedInPeriod,
      remainingInCurrentPeriod: allowance.remainingInPeriod,
      periodDays: allowance.periodDays,
      periodStartedAt: allowance.periodStartedAt,
      periodEndsAt: allowance.periodEndsAt,
    },
    costs: totals,
    libraryAccess: allowance.plan.libraryAccess,
  };
}
