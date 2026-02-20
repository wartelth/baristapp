import type { MiniApp } from "@baristapp/shared";
import L from "../../utils/logger";
import { mountAppEndpoints } from "../subServerManager";
import {
  createSandbox,
  isDaytonaConfigured,
  runSandboxCommand,
  writeSandboxFile,
} from "./daytonaClient";

export interface DeploymentResult {
  provider: "daytona" | "local";
  status: "deployed" | "skipped" | "failed";
  previewUrl?: string;
  sandboxId?: string;
  healthCheck?: {
    ok: boolean;
    message: string;
  };
  error?: string;
}

async function runHealthCheck(url: string): Promise<{ ok: boolean; message: string }> {
  try {
    const response = await fetch(url, { method: "GET" });
    const body = await response.text();
    return {
      ok: response.ok,
      message: `status=${response.status} body=${body.slice(0, 80)}`,
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function deployMiniAppToSandbox(
  appId: string,
  versionId: string,
  miniApp: MiniApp
): Promise<DeploymentResult> {
  const runtimeMode = (process.env.SANDBOX_RUNTIME_MODE ?? "auto").toLowerCase();
  const publicBaseUrl =
    process.env.SERVER_PUBLIC_BASE_URL ??
    `http://localhost:${process.env.PORT ?? 3001}`;

  if (runtimeMode === "local" || !isDaytonaConfigured()) {
    const v2 = miniApp as any;
    L.log("SUBSERVER", `Local runtime deploy ${appId}@${versionId}`);
    L.detail("SUBSERVER", "Runtime mode", runtimeMode === "local" ? "local (forced)" : "local (fallback)");
    if (v2.version === 2 && Array.isArray(v2.serverEndpoints) && v2.serverEndpoints.length > 0) {
      mountAppEndpoints(appId, v2.serverEndpoints);
      L.detail("SUBSERVER", "Mounted endpoints", v2.serverEndpoints.length);
    } else {
      L.detail("SUBSERVER", "Mounted endpoints", 0);
    }
    return {
      provider: "local",
      status: "deployed",
      previewUrl: `${publicBaseUrl.replace(/\/+$/, "")}/api/apps/${appId}/health`,
      healthCheck: {
        ok: true,
        message: "Local runtime is active (free mode)",
      },
    };
  }

  try {
    L.log("SUBSERVER", `Daytona deploy ${appId}@${versionId}`);
    const sandbox = await createSandbox(`${appId}-${versionId}`.slice(0, 60));
    L.detail("SUBSERVER", "Sandbox id", sandbox.id);
    await writeSandboxFile(
      sandbox.id,
      "/workspace/mini-app-spec.json",
      JSON.stringify(miniApp, null, 2)
    );
    const launch = await runSandboxCommand(
      sandbox.id,
      "node -e \"const fs=require('fs');const http=require('http');const spec=JSON.parse(fs.readFileSync('/workspace/mini-app-spec.json','utf8'));http.createServer((req,res)=>{if(req.url==='/health'){res.end('ok')}else{res.setHeader('content-type','application/json');res.end(JSON.stringify({appId:spec.appId,title:spec.title}))}}).listen(3000,'0.0.0.0')\""
    );
    if (!launch.ok) {
      L.error("SUBSERVER", `Daytona launch failed for ${appId}: ${launch.output}`);
      return {
        provider: "daytona",
        status: "failed",
        sandboxId: sandbox.id,
        error: launch.output,
      };
    }

    const previewUrl = sandbox.previewUrl;
    const healthCheck = previewUrl
      ? await runHealthCheck(`${previewUrl.replace(/\/+$/, "")}/health`)
      : { ok: false, message: "No preview URL returned by sandbox provider" };

    L.log("SUBSERVER", `Daytona deploy ${appId}@${versionId} → ${healthCheck.message}`);
    return {
      provider: "daytona",
      status: healthCheck.ok ? "deployed" : "failed",
      previewUrl,
      sandboxId: sandbox.id,
      healthCheck,
      error: healthCheck.ok ? undefined : healthCheck.message,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      provider: "daytona",
      status: "failed",
      error: message,
    };
  }
}
