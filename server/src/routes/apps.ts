import { Router, Request, Response } from "express";
import { getAppRouter, mountAppEndpoints } from "../services/subServerManager";
import {
  listAppVersions,
  loadAnyAppSpec,
  loadAppVersion,
  saveAppDeployment,
  saveAppSpec,
  saveAppVersion,
} from "../services/supabaseClient";
import { deployMiniAppToSandbox } from "../services/runtime/sandboxManager";
import { getUserId } from "../utils/auth";
import L from "../utils/logger";

const router = Router();
const appRateLimitMap = new Map<string, number[]>();
const APP_RATE_LIMIT = Number(process.env.APP_ENDPOINT_RATE_LIMIT ?? 120);
const APP_RATE_WINDOW_MS = 60_000;

function checkAppEndpointRateLimit(key: string): boolean {
  const now = Date.now();
  const arr = appRateLimitMap.get(key) ?? [];
  const kept = arr.filter((ts) => now - ts < APP_RATE_WINDOW_MS);
  if (kept.length >= APP_RATE_LIMIT) {
    appRateLimitMap.set(key, kept);
    return false;
  }
  kept.push(now);
  appRateLimitMap.set(key, kept);
  return true;
}

/**
 * Dynamic per-app endpoint dispatch.
 * Routes: POST /api/apps/:appId/endpoints/:endpointId
 *
 * If the app isn't mounted in memory yet (e.g. after a server restart or
 * for library-installed apps), we lazy-load the spec from the database and
 * mount its endpoints on the fly.
 */
router.all("/:appId/endpoints/:endpointId", async (req: Request, res: Response) => {
  const appId = String(req.params.appId ?? "");
  const endpointId = String(req.params.endpointId ?? "");
  const userId = getUserId(req);

  if (!checkAppEndpointRateLimit(`${userId}:${appId}`)) {
    res.status(429).json({ error: "Too many endpoint calls for this app. Try again soon." });
    return;
  }

  L.log("ENDPOINT", `${req.method} /${appId}/${endpointId}`);

  let appRouter = getAppRouter(appId);

  // Lazy-mount: if not in memory, try loading from the database
  if (!appRouter) {
    const spec = await loadAnyAppSpec(appId) as any;
    if (spec?.version === 2 && spec.serverEndpoints?.length > 0) {
      try {
        mountAppEndpoints(appId, spec.serverEndpoints);
        L.success("ENDPOINT", `Lazy-mounted ${spec.serverEndpoints.length} endpoint(s) for "${appId}"`);
        appRouter = getAppRouter(appId);
      } catch (err) {
        L.warn("ENDPOINT", `Failed to lazy-mount endpoints for "${appId}": ${err}`);
      }
    }
  }

  if (!appRouter) {
    L.warn("ENDPOINT", `No endpoints mounted for app "${appId}"`);
    res.status(404).json({
      error: `No endpoints mounted for app "${appId}"`,
    });
    return;
  }

  req.url = `/${endpointId}`;
  appRouter(req, res, () => {
    L.warn("ENDPOINT", `Endpoint "${endpointId}" not found for app "${appId}"`);
    res.status(404).json({
      error: `Endpoint "${endpointId}" not found for app "${appId}"`,
    });
  });
});

router.get("/:appId/health", async (req: Request, res: Response) => {
  const appId = String(req.params.appId ?? "");
  const appRouter = getAppRouter(appId);
  const mounted = Boolean(appRouter);
  res.json({
    ok: true,
    appId,
    mounted,
    runtime: "local",
  });
});

router.get("/:appId/versions", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const appId = String(req.params.appId ?? "");
  const versions = await listAppVersions(userId, appId);
  res.json({ success: true, versions });
});

router.post("/:appId/rollback", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const appId = String(req.params.appId ?? "");
  const { versionId } = req.body ?? {};

  if (!versionId || typeof versionId !== "string") {
    res.status(400).json({ success: false, error: "versionId is required." });
    return;
  }

  const version = await loadAppVersion(userId, appId, versionId);
  if (!version) {
    res.status(404).json({ success: false, error: "Version not found." });
    return;
  }

  await saveAppSpec(userId, appId, version.spec);
  const rollbackVersion = await saveAppVersion({
    userId,
    appId,
    parentVersionId: version.id,
    sourceRequestType: "rollback",
    commitMessage: `Rollback to version ${version.id}`,
    diffSummary: "Rollback operation",
    testsPassed: true,
    spec: version.spec,
  });

  const deployment = await deployMiniAppToSandbox(
    appId,
    rollbackVersion?.id ?? version.id,
    version.spec as any
  );
  if (rollbackVersion?.id) {
    await saveAppDeployment({
      userId,
      appId,
      versionId: rollbackVersion.id,
      provider: deployment.provider,
      status: deployment.status,
      previewUrl: deployment.previewUrl ?? null,
      runtimeId: deployment.sandboxId ?? null,
      healthStatus: deployment.healthCheck?.message ?? null,
    });
  }

  const v2 = version.spec as any;
  if (v2.version === 2 && Array.isArray(v2.serverEndpoints) && v2.serverEndpoints.length > 0) {
    mountAppEndpoints(appId, v2.serverEndpoints);
  }

  res.json({
    success: true,
    appId,
    rollbackVersionId: rollbackVersion?.id ?? null,
    deployed: deployment.status === "deployed",
    previewUrl: deployment.previewUrl,
  });
});

export default router;
