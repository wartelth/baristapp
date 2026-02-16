import { query } from "@anthropic-ai/claude-agent-sdk";
import { MASTER_PROMPT } from "../prompts/masterPrompt";
import { MiniAppJSONSchema } from "../validation/jsonSchema";
import { extractJSON, validateMiniApp } from "../validation/schemaValidator";
import { saveSession } from "./sessionStore";
import type { MiniApp } from "@swissknife/shared";
import L, { fmtMs, fmtCost } from "../utils/logger";

interface GenerationSuccess {
  success: true;
  miniApp: MiniApp;
  usage: {
    modelName: string;
    costUsd: number;
    numTurns: number;
  };
}

interface GenerationFailure {
  success: false;
  error: string;
}

type GenerationResult = GenerationSuccess | GenerationFailure;

// ---------------------------------------------------------------------------
// Two-tier model selection
// ---------------------------------------------------------------------------

const COMPLEX_KEYWORDS = [
  "camera", "photo", "capture", "scan",
  "classify", "identify", "recognize", "detect",
  "chart", "graph", "visualize", "dashboard",
  "map", "location", "gps", "navigate",
  "timer", "countdown", "stopwatch", "pomodoro",
  "api", "fetch", "http", "endpoint",
  "ml", "machine learning", "ai", "model",
  "record", "audio", "microphone", "voice",
  "tabs", "modal", "multi-screen",
  "track", "analyze", "monitor",
];

function isComplexPrompt(prompt: string): { complex: boolean; matchedKeywords: string[] } {
  const lower = prompt.toLowerCase();
  const matchedKeywords = COMPLEX_KEYWORDS.filter((kw) => lower.includes(kw));

  if (matchedKeywords.length >= 2) return { complex: true, matchedKeywords };
  if (prompt.length > 500) return { complex: true, matchedKeywords };

  return { complex: false, matchedKeywords };
}

/**
 * Sends user prompt to Claude Code agent and returns a validated MiniApp spec.
 */
export async function generateMiniApp(
  userPrompt: string
): Promise<GenerationResult> {
  const { complex, matchedKeywords } = isComplexPrompt(userPrompt);
  const model = complex ? "claude-opus-4-6" : "claude-sonnet-4-5-20250929";
  const modelShort = complex ? "Opus 4.6" : "Sonnet 4.5";
  const maxTurns = complex ? 6 : 3;
  const maxBudget = complex ? 2.0 : 0.5;

  L.log("AGENT", `Model selection: ${complex ? "COMPLEX" : "SIMPLE"} → ${modelShort}`);
  if (matchedKeywords.length > 0) {
    L.detail("AGENT", "Keywords", matchedKeywords.join(", "));
  }
  L.detail("AGENT", "Model", model);
  L.detail("AGENT", "Max turns", maxTurns);
  L.detail("AGENT", "Budget", `$${maxBudget.toFixed(2)}`);

  const startTime = Date.now();

  try {
    const session = query({
      prompt: userPrompt,
      options: {
        model,
        systemPrompt: MASTER_PROMPT,
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
      if (message.type === "system" && message.subtype === "init") {
        L.log("AGENT", `Session initialized — confirmed model: ${message.model}`);
      }

      if (message.type === "assistant") {
        const elapsed = Date.now() - startTime;
        const msg = (message as any).message;
        const preview = typeof msg === "string"
          ? msg.slice(0, 80).replace(/\n/g, " ")
          : "(structured)";
        L.log("AGENT", `Turn response ${fmtMs(elapsed)} — ${preview}...`);
      }

      if (message.type === "result") {
        const elapsed = Date.now() - startTime;

        if (message.subtype === "success") {
          resultText = message.result;
          structuredOutput = message.structured_output;
          costUsd = message.total_cost_usd;
          numTurns = message.num_turns;
          L.success("AGENT", `Completed in ${fmtMs(elapsed)}`);
          L.detail("AGENT", "Turns", numTurns);
          L.detail("AGENT", "Cost", fmtCost(costUsd));
          L.detail("AGENT", "Output", structuredOutput ? "structured JSON" : `text (${resultText.length} chars)`);
        } else {
          const errors = "errors" in message ? message.errors : ["Unknown agent error"];
          L.error("AGENT", `Failed (${message.subtype}) — ${fmtMs(elapsed)}`);
          (errors as string[]).forEach((e, i) => L.detail("AGENT", `Error ${i + 1}`, e));
          return {
            success: false,
            error: `Agent error (${message.subtype}): ${(errors as string[]).join("; ")}`,
          };
        }
      }
    }

    // Try structured output first, then fall back to parsing result text
    let raw: unknown;
    if (structuredOutput !== undefined && structuredOutput !== null) {
      L.log("VALIDATE", "Using structured_output from agent");
      raw = structuredOutput;
    } else if (resultText) {
      L.log("VALIDATE", "Falling back to parsing result text");
      raw = extractJSON(resultText);
    } else {
      L.error("AGENT", "Agent returned no output at all");
      return { success: false, error: "Agent returned no output" };
    }

    L.log("VALIDATE", "Running Zod validation...");
    const validation = validateMiniApp(raw);

    if (validation.valid) {
      const data = validation.data;
      // Count components recursively (children, tabs, renderItem, etc.)
      function countComponents(components: any[]): number {
        let count = 0;
        for (const c of components) {
          count++;
          if (c.props?.children) count += countComponents(c.props.children);
          if (c.props?.tabs) {
            for (const tab of c.props.tabs) {
              if (tab.children) count += countComponents(tab.children);
            }
          }
          if (c.props?.renderItem?.components) count += countComponents(c.props.renderItem.components);
        }
        return count;
      }
      const componentCount = data.screens.reduce((n, s) => n + countComponents(s.components), 0);
      const v = (data as any).version ?? 1;
      const capabilities = (data as any).capabilities?.length ?? 0;
      const endpoints = (data as any).serverEndpoints?.length ?? 0;
      const effects = (data as any).effects?.length ?? 0;

      L.success("VALIDATE", "Schema validation passed");
      L.detail("VALIDATE", "appId", data.appId);
      L.detail("VALIDATE", "title", `"${data.title}"`);
      L.detail("VALIDATE", "version", `v${v}`);
      L.detail("VALIDATE", "screens", data.screens.length);
      L.detail("VALIDATE", "components (deep)", componentCount);
      if (capabilities > 0) L.detail("VALIDATE", "capabilities", capabilities);
      if (endpoints > 0) L.detail("VALIDATE", "serverEndpoints", endpoints);
      if (effects > 0) L.detail("VALIDATE", "effects", effects);

      saveSession(data.appId, userPrompt, data);
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

    L.error("VALIDATE", `Failed with ${validation.errors.length} error(s):`);
    validation.errors.forEach((e, i) => L.detail("VALIDATE", `Error ${i + 1}`, e));

    return {
      success: false,
      error: `Validation failed: ${validation.errors.join("; ")}`,
    };
  } catch (err) {
    const elapsed = Date.now() - startTime;
    const message = err instanceof Error ? err.message : String(err);
    L.error("AGENT", `Exception after ${fmtMs(elapsed)} — ${message}`);
    return { success: false, error: `Agent exception: ${message}` };
  }
}
