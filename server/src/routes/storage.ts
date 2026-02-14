import { Router, Request, Response } from "express";
import {
  saveAppSpec,
  loadAppSpec,
  saveAppState,
  loadAppState,
} from "../services/supabaseClient";
import L from "../utils/logger";

const router = Router();

function getUserId(req: Request): string {
  return (req.headers["x-device-id"] as string) ?? "anonymous";
}

// ---------------------------------------------------------------------------
// App spec endpoints
// ---------------------------------------------------------------------------

router.get("/apps/:appId/spec", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const appId = req.params.appId as string;

  L.log("STORAGE", `GET spec — user=${userId} app=${appId}`);

  const spec = await loadAppSpec(userId, appId);
  if (!spec) {
    L.warn("STORAGE", `Spec not found — user=${userId} app=${appId}`);
    res.status(404).json({ error: "App not found" });
    return;
  }
  L.success("STORAGE", `Loaded spec — user=${userId} app=${appId}`);
  res.json({ spec });
});

router.put("/apps/:appId/spec", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const appId = req.params.appId as string;
  const { spec } = req.body;

  L.log("STORAGE", `PUT spec — user=${userId} app=${appId}`);

  if (!spec) {
    L.warn("STORAGE", "Rejected: missing spec body");
    res.status(400).json({ error: "spec is required" });
    return;
  }

  await saveAppSpec(userId, appId, spec);
  L.success("STORAGE", `Saved spec — user=${userId} app=${appId}`);
  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// App state endpoints
// ---------------------------------------------------------------------------

router.get("/apps/:appId/state", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const appId = req.params.appId as string;

  L.log("STORAGE", `GET state — user=${userId} app=${appId}`);

  const state = await loadAppState(userId, appId);
  L.success("STORAGE", `Loaded state — user=${userId} app=${appId} (${state ? "found" : "empty"})`);
  res.json({ state: state ?? {} });
});

router.put("/apps/:appId/state", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const appId = req.params.appId as string;
  const { state } = req.body;

  L.log("STORAGE", `PUT state — user=${userId} app=${appId}`);

  if (!state || typeof state !== "object") {
    L.warn("STORAGE", "Rejected: missing or invalid state body");
    res.status(400).json({ error: "state object is required" });
    return;
  }

  const keys = Object.keys(state).length;
  await saveAppState(userId, appId, state);
  L.success("STORAGE", `Saved state — user=${userId} app=${appId} (${keys} keys)`);
  res.json({ success: true });
});

export default router;
