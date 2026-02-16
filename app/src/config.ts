/**
 * App config — reads from Expo extra (injected by app.config.js from swissknife.config.js).
 * Fallback: require swissknife.config.js when extra is empty (e.g. Metro cache, Expo Go).
 */

import Constants from "expo-constants";

const extra = (Constants.expoConfig as any)?.extra ?? {};

// Fallback when extra is empty (can happen with stale cache or Expo Go)
let rootConfig: { supabaseUrl?: string; supabaseAnonKey?: string; apiBaseUrl?: string; debug?: boolean } = {};
try {
  rootConfig = require("../../swissknife.config.js");
} catch {
  // ignore
}

export const config = {
  debug: extra.debug ?? rootConfig.debug ?? __DEV__,
  apiBaseUrl:
    extra.apiBaseUrl ??
    rootConfig.apiBaseUrl ??
    (__DEV__ ? "http://192.168.2.223:3001" : "https://api.swissknife.app"),
  supabaseUrl: extra.supabaseUrl ?? rootConfig.supabaseUrl ?? "",
  supabaseAnonKey: extra.supabaseAnonKey ?? rootConfig.supabaseAnonKey ?? "",
};
