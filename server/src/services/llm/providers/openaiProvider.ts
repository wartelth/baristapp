import OpenAI from "openai";
import type { MiniApp } from "@swissknife/shared";
import { MASTER_PROMPT } from "../../../prompts/masterPrompt";
import { CLARIFY_PROMPT } from "../../../prompts/clarifyPrompt";
import { buildModifyPrompt } from "../../../prompts/modifyPrompt";
import { MiniAppJSONSchema } from "../../../validation/jsonSchema";
import { extractJSON, validateMiniApp } from "../../../validation/schemaValidator";
import L from "../../../utils/logger";
import type {
  ClarifyResult,
  GenerationResult,
  LLMProvider,
  ModifyResult,
} from "./types";

const DEFAULT_OPENAI_CODING_MODEL =
  process.env.OPENAI_CODING_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-5.1";
const DEFAULT_OPENAI_SMALL_MODEL = process.env.OPENAI_SMALL_MODEL ?? "gpt-5-mini";
const OPENAI_GENERATE_FALLBACK_MODEL = process.env.OPENAI_GENERATE_FALLBACK_MODEL ?? "gpt-4.1";
const OPENAI_CLARIFY_FALLBACK_MODEL =
  process.env.OPENAI_CLARIFY_FALLBACK_MODEL ?? "gpt-4.1-mini";
const OPENAI_MODIFY_FALLBACK_MODEL = process.env.OPENAI_MODIFY_FALLBACK_MODEL ?? "gpt-4.1";
const OPENAI_REQUEST_TIMEOUT_MS = Number(process.env.OPENAI_REQUEST_TIMEOUT_MS ?? 45_000);

function shouldRetryWithFallback(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("does not exist") ||
    message.includes("do not have access") ||
    message.includes("404")
  );
}

function isInvalidResponseSchemaError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.toLowerCase().includes("invalid schema for response_format");
}

function createOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing");
  }
  return new OpenAI({ apiKey });
}

function selectOpenAiModel(userPrompt: string): string {
  const lower = userPrompt.toLowerCase();
  const heavyKeywords = [
    "multi-screen",
    "wizard",
    "chart",
    "dashboard",
    "audio",
    "camera",
    "map",
    "api",
    "webview",
    "game",
  ];
  const score = heavyKeywords.reduce((acc, k) => acc + (lower.includes(k) ? 1 : 0), 0);
  if (score >= 2 || userPrompt.length > 350) {
    return DEFAULT_OPENAI_CODING_MODEL;
  }
  return process.env.OPENAI_FAST_MODEL ?? DEFAULT_OPENAI_CODING_MODEL;
}

function getTextFromChatContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part: any) => (part?.type === "text" ? String(part.text ?? "") : ""))
    .join("\n")
    .trim();
}

async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

export class OpenAIProvider implements LLMProvider {
  providerName: "openai" = "openai";

  async generateMiniApp(userPrompt: string): Promise<GenerationResult> {
    try {
      const model = selectOpenAiModel(userPrompt);
      const client = createOpenAIClient();
      L.log("AGENT", `OpenAI generate started`);
      L.detail("AGENT", "Provider", "openai");
      L.detail("AGENT", "Model", model);
      L.detail("AGENT", "Prompt chars", userPrompt.length);
      let resolvedModel = model;
      let response;
      const runGenerateRequest = async (targetModel: string, useJsonSchema: boolean) => {
        const strongJsonInstruction =
          "Return only one valid JSON object matching the mini app schema. No markdown, no prose.";
        return withTimeout(
          (signal) =>
            client.chat.completions.create(
              {
                model: targetModel,
                messages: [
                  { role: "system", content: `${MASTER_PROMPT}\n\n${strongJsonInstruction}` },
                  { role: "user", content: userPrompt },
                ],
                max_completion_tokens: 3000,
                stream: false,
                ...(useJsonSchema
                  ? {
                      response_format: {
                        type: "json_schema" as const,
                        json_schema: {
                          name: "mini_app_spec",
                          schema: MiniAppJSONSchema as Record<string, unknown>,
                        },
                      },
                    }
                  : {
                      response_format: {
                        type: "json_object" as const,
                      },
                    }),
              },
              { signal }
            ),
          OPENAI_REQUEST_TIMEOUT_MS
        );
      };
      try {
        try {
          response = await runGenerateRequest(resolvedModel, true);
        } catch (schemaErr) {
          if (!isInvalidResponseSchemaError(schemaErr)) throw schemaErr;
          L.warn("AGENT", "OpenAI rejected json_schema, retrying with json_object");
          L.detail("AGENT", "Fallback request", "generate json_object started");
          response = await runGenerateRequest(resolvedModel, false);
          L.detail("AGENT", "Fallback request", "generate json_object completed");
        }
      } catch (err) {
        if (!shouldRetryWithFallback(err)) throw err;
        resolvedModel = OPENAI_GENERATE_FALLBACK_MODEL;
        if (resolvedModel === model) throw err;
        L.warn("AGENT", `Primary model unavailable, retrying generate with ${resolvedModel}`);
        try {
          response = await runGenerateRequest(resolvedModel, true);
        } catch (schemaErr) {
          if (!isInvalidResponseSchemaError(schemaErr)) throw schemaErr;
          L.warn("AGENT", "Fallback model rejected json_schema, retrying with json_object");
          L.detail("AGENT", "Fallback request", "generate json_object started");
          response = await runGenerateRequest(resolvedModel, false);
          L.detail("AGENT", "Fallback request", "generate json_object completed");
        }
      }

      const text = getTextFromChatContent(response.choices[0]?.message?.content);
      const parsed = extractJSON(text);
      const validation = validateMiniApp(parsed);
      if (!validation.valid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join("; ")}`,
        };
      }

      const usage = response.usage;
      const totalTokens = (usage?.prompt_tokens ?? 0) + (usage?.completion_tokens ?? 0);
      L.success("AGENT", "OpenAI generate completed");
      L.detail("AGENT", "Prompt tokens", usage?.prompt_tokens ?? 0);
      L.detail("AGENT", "Completion tokens", usage?.completion_tokens ?? 0);
      L.detail("AGENT", "Total tokens", totalTokens);
      return {
        success: true,
        miniApp: validation.data,
        usage: {
          modelName: resolvedModel,
          costUsd: 0,
          numTurns: Math.max(1, Math.ceil(totalTokens / 3000)),
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      L.error("AGENT", `OpenAI generation failed — ${message}`);
      return { success: false, error: `OpenAI generation failed: ${message}` };
    }
  }

  async clarifyPrompt(userPrompt: string): Promise<ClarifyResult> {
    try {
      const model = DEFAULT_OPENAI_SMALL_MODEL;
      const client = createOpenAIClient();
      L.log("CLARIFY", "OpenAI clarify started");
      L.detail("CLARIFY", "Provider", "openai");
      L.detail("CLARIFY", "Model", model);
      L.detail("CLARIFY", "Prompt chars", userPrompt.length);
      let resolvedModel = model;
      let response;
      try {
        response = await withTimeout(
          (signal) =>
            client.chat.completions.create(
              {
                model: resolvedModel,
                messages: [
                  { role: "system", content: CLARIFY_PROMPT },
                  { role: "user", content: userPrompt },
                ],
                max_completion_tokens: 1000,
                stream: false,
                response_format: {
                  type: "json_object",
                },
              },
              { signal }
            ),
          OPENAI_REQUEST_TIMEOUT_MS
        );
      } catch (err) {
        if (!shouldRetryWithFallback(err)) throw err;
        resolvedModel = OPENAI_CLARIFY_FALLBACK_MODEL;
        if (resolvedModel === model) throw err;
        L.warn("CLARIFY", `Primary clarify model unavailable, retrying with ${resolvedModel}`);
        response = await withTimeout(
          (signal) =>
            client.chat.completions.create(
              {
                model: resolvedModel,
                messages: [
                  { role: "system", content: CLARIFY_PROMPT },
                  { role: "user", content: userPrompt },
                ],
                max_completion_tokens: 1000,
                stream: false,
                response_format: {
                  type: "json_object",
                },
              },
              { signal }
            ),
          OPENAI_REQUEST_TIMEOUT_MS
        );
      }

      const text = getTextFromChatContent(response.choices[0]?.message?.content);
      const json = extractJSON(text) as any;
      if (!json.summary || !Array.isArray(json.questions)) {
        return { success: false, error: "Invalid clarification structure" };
      }
      L.success("CLARIFY", "OpenAI clarify completed");
      L.detail("CLARIFY", "Questions", json.questions.length);
      return {
        success: true,
        summary: String(json.summary),
        questions: json.questions.map((q: any, i: number) => ({
          id: q.id ?? `q${i + 1}`,
          question: String(q.question ?? ""),
          type: ["single", "multiple", "freeform"].includes(q.type)
            ? q.type
            : "freeform",
          options: Array.isArray(q.options) ? q.options.map(String) : undefined,
        })),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      L.error("CLARIFY", `OpenAI clarify failed — ${message}`);
      return { success: false, error: `OpenAI clarify failed: ${message}` };
    }
  }

  async modifyMiniApp(currentSpec: MiniApp, modifyPrompt: string): Promise<ModifyResult> {
    try {
      const model = DEFAULT_OPENAI_CODING_MODEL;
      const client = createOpenAIClient();
      const systemPrompt = buildModifyPrompt(JSON.stringify(currentSpec, null, 2));
      L.log("AGENT", "OpenAI modify started");
      L.detail("AGENT", "Provider", "openai");
      L.detail("AGENT", "Model", model);
      L.detail("AGENT", "AppId", currentSpec.appId);
      L.detail("AGENT", "Prompt chars", modifyPrompt.length);
      let resolvedModel = model;
      let response;
      const runModifyRequest = async (targetModel: string, useJsonSchema: boolean) => {
        const strongJsonInstruction =
          "Return only one valid JSON object matching the mini app schema. No markdown, no prose.";
        return withTimeout(
          (signal) =>
            client.chat.completions.create(
              {
                model: targetModel,
                messages: [
                  { role: "system", content: `${systemPrompt}\n\n${strongJsonInstruction}` },
                  { role: "user", content: modifyPrompt },
                ],
                max_completion_tokens: 3000,
                stream: false,
                ...(useJsonSchema
                  ? {
                      response_format: {
                        type: "json_schema" as const,
                        json_schema: {
                          name: "mini_app_modified_spec",
                          schema: MiniAppJSONSchema as Record<string, unknown>,
                        },
                      },
                    }
                  : {
                      response_format: {
                        type: "json_object" as const,
                      },
                    }),
              },
              { signal }
            ),
          OPENAI_REQUEST_TIMEOUT_MS
        );
      };
      try {
        try {
          response = await runModifyRequest(resolvedModel, true);
        } catch (schemaErr) {
          if (!isInvalidResponseSchemaError(schemaErr)) throw schemaErr;
          L.warn("AGENT", "OpenAI rejected modify json_schema, retrying with json_object");
          L.detail("AGENT", "Fallback request", "modify json_object started");
          response = await runModifyRequest(resolvedModel, false);
          L.detail("AGENT", "Fallback request", "modify json_object completed");
        }
      } catch (err) {
        if (!shouldRetryWithFallback(err)) throw err;
        resolvedModel = OPENAI_MODIFY_FALLBACK_MODEL;
        if (resolvedModel === model) throw err;
        L.warn("AGENT", `Primary modify model unavailable, retrying with ${resolvedModel}`);
        try {
          response = await runModifyRequest(resolvedModel, true);
        } catch (schemaErr) {
          if (!isInvalidResponseSchemaError(schemaErr)) throw schemaErr;
          L.warn("AGENT", "Fallback model rejected modify json_schema, retrying with json_object");
          L.detail("AGENT", "Fallback request", "modify json_object started");
          response = await runModifyRequest(resolvedModel, false);
          L.detail("AGENT", "Fallback request", "modify json_object completed");
        }
      }

      const text = getTextFromChatContent(response.choices[0]?.message?.content);
      const parsed = extractJSON(text);
      const validation = validateMiniApp(parsed);
      if (!validation.valid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join("; ")}`,
        };
      }

      if (validation.data.appId !== currentSpec.appId) {
        (validation.data as any).appId = currentSpec.appId;
      }

      const usage = response.usage;
      const totalTokens = (usage?.prompt_tokens ?? 0) + (usage?.completion_tokens ?? 0);
      L.success("AGENT", "OpenAI modify completed");
      L.detail("AGENT", "Prompt tokens", usage?.prompt_tokens ?? 0);
      L.detail("AGENT", "Completion tokens", usage?.completion_tokens ?? 0);
      L.detail("AGENT", "Total tokens", totalTokens);
      return {
        success: true,
        miniApp: validation.data,
        usage: {
          modelName: resolvedModel,
          costUsd: 0,
          numTurns: Math.max(1, Math.ceil(totalTokens / 3000)),
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      L.error("AGENT", `OpenAI modify failed — ${message}`);
      return { success: false, error: `OpenAI modify failed: ${message}` };
    }
  }
}
