import { Router, Request, Response } from "express";
import type { MiniAppServerEndpoint } from "@baristapp/shared";
import { handleHuggingFace } from "../subservers/huggingfaceHandler";
import { handleTransform } from "../subservers/transformHandler";
import { handleProxy } from "../subservers/proxyHandler";
import L, { fmtMs } from "../utils/logger";

// ---------------------------------------------------------------------------
// Per-app endpoint routers (in-memory registry)
// ---------------------------------------------------------------------------

interface MountedApp {
  router: Router;
  endpoints: MiniAppServerEndpoint[];
}

const mountedApps = new Map<string, MountedApp>();

/**
 * Create an Express router with handlers for each endpoint defined in the spec.
 */
export function mountAppEndpoints(
  appId: string,
  endpoints: MiniAppServerEndpoint[]
): Router {
  if (mountedApps.has(appId)) {
    unmountAppEndpoints(appId);
  }

  const router = Router();

  for (const endpoint of endpoints) {
    const method = (endpoint.method ?? "POST").toLowerCase() as "get" | "post" | "put" | "delete";
    const path = `/${endpoint.id}`;

    L.log("SUBSERVER", `Mount ${method.toUpperCase()} /api/apps/${appId}/endpoints${path} → ${endpoint.processing.type}`);

    router[method](path, async (req: Request, res: Response) => {
      const start = Date.now();
      L.log("SUBSERVER", `${appId}/${endpoint.id} — processing (${endpoint.processing.type})...`);

      try {
        let result: unknown;

        switch (endpoint.processing.type) {
          case "huggingface":
            result = await handleHuggingFace(req, endpoint.processing as any);
            break;
          case "transform":
            result = await handleTransform(req, endpoint.processing as any);
            break;
          case "proxy":
            result = await handleProxy(req, endpoint.processing as any);
            break;
          default:
            L.warn("SUBSERVER", `Unknown processing type: ${endpoint.processing.type}`);
            res.status(400).json({ error: `Unknown processing type: ${endpoint.processing.type}` });
            return;
        }

        const elapsed = Date.now() - start;
        L.success("SUBSERVER", `${appId}/${endpoint.id} → 200 ${fmtMs(elapsed)}`);
        res.json(result);
      } catch (err) {
        const elapsed = Date.now() - start;
        const message = err instanceof Error ? err.message : String(err);
        L.error("SUBSERVER", `${appId}/${endpoint.id} → 500 ${fmtMs(elapsed)} — ${message}`);
        res.status(500).json({ error: message });
      }
    });
  }

  mountedApps.set(appId, { router, endpoints });
  L.success("SUBSERVER", `App "${appId}" mounted with ${endpoints.length} endpoint(s)`);
  return router;
}

/** Remove a previously mounted app's endpoints */
export function unmountAppEndpoints(appId: string): void {
  mountedApps.delete(appId);
  L.log("SUBSERVER", `Unmounted app "${appId}"`);
}

/** Get the router for a mounted app */
export function getAppRouter(appId: string): Router | undefined {
  return mountedApps.get(appId)?.router;
}

/** List all mounted apps */
export function listMountedApps(): string[] {
  return Array.from(mountedApps.keys());
}
