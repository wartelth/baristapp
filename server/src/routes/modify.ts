import { Router, Request, Response } from "express";
import { modifyMiniApp } from "../services/modifyService";
import { mountAppEndpoints } from "../services/subServerManager";
import L, { fmtMs } from "../utils/logger";

const router = Router();

router.post("/", async (req: Request, res: Response): Promise<void> => {
  const reqId = (req as any).__reqId ?? "????";
  const startTime = Date.now();

  L.separator();
  L.log("GENERATE", `#${reqId} Modify request`);

  const { currentSpec, modifyPrompt } = req.body;

  if (!currentSpec || !currentSpec.appId) {
    L.warn("GENERATE", `#${reqId} Rejected: missing currentSpec`);
    res.status(400).json({ success: false, error: "currentSpec is required." });
    return;
  }

  if (!modifyPrompt || typeof modifyPrompt !== "string" || modifyPrompt.trim().length === 0) {
    L.warn("GENERATE", `#${reqId} Rejected: missing modifyPrompt`);
    res.status(400).json({ success: false, error: "modifyPrompt is required." });
    return;
  }

  L.detail("GENERATE", "Modifying", currentSpec.appId);
  L.detail("GENERATE", "Prompt", `"${modifyPrompt.slice(0, 120)}${modifyPrompt.length > 120 ? "..." : ""}"`);

  try {
    const result = await modifyMiniApp(currentSpec, modifyPrompt.trim());
    const elapsed = Date.now() - startTime;

    if (result.success) {
      const app = result.miniApp;
      L.success("GENERATE", `#${reqId} App modified in ${fmtMs(elapsed)}`);

      // Re-mount server endpoints for v2 apps
      const v2 = app as any;
      if (v2.version === 2 && v2.serverEndpoints?.length > 0) {
        try {
          mountAppEndpoints(app.appId, v2.serverEndpoints);
          L.success("SUBSERVER", `Re-mounted ${v2.serverEndpoints.length} endpoint(s) for ${app.appId}`);
        } catch (err) {
          L.warn("SUBSERVER", `Failed to mount endpoints: ${err}`);
        }
      }

      L.separator();
      res.json(result);
    } else {
      L.error("GENERATE", `#${reqId} Modify failed — ${result.error} — ${fmtMs(elapsed)}`);
      L.separator();
      res.status(422).json(result);
    }
  } catch (err) {
    const elapsed = Date.now() - startTime;
    const message = err instanceof Error ? err.message : "Unknown error";
    L.error("GENERATE", `#${reqId} Modify exception — ${message} — ${fmtMs(elapsed)}`);
    L.separator();
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
