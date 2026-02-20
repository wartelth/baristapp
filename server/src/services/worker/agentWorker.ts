import type { MiniApp } from "@swissknife/shared";
import { validateMiniApp } from "../../validation/schemaValidator";
import type {
  GenerationResult,
  LLMProvider,
  ModifyResult,
} from "../llm/providers/types";
import type { WorkerTools } from "./toolRegistry";
import L from "../../utils/logger";

export interface WorkerIterationLog {
  iteration: number;
  action: "draft" | "repair" | "test";
  ok: boolean;
  message: string;
}

export interface WorkerExecutionResult {
  success: boolean;
  miniApp?: MiniApp;
  testReport: {
    passed: boolean;
    checks: string[];
  };
  iterationLog: WorkerIterationLog[];
  error?: string;
}

export interface WorkerRunInput {
  provider: LLMProvider;
  prompt: string;
  maxIterations: number;
  tools: WorkerTools;
}

const EXTERNAL_RESOURCE_RE = /<(?:script|link)\b[^>]*\b(?:src|href)\s*=\s*["']https?:\/\//i;

function runSpecChecks(spec: MiniApp): { passed: boolean; checks: string[] } {
  const checks: string[] = [];
  if (!spec.screens?.length) checks.push("App has no screens");
  if (!spec.title || spec.title.trim().length < 2) checks.push("App title too short");
  if (!spec.icon || String(spec.icon).length < 1) checks.push("Missing icon");

  const endpointIds = new Set<string>();
  const duplicateEndpoints = (spec as any).serverEndpoints?.some((e: any) => {
    if (!e?.id) return false;
    if (endpointIds.has(e.id)) return true;
    endpointIds.add(e.id);
    return false;
  });
  if (duplicateEndpoints) checks.push("Duplicate server endpoint ids");

  for (const screen of spec.screens ?? []) {
    for (const comp of (screen as any).components ?? []) {
      if (comp.type === "webView") {
        const html: string = comp.props?.html ?? "";
        if (!html || html.trim().length < 50) {
          checks.push(`WebView "${comp.id}" has empty or trivial HTML (must be >50 chars)`);
        }
        if (EXTERNAL_RESOURCE_RE.test(html)) {
          checks.push(`WebView "${comp.id}" contains external script/link tags — HTML must be self-contained (Apple 4.7 compliance)`);
        }
        const declaredKeys: string[] = comp.props?.stateKeys ?? [];
        if (declaredKeys.length > 0 && !html.includes("SwissKnife")) {
          checks.push(`WebView "${comp.id}" declares stateKeys but HTML does not use the SwissKnife bridge API`);
        }
      }
    }
  }

  return {
    passed: checks.length === 0,
    checks,
  };
}

function buildRepairPrompt(basePrompt: string, checks: string[]): string {
  return [
    basePrompt,
    "",
    "Repair requirements from automated checks:",
    ...checks.map((c) => `- ${c}`),
    "",
    "Keep the same app intent, but fix all issues above.",
  ].join("\n");
}

export async function runAgentWorker(input: WorkerRunInput): Promise<WorkerExecutionResult> {
  const iterationLog: WorkerIterationLog[] = [];
  let currentSpec: MiniApp | undefined;
  let currentPrompt = input.prompt;

  for (let i = 1; i <= input.maxIterations; i += 1) {
    const draftOrRepair = i === 1 ? "draft" : "repair";
    L.log("AGENT", `Worker iteration ${i}/${input.maxIterations} (${draftOrRepair})`);
    const generation: GenerationResult | ModifyResult = currentSpec
      ? await input.provider.modifyMiniApp(currentSpec, currentPrompt)
      : await input.provider.generateMiniApp(currentPrompt);

    if (!generation.success) {
      iterationLog.push({
        iteration: i,
        action: draftOrRepair,
        ok: false,
        message: generation.error,
      });
      return {
        success: false,
        testReport: { passed: false, checks: ["Provider call failed"] },
        iterationLog,
        error: generation.error,
      };
    }

    const generatedSpec = generation.miniApp;
    const validation = validateMiniApp(generatedSpec);
    if (!validation.valid) {
      iterationLog.push({
        iteration: i,
        action: draftOrRepair,
        ok: false,
        message: validation.errors.join("; "),
      });
      currentPrompt = buildRepairPrompt(input.prompt, validation.errors);
      continue;
    }

    const checkReport = runSpecChecks(generatedSpec);
    currentSpec = generatedSpec;
    iterationLog.push({
      iteration: i,
      action: "test",
      ok: checkReport.passed,
      message: checkReport.passed
        ? "Spec checks passed"
        : `Spec checks failed: ${checkReport.checks.join("; ")}`,
    });

    if (checkReport.passed) {
      return {
        success: true,
        miniApp: currentSpec,
        testReport: checkReport,
        iterationLog,
      };
    }

    currentPrompt = buildRepairPrompt(input.prompt, checkReport.checks);
  }

  return {
    success: false,
    testReport: { passed: false, checks: ["Max iterations reached"] },
    iterationLog,
    error: "Worker reached max iterations without passing checks",
  };
}
