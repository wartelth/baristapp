import OpenAI from "openai";
import type { MiniApp } from "@swissknife/shared";
import { MASTER_PROMPT } from "../../../prompts/masterPrompt";
import { CLARIFY_PROMPT } from "../../../prompts/clarifyPrompt";
import { buildModifyPrompt } from "../../../prompts/modifyPrompt";
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
const OPENAI_REQUEST_TIMEOUT_MS = Number(process.env.OPENAI_REQUEST_TIMEOUT_MS ?? 120_000);
const OPENAI_MAX_COMPLETION_TOKENS = Number(process.env.OPENAI_MAX_COMPLETION_TOKENS ?? 16384);

function shouldRetryWithFallback(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("does not exist") ||
    message.includes("do not have access") ||
    message.includes("404")
  );
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

function parseAndValidateMiniAppFromText(text: string): { ok: true; miniApp: MiniApp } | { ok: false; error: string } {
  try {
    const parsed = extractJSON(text);
    const validation = validateMiniApp(parsed);
    if (!validation.valid) {
      return { ok: false, error: `Validation failed: ${validation.errors.join("; ")}` };
    }
    return { ok: true, miniApp: validation.data };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

function parseClarifyPayload(text: string): { ok: true; summary: string; questions: any[] } | { ok: false; error: string } {
  const cleaned = text.trim();
  if (!cleaned) return { ok: false, error: "Model returned empty clarify output" };
  try {
    const parsed = extractJSON(cleaned) as any;
    if (!parsed?.summary || !Array.isArray(parsed.questions)) {
      return { ok: false, error: "Invalid clarification structure" };
    }
    return {
      ok: true,
      summary: String(parsed.summary),
      questions: parsed.questions,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
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
      L.detail("AGENT", "Max completion tokens", OPENAI_MAX_COMPLETION_TOKENS);
      let resolvedModel = model;
      let response;

      const runGenerateRequest = async (targetModel: string, maxTokens: number) => {
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
                max_completion_tokens: maxTokens,
                stream: false,
                response_format: { type: "json_object" as const },
              },
              { signal }
            ),
          OPENAI_REQUEST_TIMEOUT_MS
        );
      };

      try {
        response = await runGenerateRequest(resolvedModel, OPENAI_MAX_COMPLETION_TOKENS);
      } catch (err) {
        if (!shouldRetryWithFallback(err)) throw err;
        resolvedModel = OPENAI_GENERATE_FALLBACK_MODEL;
        if (resolvedModel === model) throw err;
        L.warn("AGENT", `Primary model unavailable, retrying generate with ${resolvedModel}`);
        response = await runGenerateRequest(resolvedModel, OPENAI_MAX_COMPLETION_TOKENS);
      }

      const finishReason = response.choices[0]?.finish_reason ?? "unknown";
      let text = getTextFromChatContent(response.choices[0]?.message?.content);
      L.detail("AGENT", "Finish reason", finishReason);
      L.detail("AGENT", "Output chars", text.length);

      if (finishReason === "length") {
        L.warn("AGENT", "Response truncated (finish_reason=length), retrying with higher token limit");
        const retryTokens = Math.min(OPENAI_MAX_COMPLETION_TOKENS * 2, 32768);
        const retry = await runGenerateRequest(resolvedModel, retryTokens);
        text = getTextFromChatContent(retry.choices[0]?.message?.content);
        L.detail("AGENT", "Retry finish reason", retry.choices[0]?.finish_reason ?? "unknown");
        L.detail("AGENT", "Retry output chars", text.length);
      }

      let parsedResult = parseAndValidateMiniAppFromText(text);
      if (!parsedResult.ok) {
        L.warn("AGENT", `Parse/validation failed, retrying once: ${parsedResult.error}`);
        const retry = await runGenerateRequest(resolvedModel, OPENAI_MAX_COMPLETION_TOKENS);
        const retryText = getTextFromChatContent(retry.choices[0]?.message?.content);
        L.detail("AGENT", "Retry output chars", retryText.length);
        parsedResult = parseAndValidateMiniAppFromText(retryText);
        if (!parsedResult.ok) {
          return {
            success: false,
            error: `Generation parse/validation failed: ${parsedResult.error}`,
          };
        }
      }

      const usage = response.usage;
      const totalTokens = (usage?.prompt_tokens ?? 0) + (usage?.completion_tokens ?? 0);
      L.success("AGENT", "OpenAI generate completed");
      L.detail("AGENT", "Prompt tokens", usage?.prompt_tokens ?? 0);
      L.detail("AGENT", "Completion tokens", usage?.completion_tokens ?? 0);
      L.detail("AGENT", "Total tokens", totalTokens);
      return {
        success: true,
        miniApp: parsedResult.miniApp,
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
      const runClarifyRequest = async (
        targetModel: string,
        useJsonObjectFormat: boolean,
        attemptLabel: string
      ) => {
        L.detail("CLARIFY", "Attempt", `${attemptLabel} (${targetModel}, ${useJsonObjectFormat ? "json_object" : "plain"})`);
        return withTimeout(
          (signal) =>
            client.chat.completions.create(
              {
                model: targetModel,
                messages: [
                  {
                    role: "system",
                    content: `${CLARIFY_PROMPT}\n\nReturn strictly one JSON object with keys: summary, questions.`,
                  },
                  { role: "user", content: userPrompt },
                ],
                max_completion_tokens: 4000,
                stream: false,
                ...(useJsonObjectFormat
                  ? {
                      response_format: {
                        type: "json_object" as const,
                      },
                    }
                  : {}),
              },
              { signal }
            ),
          OPENAI_REQUEST_TIMEOUT_MS
        );
      };

      let resolvedModel = model;
      let response: Awaited<ReturnType<typeof runClarifyRequest>>;
      try {
        response = await runClarifyRequest(resolvedModel, true, "primary");
      } catch (err) {
        if (!shouldRetryWithFallback(err)) throw err;
        resolvedModel = OPENAI_CLARIFY_FALLBACK_MODEL;
        if (resolvedModel === model) throw err;
        L.warn("CLARIFY", `Primary clarify model unavailable, retrying with ${resolvedModel}`);
        response = await runClarifyRequest(resolvedModel, true, "fallback-model");
      }

      const finishReason = response.choices[0]?.finish_reason ?? "unknown";
      let text = getTextFromChatContent(response.choices[0]?.message?.content);
      L.detail("CLARIFY", "Finish reason", finishReason);
      L.detail("CLARIFY", "Output chars", text.length);

      let parsed = parseClarifyPayload(text);
      if (!parsed.ok) {
        L.warn("CLARIFY", `Primary clarify parse failed, retrying plain response: ${parsed.error}`);
        const retry = await runClarifyRequest(resolvedModel, false, "recovery-plain");
        text = getTextFromChatContent(retry.choices[0]?.message?.content);
        L.detail("CLARIFY", "Retry output chars", text.length);
        parsed = parseClarifyPayload(text);
        if (!parsed.ok) {
          return { success: false, error: `Clarify parse failed: ${parsed.error}` };
        }
      }

      L.success("CLARIFY", "OpenAI clarify completed");
      L.detail("CLARIFY", "Questions", parsed.questions.length);
      return {
        success: true,
        summary: parsed.summary,
        questions: parsed.questions.map((q: any, i: number) => ({
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
      L.detail("AGENT", "Max completion tokens", OPENAI_MAX_COMPLETION_TOKENS);
      let resolvedModel = model;
      let response;

      const runModifyRequest = async (targetModel: string, maxTokens: number) => {
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
                max_completion_tokens: maxTokens,
                stream: false,
                response_format: { type: "json_object" as const },
              },
              { signal }
            ),
          OPENAI_REQUEST_TIMEOUT_MS
        );
      };

      try {
        response = await runModifyRequest(resolvedModel, OPENAI_MAX_COMPLETION_TOKENS);
      } catch (err) {
        if (!shouldRetryWithFallback(err)) throw err;
        resolvedModel = OPENAI_MODIFY_FALLBACK_MODEL;
        if (resolvedModel === model) throw err;
        L.warn("AGENT", `Primary modify model unavailable, retrying with ${resolvedModel}`);
        response = await runModifyRequest(resolvedModel, OPENAI_MAX_COMPLETION_TOKENS);
      }

      const finishReason = response.choices[0]?.finish_reason ?? "unknown";
      let text = getTextFromChatContent(response.choices[0]?.message?.content);
      L.detail("AGENT", "Finish reason", finishReason);
      L.detail("AGENT", "Output chars", text.length);

      if (finishReason === "length") {
        L.warn("AGENT", "Modify response truncated (finish_reason=length), retrying with higher token limit");
        const retryTokens = Math.min(OPENAI_MAX_COMPLETION_TOKENS * 2, 32768);
        const retry = await runModifyRequest(resolvedModel, retryTokens);
        text = getTextFromChatContent(retry.choices[0]?.message?.content);
        L.detail("AGENT", "Retry finish reason", retry.choices[0]?.finish_reason ?? "unknown");
        L.detail("AGENT", "Retry output chars", text.length);
      }

      let parsedResult = parseAndValidateMiniAppFromText(text);
      if (!parsedResult.ok) {
        L.warn("AGENT", `Modify parse/validation failed, retrying once: ${parsedResult.error}`);
        const retry = await runModifyRequest(resolvedModel, OPENAI_MAX_COMPLETION_TOKENS);
        const retryText = getTextFromChatContent(retry.choices[0]?.message?.content);
        L.detail("AGENT", "Retry output chars", retryText.length);
        parsedResult = parseAndValidateMiniAppFromText(retryText);
        if (!parsedResult.ok) {
          return {
            success: false,
            error: `Modify parse/validation failed: ${parsedResult.error}`,
          };
        }
      }

      if (parsedResult.miniApp.appId !== currentSpec.appId) {
        (parsedResult.miniApp as any).appId = currentSpec.appId;
      }

      const usage = response.usage;
      const totalTokens = (usage?.prompt_tokens ?? 0) + (usage?.completion_tokens ?? 0);
      L.success("AGENT", "OpenAI modify completed");
      L.detail("AGENT", "Prompt tokens", usage?.prompt_tokens ?? 0);
      L.detail("AGENT", "Completion tokens", usage?.completion_tokens ?? 0);
      L.detail("AGENT", "Total tokens", totalTokens);
      return {
        success: true,
        miniApp: parsedResult.miniApp,
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
