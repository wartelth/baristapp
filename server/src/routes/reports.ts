import { Router, Request, Response } from "express";
import { getUserId } from "../utils/auth";
import { saveReport } from "../services/reportStore";
import L from "../utils/logger";

const router = Router();

router.post("/", (req: Request, res: Response) => {
  const userId = getUserId(req);
  const appId = String(req.body?.appId ?? "").trim();
  const reason = String(req.body?.reason ?? "").trim();

  if (!appId) {
    res.status(400).json({ success: false, error: "appId is required" });
    return;
  }

  if (!reason) {
    res.status(400).json({ success: false, error: "reason is required" });
    return;
  }

  const report = saveReport({ userId, appId, reason });
  L.warn("REPORT", `Report received id=${report.id} user=${userId} app=${appId} reason=${reason}`);
  res.json({ success: true, id: report.id });
});

export default router;
