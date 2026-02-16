import { Platform } from "react-native";
import Purchases from "react-native-purchases/dist/purchases";
import { config } from "../config";
import { getAuthHeaders } from "../api/supabaseClient";

let configured = false;

async function resolveAppUserId(): Promise<string | null> {
  const headers = await getAuthHeaders();
  return headers["x-user-id"] ?? headers["x-device-id"] ?? null;
}

function resolveApiKey(): string {
  if (Platform.OS === "ios") return config.revenueCat.iosApiKey;
  if (Platform.OS === "android") return config.revenueCat.androidApiKey;
  return "";
}

export function isRevenueCatEnabled(): boolean {
  return resolveApiKey().length > 0;
}

export async function initRevenueCat(): Promise<boolean> {
  if (configured) return true;
  const apiKey = resolveApiKey();
  const appUserId = await resolveAppUserId();
  if (!apiKey || !appUserId) return false;

  await Purchases.setLogLevel(Purchases.LOG_LEVEL.INFO);
  await Purchases.configure({ apiKey, appUserID: appUserId });
  configured = true;
  return true;
}

export async function syncRevenueCatIdentity(): Promise<void> {
  if (!(await initRevenueCat())) return;
  const appUserId = await resolveAppUserId();
  if (!appUserId) return;
  await Purchases.logIn(appUserId);
}

export async function purchaseProFromRevenueCat(): Promise<boolean> {
  if (!(await initRevenueCat())) {
    throw new Error("RevenueCat is not configured. Missing iOS/Android API key.");
  }

  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  if (!current || current.availablePackages.length === 0) {
    throw new Error("No purchase package is available in RevenueCat offerings.");
  }

  const candidate =
    current.availablePackages.find((pkg) =>
      pkg.product.identifier.toLowerCase().includes("pro")
    ) ?? current.availablePackages[0];

  await Purchases.purchasePackage(candidate);
  return true;
}

export async function restoreRevenueCatPurchases(): Promise<void> {
  if (!(await initRevenueCat())) {
    throw new Error("RevenueCat is not configured. Missing iOS/Android API key.");
  }
  await Purchases.restorePurchases();
}
