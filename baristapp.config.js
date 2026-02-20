/**
 * Baristapp config — single place to switch between debug and production.
 * Edit this file before running the app.
 *
 * PRODUCTION: Set debug=false, apiBaseUrl to your production API, and add
 * Supabase URL + anon key. You can also use env vars: SUPABASE_URL, SUPABASE_ANON_KEY.
 */

module.exports = {
  debug: true,
  // For physical devices, replace localhost with your LAN IP.
  apiBaseUrl: process.env.API_BASE_URL || "http://localhost:3001",
  privacyPolicyUrl: "https://baristapp.app/privacy",
  supportUrl: "https://baristapp.app/support",
  supportEmail: "support@baristapp.app",
  revenueCat: {
    entitlementPro: "pro",
    iosApiKey: process.env.REVENUECAT_IOS_API_KEY || "",
    androidApiKey: process.env.REVENUECAT_ANDROID_API_KEY || "",
  },
  billing: {
    provider: "revenuecat", // recommended for iOS/Android subscriptions
    plans: {
      free: {
        label: "Free",
        monthlyPriceUsd: 0,
        appLimitPerPeriod: 1,
        periodDays: 7,
      },
      pro: {
        label: "Pro",
        monthlyPriceUsd: 10,
        appLimitPerPeriod: 3,
        periodDays: 30,
      },
    },
  },
  // Supabase (auth + storage). From Supabase Dashboard → Settings → API
  supabaseUrl: process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "",
};
