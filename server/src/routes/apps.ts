import { Router, Request, Response } from "express";
import { getAppRouter, mountAppEndpoints } from "../services/subServerManager";
import { loadAnyAppSpec } from "../services/supabaseClient";
import L from "../utils/logger";

const router = Router();

/**
 * Dynamic per-app endpoint dispatch.
 * Routes: POST /api/apps/:appId/endpoints/:endpointId
 *
 * If the app isn't mounted in memory yet (e.g. after a server restart or
 * for library-installed apps), we lazy-load the spec from the database and
 * mount its endpoints on the fly.
 */
router.all("/:appId/endpoints/:endpointId", async (req: Request, res: Response) => {
  const { appId, endpointId } = req.params;

  L.log("ENDPOINT", `${req.method} /${appId as string}/${endpointId as string}`);

  let appRouter = getAppRouter(appId as string);

  // Lazy-mount: if not in memory, try loading from the database
  if (!appRouter) {
    const spec = await loadAnyAppSpec(appId as string) as any;
    if (spec?.version === 2 && spec.serverEndpoints?.length > 0) {
      try {
        mountAppEndpoints(appId as string, spec.serverEndpoints);
        L.success("ENDPOINT", `Lazy-mounted ${spec.serverEndpoints.length} endpoint(s) for "${appId}"`);
        appRouter = getAppRouter(appId as string);
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

  req.url = `/${endpointId as string}`;
  appRouter(req, res, () => {
    L.warn("ENDPOINT", `Endpoint "${endpointId}" not found for app "${appId}"`);
    res.status(404).json({
      error: `Endpoint "${endpointId}" not found for app "${appId}"`,
    });
  });
});

export default router;
