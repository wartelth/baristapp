import { Router, Request, Response } from "express";
import { getAppRouter } from "../services/subServerManager";
import L from "../utils/logger";

const router = Router();

/**
 * Dynamic per-app endpoint dispatch.
 * Routes: POST /api/apps/:appId/endpoints/:endpointId
 */
router.all("/:appId/endpoints/:endpointId", (req: Request, res: Response) => {
  const { appId, endpointId } = req.params;

  L.log("ENDPOINT", `${req.method} /${appId as string}/${endpointId as string}`);

  const appRouter = getAppRouter(appId as string);
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
