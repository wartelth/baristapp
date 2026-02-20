import type { MiniApp } from "@baristapp/shared";
import { validateMiniApp } from "../../validation/schemaValidator";
import { runSpecTests } from "../../validation/specTester";
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

function buildRepairPrompt(
  basePrompt: string,
  errors: string[],
  warnings: string[]
): string {
  const lines = [basePrompt, ""];

  if (errors.length > 0) {
    lines.push(
      "CRITICAL ERRORS (the app WILL crash — you MUST fix all of these):",
      ...errors.map((e) => `  ❌ ${e}`),
      ""
    );
  }

  if (warnings.length > 0) {
    lines.push(
      "WARNINGS (likely bugs — fix if possible):",
      ...warnings.map((w) => `  ⚠ ${w}`),
      ""
    );
  }

  lines.push(
    "Common fixes:",
    "- Every stateKey used by input/slider/toggle/select/tabs MUST exist in initialState.",
    "- Every resultKey from http/serverCall/skillCall should have a sensible default in initialState (null, [], {}).",
    "- list/chart dataKey must point to an array in initialState (use [] as default).",
    "- modal visibleKey must be a boolean in initialState (default false).",
    "- navigate screenId must match an existing screen id.",
    "- serverCall endpointId must match an id in serverEndpoints.",
    "- skillCall skillId must be listed in the top-level skills array.",
    "",
    "Keep the same app intent, but fix ALL errors above. Output ONLY the corrected JSON."
  );

  return lines.join("\n");
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

    // Phase 1: Schema validation (Zod)
    const validation = validateMiniApp(generatedSpec);
    if (!validation.valid) {
      iterationLog.push({
        iteration: i,
        action: draftOrRepair,
        ok: false,
        message: `Schema: ${validation.errors.join("; ")}`,
      });
      currentPrompt = buildRepairPrompt(input.prompt, validation.errors, []);
      continue;
    }

    // Phase 2: Deep spec tests (runtime-safety checks)
    const testResult = runSpecTests(validation.data);
    currentSpec = validation.data;

    const allChecks = [...testResult.errors, ...testResult.warnings];
    iterationLog.push({
      iteration: i,
      action: "test",
      ok: testResult.passed,
      message: testResult.passed
        ? `All tests passed (${testResult.warnings.length} warnings)`
        : `${testResult.errors.length} errors, ${testResult.warnings.length} warnings`,
    });

    if (testResult.errors.length > 0) {
      L.warn("AGENT", `Spec tests: ${testResult.errors.length} errors`);
      for (const e of testResult.errors) L.detail("AGENT", "  ERR", e);
    }
    if (testResult.warnings.length > 0) {
      L.detail("AGENT", "Spec warnings", testResult.warnings.length);
    }

    if (testResult.passed) {
      return {
        success: true,
        miniApp: currentSpec,
        testReport: { passed: true, checks: allChecks },
        iterationLog,
      };
    }

    currentPrompt = buildRepairPrompt(input.prompt, testResult.errors, testResult.warnings);
  }

  // If we exhausted iterations but have a spec, return it with the test report
  // so the user at least gets something (even if imperfect)
  if (currentSpec) {
    const finalTests = runSpecTests(currentSpec);
    L.warn("AGENT", `Returning spec with ${finalTests.errors.length} errors after max iterations`);
    return {
      success: true,
      miniApp: currentSpec,
      testReport: {
        passed: finalTests.passed,
        checks: [...finalTests.errors, ...finalTests.warnings],
      },
      iterationLog,
    };
  }

  return {
    success: false,
    testReport: { passed: false, checks: ["Max iterations reached without producing a valid spec"] },
    iterationLog,
    error: "Worker reached max iterations without passing checks",
  };
}
