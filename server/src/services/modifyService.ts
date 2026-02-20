import { query } from "@anthropic-ai/claude-agent-sdk";
import { buildModifyPrompt } from "../prompts/modifyPrompt";
import { MiniAppJSONSchema } from "../validation/jsonSchema";
import { extractJSON, validateMiniApp } from "../validation/schemaValidator";
import { saveSession } from "./sessionStore";
import type { MiniApp } from "@baristapp/shared";
import L, { fmtMs, fmtCost } from "../utils/logger";

interface ModifySuccess {
  success: true;
  miniApp: MiniApp;
  usage: {
    modelName: string;
    costUsd: number;
    numTurns: number;
  };
}

interface ModifyFailure {
  success: false;
  error: string;
}

type ModifyResult = ModifySuccess | ModifyFailure;

/**
 * Takes an existing spec + modification prompt, sends to Claude,
 * validates the result, and returns the updated spec.
 */
export async function modifyMiniApp(
  currentSpec: MiniApp,
  modifyPrompt: string
): Promise<ModifyResult> {
  const currentSpecJson = JSON.stringify(currentSpec, null, 2);
  const systemPrompt = buildModifyPrompt(currentSpecJson);

  // Modifications use Sonnet for speed; budget raised because large specs
  // (20KB+) need ~$0.35 per call and may retry
  const model = "claude-sonnet-4-5-20250929";
  const maxTurns = 3;
  const maxBudget = 1.5;

  L.log("AGENT", "Modify mode — using Sonnet 4.5");
  L.detail("AGENT", "Modifying", currentSpec.appId);
  L.detail("AGENT", "Prompt", `"${modifyPrompt.slice(0, 100)}${modifyPrompt.length > 100 ? "..." : ""}"`);

  const startTime = Date.now();

  try {
    const session = query({
      prompt: modifyPrompt,
      options: {
        model,
        systemPrompt,
        outputFormat: {
          type: "json_schema",
          schema: MiniAppJSONSchema as Record<string, unknown>,
        },
        permissionMode: "bypassPermissions",
        allowDangerouslySkipPermissions: true,
        maxTurns,
        maxBudgetUsd: maxBudget,
        allowedTools: [],
        disallowedTools: ["Bash", "Edit", "Write", "Read", "Glob", "Grep", "NotebookEdit"],
      },
    });

    let resultText = "";
    let structuredOutput: unknown = undefined;
    let costUsd = 0;
    let numTurns = 0;

    for await (const message of session) {
      if (message.type === "assistant") {
        const elapsed = Date.now() - startTime;
        L.log("AGENT", `Modify turn ${fmtMs(elapsed)}`);
      }

      if (message.type === "result") {
        const elapsed = Date.now() - startTime;

        if (message.subtype === "success") {
          resultText = message.result;
          structuredOutput = message.structured_output;
          costUsd = message.total_cost_usd;
          numTurns = message.num_turns;
          L.success("AGENT", `Modify completed in ${fmtMs(elapsed)}`);
          L.detail("AGENT", "Turns", numTurns);
          L.detail("AGENT", "Cost", fmtCost(costUsd));
        } else {
          const errors = "errors" in message ? message.errors : ["Unknown agent error"];
          L.error("AGENT", `Modify failed (${message.subtype}) — ${fmtMs(elapsed)}`);
          return {
            success: false,
            error: `Agent error: ${(errors as string[]).join("; ")}`,
          };
        }
      }
    }

    // Parse output
    let raw: unknown;
    if (structuredOutput !== undefined && structuredOutput !== null) {
      raw = structuredOutput;
    } else if (resultText) {
      raw = extractJSON(resultText);
    } else {
      return { success: false, error: "Agent returned no output" };
    }

    // Validate
    const validation = validateMiniApp(raw);

    if (validation.valid) {
      const data = validation.data;

      // Ensure appId stays the same
      if (data.appId !== currentSpec.appId) {
        L.warn("VALIDATE", `Agent changed appId from "${currentSpec.appId}" to "${data.appId}" — forcing original`);
        (data as any).appId = currentSpec.appId;
      }

      L.success("VALIDATE", "Modified spec validated");
      L.detail("VALIDATE", "title", `"${data.title}"`);
      L.detail("VALIDATE", "screens", data.screens.length);

      saveSession(data.appId, `[MODIFY] ${modifyPrompt}`, data);
      return {
        success: true,
        miniApp: data,
        usage: {
          modelName: model,
          costUsd,
          numTurns,
        },
      };
    }

    L.error("VALIDATE", `Modify validation failed with ${validation.errors.length} error(s)`);
    validation.errors.forEach((e, i) => L.detail("VALIDATE", `Error ${i + 1}`, e));

    return {
      success: false,
      error: `Validation failed: ${validation.errors.join("; ")}`,
    };
  } catch (err) {
    const elapsed = Date.now() - startTime;
    const message = err instanceof Error ? err.message : String(err);
    L.error("AGENT", `Modify exception after ${fmtMs(elapsed)} — ${message}`);
    return { success: false, error: `Agent exception: ${message}` };
  }
}
