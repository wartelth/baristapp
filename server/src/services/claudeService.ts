import { query } from "@anthropic-ai/claude-agent-sdk";
import { MASTER_PROMPT } from "../prompts/masterPrompt";
import { MiniAppJSONSchema } from "../validation/jsonSchema";
import { extractJSON, validateMiniApp } from "../validation/schemaValidator";
import { saveSession } from "./sessionStore";
import type { MiniApp } from "@swissknife/shared";

interface GenerationSuccess {
  success: true;
  miniApp: MiniApp;
}

interface GenerationFailure {
  success: false;
  error: string;
}

type GenerationResult = GenerationSuccess | GenerationFailure;

/**
 * Sends user prompt to Claude Code agent and returns a validated MiniApp spec.
 * The Agent SDK handles multi-turn retries internally via maxTurns.
 */
export async function generateMiniApp(
  userPrompt: string
): Promise<GenerationResult> {
  console.log("[AGENT] Starting Claude Code agent generation");

  const startTime = Date.now();

  try {
    const session = query({
      prompt: userPrompt,
      options: {
        systemPrompt: MASTER_PROMPT,
        outputFormat: {
          type: "json_schema",
          schema: MiniAppJSONSchema as Record<string, unknown>,
        },
        permissionMode: "bypassPermissions",
        allowDangerouslySkipPermissions: true,
        maxTurns: 3,
        maxBudgetUsd: 0.50,
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
        console.log(`[AGENT] Session initialized — model: ${message.model}`);
      }

      if (message.type === "result") {
        const elapsed = Date.now() - startTime;

        if (message.subtype === "success") {
          resultText = message.result;
          structuredOutput = message.structured_output;
          costUsd = message.total_cost_usd;
          numTurns = message.num_turns;
          console.log(
            `[AGENT] Success — ${numTurns} turn(s), $${costUsd.toFixed(4)}, ${elapsed}ms`
          );
        } else {
          // Error result
          const errors = "errors" in message ? message.errors : ["Unknown agent error"];
          console.error(
            `[AGENT] Failed (${message.subtype}) — ${errors.join("; ")} — ${elapsed}ms`
          );
          return {
            success: false,
            error: `Agent error (${message.subtype}): ${errors.join("; ")}`,
          };
        }
      }
    }

    // Try structured output first, then fall back to parsing result text
    let raw: unknown;
    if (structuredOutput !== undefined && structuredOutput !== null) {
      console.log("[AGENT] Using structured_output from agent");
      raw = structuredOutput;
    } else if (resultText) {
      console.log("[AGENT] Falling back to parsing result text");
      raw = extractJSON(resultText);
    } else {
      return { success: false, error: "Agent returned no output" };
    }

    console.log("[VALIDATE] Running Zod validation...");
    const validation = validateMiniApp(raw);

    if (validation.valid) {
      console.log(
        `[VALIDATE] Valid — appId="${validation.data.appId}", ` +
          `title="${validation.data.title}", ` +
          `${validation.data.screens.length} screen(s), ` +
          `${validation.data.screens.reduce((n, s) => n + s.components.length, 0)} component(s)`
      );

      // Save session for debugging
      saveSession(validation.data.appId, userPrompt, validation.data);

      return { success: true, miniApp: validation.data };
    }

    console.log(
      `[VALIDATE] Failed with ${validation.errors.length} error(s):`
    );
    validation.errors.forEach((e, i) => console.log(`[VALIDATE]   ${i + 1}. ${e}`));

    return {
      success: false,
      error: `Validation failed: ${validation.errors.join("; ")}`,
    };
  } catch (err) {
    const elapsed = Date.now() - startTime;
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[AGENT] Exception — ${message} — ${elapsed}ms`);
    return { success: false, error: `Agent exception: ${message}` };
  }
}
