export type PlanKey = "free" | "pro";

export interface PlanConfig {
  key: PlanKey;
  label: string;
  monthlyPriceUsd: number;
  appLimitPerPeriod: number;
  periodDays: number;
  libraryAccess: boolean;
}

const RAW_PLAN_CONFIG = {
  free: {
    label: "Free",
    monthlyPriceUsd: 0,
    appLimitPerPeriod: 1,
    periodDays: 7,
    libraryAccess: true,
  },
  pro: {
    label: "Pro",
    monthlyPriceUsd: 10,
    appLimitPerPeriod: 3,
    periodDays: 30,
    libraryAccess: true,
  },
} as const;

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

export const PLAN_CONFIG: Record<PlanKey, PlanConfig> = {
  free: {
    key: "free",
    label: RAW_PLAN_CONFIG.free.label,
    monthlyPriceUsd: envNumber("PLAN_FREE_MONTHLY_PRICE_USD", RAW_PLAN_CONFIG.free.monthlyPriceUsd),
    appLimitPerPeriod: envNumber("PLAN_FREE_APP_LIMIT", RAW_PLAN_CONFIG.free.appLimitPerPeriod),
    periodDays: envNumber("PLAN_FREE_PERIOD_DAYS", RAW_PLAN_CONFIG.free.periodDays),
    libraryAccess: RAW_PLAN_CONFIG.free.libraryAccess,
  },
  pro: {
    key: "pro",
    label: RAW_PLAN_CONFIG.pro.label,
    monthlyPriceUsd: envNumber("PLAN_PRO_MONTHLY_PRICE_USD", RAW_PLAN_CONFIG.pro.monthlyPriceUsd),
    appLimitPerPeriod: envNumber("PLAN_PRO_APP_LIMIT", RAW_PLAN_CONFIG.pro.appLimitPerPeriod),
    periodDays: envNumber("PLAN_PRO_PERIOD_DAYS", RAW_PLAN_CONFIG.pro.periodDays),
    libraryAccess: RAW_PLAN_CONFIG.pro.libraryAccess,
  },
};
