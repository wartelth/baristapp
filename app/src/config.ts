/**
 * App config — reads from Expo extra (injected by app.config.js from baristapp.config.js).
 * Fallback: require baristapp.config.js when extra is empty (e.g. Metro cache, Expo Go).
 */

import Constants from "expo-constants";

const extra = (Constants.expoConfig as any)?.extra ?? {};

// Fallback when extra is empty (can happen with stale cache or Expo Go)
let rootConfig: {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  apiBaseUrl?: string;
  debug?: boolean;
  privacyPolicyUrl?: string;
  supportUrl?: string;
  supportEmail?: string;
  revenueCat?: {
    entitlementPro?: string;
    iosApiKey?: string;
    androidApiKey?: string;
  };
  billing?: {
    provider?: string;
    plans?: {
      free?: {
        label?: string;
        monthlyPriceUsd?: number;
        appLimitPerPeriod?: number;
        periodDays?: number;
      };
      pro?: {
        label?: string;
        monthlyPriceUsd?: number;
        appLimitPerPeriod?: number;
        periodDays?: number;
      };
    };
  };
} = {};
try {
  rootConfig = require("../../baristapp.config.js");
} catch {
  // ignore
}

export const config = {
  debug: extra.debug ?? rootConfig.debug ?? __DEV__,
  apiBaseUrl:
    extra.apiBaseUrl ??
    rootConfig.apiBaseUrl ??
    (__DEV__ ? "http://192.168.2.223:3001" : "https://api.baristapp.app"),
  supabaseUrl: extra.supabaseUrl ?? rootConfig.supabaseUrl ?? "",
  supabaseAnonKey: extra.supabaseAnonKey ?? rootConfig.supabaseAnonKey ?? "",
  privacyPolicyUrl:
    extra.privacyPolicyUrl ??
    rootConfig.privacyPolicyUrl ??
    "https://baristapp.app/privacy",
  supportUrl:
    extra.supportUrl ??
    rootConfig.supportUrl ??
    "https://baristapp.app/support",
  supportEmail:
    extra.supportEmail ??
    rootConfig.supportEmail ??
    "support@baristapp.app",
  revenueCat: extra.revenueCat ?? rootConfig.revenueCat ?? {
    entitlementPro: "pro",
    iosApiKey: "",
    androidApiKey: "",
  },
  billing: extra.billing ?? rootConfig.billing ?? {
    provider: "revenuecat",
    plans: {
      free: { label: "Free", monthlyPriceUsd: 0, appLimitPerPeriod: 1, periodDays: 7 },
      pro: { label: "Pro", monthlyPriceUsd: 10, appLimitPerPeriod: 3, periodDays: 30 },
    },
  },
};
