import { Router, Request, Response } from "express";
import { getUserId } from "../utils/auth";
import { getBillingOverview, setUserPlanFromRevenueCat } from "../services/billingService";
import {
  extractRevenueCatUserIdsFromWebhook,
  fetchRevenueCatSubscriber,
  getProEntitlementExpiry,
  hasActiveProEntitlement,
} from "../services/revenueCatService";
import L from "../utils/logger";

const router = Router();

function requireUser(req: Request, res: Response): string | null {
  const userId = getUserId(req);
  if (!userId || userId === "anonymous") {
    res.status(401).json({ success: false, error: "User identity required." });
    return null;
  }
  return userId;
}

async function syncRevenueCatForUser(userId: string): Promise<boolean> {
  const subscriber = await fetchRevenueCatSubscriber(userId);
  if (!subscriber) return false;

  const proActive = hasActiveProEntitlement(subscriber);
  const entitlementExpiry = getProEntitlementExpiry(subscriber);
  await setUserPlanFromRevenueCat({
    userId,
    proActive,
    currentPeriodEnd: entitlementExpiry,
  });
  return true;
}

router.get("/me", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  const billing = await getBillingOverview(userId);
  res.json({ success: true, billing });
});

router.post("/revenuecat/sync", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  const ok = await syncRevenueCatForUser(userId);
  if (!ok) {
    res.status(502).json({ success: false, error: "RevenueCat sync failed." });
    return;
  }

  const billing = await getBillingOverview(userId);
  res.json({ success: true, billing });
});

router.post("/revenuecat/webhook", async (req: Request, res: Response) => {
  const expected = process.env.REVENUECAT_WEBHOOK_AUTH;
  if (expected) {
    const provided = req.headers.authorization ?? "";
    if (provided !== `Bearer ${expected}` && provided !== expected) {
      res.status(401).json({ success: false, error: "Invalid webhook auth." });
      return;
    }
  }

  const event = (req.body?.event ?? req.body) as Record<string, unknown>;
  const eventType = String(event?.type ?? "unknown");
  const ids = extractRevenueCatUserIdsFromWebhook(event);
  if (ids.length === 0) {
    res.json({ success: true, syncedUsers: 0, ignored: true });
    return;
  }

  let synced = 0;
  for (const userId of ids) {
    const ok = await syncRevenueCatForUser(userId);
    if (ok) synced += 1;
  }

  L.log("BILLING", `RevenueCat webhook ${eventType} synced_users=${synced}`);
  res.json({ success: true, syncedUsers: synced });
});

export default router;
