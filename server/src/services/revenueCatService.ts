import L from "../utils/logger";

interface RevenueCatSubscriberResponse {
  subscriber?: {
    entitlements?: Record<
      string,
      {
        expires_date?: string | null;
        product_identifier?: string | null;
      }
    >;
  };
}

function getRevenueCatSecretApiKey(): string | null {
  const key = process.env.REVENUECAT_SECRET_API_KEY;
  if (!key) {
    L.warn("BILLING", "REVENUECAT_SECRET_API_KEY is missing");
    return null;
  }
  return key;
}

export function getRevenueCatEntitlementPro(): string {
  return process.env.REVENUECAT_ENTITLEMENT_PRO ?? "pro";
}

export async function fetchRevenueCatSubscriber(appUserId: string): Promise<RevenueCatSubscriberResponse | null> {
  const apiKey = getRevenueCatSecretApiKey();
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const body = await response.text();
      L.warn("BILLING", `RevenueCat subscriber lookup failed (${response.status}) — ${body}`);
      return null;
    }

    const payload = (await response.json()) as RevenueCatSubscriberResponse;
    return payload;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    L.error("BILLING", `RevenueCat request exception — ${message}`);
    return null;
  }
}

export function hasActiveProEntitlement(payload: RevenueCatSubscriberResponse): boolean {
  const entitlementKey = getRevenueCatEntitlementPro();
  const entitlement = payload.subscriber?.entitlements?.[entitlementKey];
  if (!entitlement) return false;
  if (!entitlement.expires_date) return true;
  const expiryTs = Date.parse(entitlement.expires_date);
  if (!Number.isFinite(expiryTs)) return false;
  return expiryTs > Date.now();
}

export function getProEntitlementExpiry(payload: RevenueCatSubscriberResponse): string | null {
  const entitlementKey = getRevenueCatEntitlementPro();
  const entitlement = payload.subscriber?.entitlements?.[entitlementKey];
  if (!entitlement?.expires_date) return null;
  const expiryTs = Date.parse(entitlement.expires_date);
  if (!Number.isFinite(expiryTs)) return null;
  return new Date(expiryTs).toISOString();
}

export function extractRevenueCatUserIdsFromWebhook(event: Record<string, unknown>): string[] {
  const candidates: string[] = [];
  const push = (value: unknown) => {
    if (typeof value !== "string" || value.length === 0) return;
    if (value.startsWith("$RCAnonymousID:")) return;
    candidates.push(value);
  };

  push(event.app_user_id);
  push(event.original_app_user_id);

  const aliases = event.aliases;
  if (Array.isArray(aliases)) {
    for (const alias of aliases) push(alias);
  }

  return Array.from(new Set(candidates));
}
