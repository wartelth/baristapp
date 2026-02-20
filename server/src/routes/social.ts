import { Router, Request, Response } from "express";
import { getUserId } from "../utils/auth";
import {
  createOrRotateShare,
  getUserBadges,
  importSharedApp,
  listInstalledSharedApps,
  listSharedWithMe,
  loadUserProfile,
  upsertUserProfile,
} from "../services/supabaseClient";
import { getBillingOverview } from "../services/billingService";
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

router.get("/profile", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  const profile = await loadUserProfile(userId);
  const billing = await getBillingOverview(userId);
  res.json({
    success: true,
    profile: profile ?? { displayName: "user", avatarIndex: 0 },
    billing,
  });
});

router.put("/profile", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  const displayName = String(req.body?.displayName ?? "").trim();
  const avatarIndex = Number(req.body?.avatarIndex);
  if (!displayName || Number.isNaN(avatarIndex)) {
    res.status(400).json({ success: false, error: "displayName and avatarIndex are required" });
    return;
  }

  await upsertUserProfile(userId, { displayName, avatarIndex });
  res.json({ success: true });
});

router.post("/share/:appId", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const appId = String(req.params.appId ?? "");

  const result = await createOrRotateShare(userId, appId);
  if (!result) {
    res.status(404).json({ success: false, error: "App not found for this user." });
    return;
  }

  L.log("SOCIAL", `Share created user=${userId} app=${appId} code=${result.shareCode}`);
  res.json({ success: true, shareCode: result.shareCode });
});

router.post("/import/:shareCode", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const shareCode = String(req.params.shareCode ?? "").trim();

  const imported = await importSharedApp(userId, shareCode);
  if (!imported) {
    res.status(404).json({ success: false, error: "Share code not found." });
    return;
  }

  L.log(
    "SOCIAL",
    `Import user=${userId} from=${imported.ownerUserId} installedApp=${imported.installedAppId}`
  );
  res.json({
    success: true,
    app: imported.spec,
    owner: {
      userId: imported.ownerUserId,
      displayName: imported.ownerDisplayName,
      avatarIndex: imported.ownerAvatarIndex,
    },
  });
});

router.get("/installed", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  const installed = await listInstalledSharedApps(userId);
  res.json({ success: true, installed });
});

router.get("/shared-with-me", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  const items = await listSharedWithMe(userId);
  res.json({ success: true, items });
});

router.get("/badges", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  const result = await getUserBadges(userId);
  res.json({ success: true, ...result });
});

export default router;
