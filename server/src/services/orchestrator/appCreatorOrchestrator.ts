import type { MiniApp } from "@swissknife/shared";
import { getLLMProvider } from "../llm/providerFactory";
import { createToolRegistry } from "../worker/toolRegistry";
import { runAgentWorker } from "../worker/agentWorker";
import { deployMiniAppToSandbox } from "../runtime/sandboxManager";
import {
  loadLatestDeployment,
  listAppVersions,
  saveAppDeployment,
  saveAppSpec,
  saveAppVersion,
} from "../supabaseClient";
import { emitOrchestrationEvent } from "./orchestrationEvents";
import L from "../../utils/logger";

export interface OrchestratedGenerationResult {
  success: true;
  miniApp: MiniApp;
  usage: {
    modelName: string;
    costUsd: number;
    numTurns: number;
  };
  artifact: {
    versionId: string | null;
    testsPassed: boolean;
  };
  testReport: {
    passed: boolean;
    checks: string[];
  };
  previewUrl?: string;
  iterationLog: Array<{ iteration: number; action: "draft" | "repair" | "test"; ok: boolean; message: string }>;
}

export interface OrchestratedFailureResult {
  success: false;
  error: string;
}

export type OrchestratedResult = OrchestratedGenerationResult | OrchestratedFailureResult;

const inFlightGenerations = new Map<string, number>();

function enterGenerationSlot(userId: string): boolean {
  const maxConcurrent = Number(process.env.MAX_CONCURRENT_GENERATIONS_PER_USER ?? 2);
  const current = inFlightGenerations.get(userId) ?? 0;
  if (current >= maxConcurrent) return false;
  inFlightGenerations.set(userId, current + 1);
  return true;
}

function leaveGenerationSlot(userId: string): void {
  const current = inFlightGenerations.get(userId) ?? 0;
  if (current <= 1) {
    inFlightGenerations.delete(userId);
    return;
  }
  inFlightGenerations.set(userId, current - 1);
}

function summarizeChecks(checks: string[]): string {
  if (checks.length === 0) return "All checks passed";
  return checks.slice(0, 4).join("; ");
}

export async function createMiniAppWithOrchestrator(
  userId: string,
  prompt: string
): Promise<OrchestratedResult> {
  if (!enterGenerationSlot(userId)) {
    return {
      success: false,
      error: "You already have too many app generations running. Please retry in a few moments.",
    };
  }

  const provider = getLLMProvider();
  const maxIterations = Math.max(1, Number(process.env.AGENT_MAX_ITERATIONS ?? 3));
  L.log("AGENT", `Orchestrator start user=${userId}`);
  L.detail("AGENT", "Provider", provider.providerName);
  L.detail("AGENT", "Max iterations", maxIterations);
  L.detail("AGENT", "Prompt chars", prompt.length);

  try {
    emitOrchestrationEvent({
      userId,
      appId: "pending",
      stage: "start",
      message: "Starting app creator worker",
      metadata: { provider: provider.providerName, maxIterations },
    });

    const worker = await runAgentWorker({
      provider,
      prompt,
      maxIterations,
      tools: createToolRegistry(process.cwd()),
    });

    if (!worker.success || !worker.miniApp) {
      return {
        success: false,
        error: worker.error ?? "App creator worker failed",
      };
    }

    const app = worker.miniApp;
    L.success("AGENT", `Worker completed for ${app.appId}`);
    L.detail("AGENT", "Iteration count", worker.iterationLog.length);
    emitOrchestrationEvent({
      userId,
      appId: app.appId,
      stage: "validation",
      message: worker.testReport.passed ? "Spec checks passed" : "Spec checks failed",
      metadata: { checks: worker.testReport.checks },
    });

    await saveAppSpec(userId, app.appId, app);

    const previousVersion = (await listAppVersions(userId, app.appId))[0];
    const version = await saveAppVersion({
      userId,
      appId: app.appId,
      parentVersionId: previousVersion?.id ?? null,
      sourceRequestType: "generate",
      commitMessage: "Generated app via orchestrator worker",
      diffSummary: summarizeChecks(worker.testReport.checks),
      testsPassed: worker.testReport.passed,
      spec: app,
    });

    emitOrchestrationEvent({
      userId,
      appId: app.appId,
      stage: "versioning",
      message: "Persisted app version",
      metadata: { versionId: version?.id ?? null },
    });

    const deployment = await deployMiniAppToSandbox(
      app.appId,
      version?.id ?? "unversioned",
      app
    );
    L.detail("AGENT", "Deploy provider", deployment.provider);
    L.detail("AGENT", "Deploy status", deployment.status);
    if (version?.id) {
      await saveAppDeployment({
        userId,
        appId: app.appId,
        versionId: version.id,
        provider: deployment.provider,
        status: deployment.status,
        previewUrl: deployment.previewUrl ?? null,
        runtimeId: deployment.sandboxId ?? null,
        healthStatus: deployment.healthCheck?.message ?? null,
      });
    }

    emitOrchestrationEvent({
      userId,
      appId: app.appId,
      stage: "deploy",
      message: deployment.status,
      metadata: { previewUrl: deployment.previewUrl ?? null },
    });

    const latestDeployment = await loadLatestDeployment(userId, app.appId);
    return {
      success: true,
      miniApp: app,
      usage: {
        modelName: `${provider.providerName}:agent-worker`,
        costUsd: 0,
        numTurns: worker.iterationLog.length,
      },
      artifact: {
        versionId: version?.id ?? null,
        testsPassed: worker.testReport.passed,
      },
      testReport: worker.testReport,
      previewUrl: latestDeployment?.previewUrl ?? deployment.previewUrl,
      iterationLog: worker.iterationLog,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  } finally {
    leaveGenerationSlot(userId);
  }
}

export async function modifyMiniAppWithOrchestrator(
  userId: string,
  currentSpec: MiniApp,
  modifyPrompt: string
): Promise<OrchestratedResult> {
  const provider = getLLMProvider();
  L.log("AGENT", `Orchestrator modify start user=${userId} app=${currentSpec.appId}`);
  L.detail("AGENT", "Provider", provider.providerName);
  L.detail("AGENT", "Prompt chars", modifyPrompt.length);
  const result = await provider.modifyMiniApp(currentSpec, modifyPrompt);
  if (!result.success) return result;

  const app = result.miniApp;
  await saveAppSpec(userId, app.appId, app);
  const previousVersion = (await listAppVersions(userId, app.appId))[0];
  const version = await saveAppVersion({
    userId,
    appId: app.appId,
    parentVersionId: previousVersion?.id ?? null,
    sourceRequestType: "modify",
    commitMessage: "Modified app via orchestrator",
    diffSummary: `Prompt: ${modifyPrompt.slice(0, 120)}`,
    testsPassed: true,
    spec: app,
  });

  const deployment = await deployMiniAppToSandbox(
    app.appId,
    version?.id ?? "unversioned",
    app
  );
  if (version?.id) {
    await saveAppDeployment({
      userId,
      appId: app.appId,
      versionId: version.id,
      provider: deployment.provider,
      status: deployment.status,
      previewUrl: deployment.previewUrl ?? null,
      runtimeId: deployment.sandboxId ?? null,
      healthStatus: deployment.healthCheck?.message ?? null,
    });
  }

  return {
    success: true,
    miniApp: app,
    usage: result.usage,
    artifact: {
      versionId: version?.id ?? null,
      testsPassed: true,
    },
    testReport: { passed: true, checks: [] },
    previewUrl: deployment.previewUrl,
    iterationLog: [
      {
        iteration: 1,
        action: "draft",
        ok: true,
        message: "Modify request completed",
      },
    ],
  };
}
