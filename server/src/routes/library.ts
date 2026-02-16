import { Router, Request, Response } from "express";
import { getUserId } from "../utils/auth";
import {
  addFeaturedAppToUser,
  listFeaturedAppsForUser,
  markFeaturedAppIgnored,
} from "../services/supabaseClient";
import { ensureLibraryAccess } from "../services/billingService";
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

router.get("/featured", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  if (!(await ensureLibraryAccess(userId))) {
    res.status(403).json({ success: false, error: "Library access is not included in your plan." });
    return;
  }

  const items = await listFeaturedAppsForUser(userId);
  res.json({ success: true, items });
});

router.post("/featured/:featuredAppId/add", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  if (!(await ensureLibraryAccess(userId))) {
    res.status(403).json({ success: false, error: "Library access is not included in your plan." });
    return;
  }

  const featuredAppId = String(req.params.featuredAppId ?? "");
  const result = await addFeaturedAppToUser(userId, featuredAppId);
  if (!result) {
    res.status(404).json({ success: false, error: "Featured app not found." });
    return;
  }

  L.log(
    "LIBRARY",
    `Featured app added user=${userId} featured=${featuredAppId} installed=${result.installedAppId}`
  );
  res.json({
    success: true,
    installedAppId: result.installedAppId,
    spec: result.spec,
  });
});

router.post("/featured/:featuredAppId/ignore", async (req: Request, res: Response) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  if (!(await ensureLibraryAccess(userId))) {
    res.status(403).json({ success: false, error: "Library access is not included in your plan." });
    return;
  }

  const featuredAppId = String(req.params.featuredAppId ?? "");
  await markFeaturedAppIgnored(userId, featuredAppId);
  res.json({ success: true });
});

export default router;
