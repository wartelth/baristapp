import L from "../../utils/logger";
import { ClaudeProvider } from "./providers/claudeProvider";
import { OpenAIProvider } from "./providers/openaiProvider";
import type { LLMProvider } from "./providers/types";

export type ProviderName = "claude" | "openai";

export function getProviderNameFromEnv(): ProviderName {
  const raw = (process.env.LLM_PROVIDER ?? "claude").toLowerCase().trim();
  if (raw === "openai") return "openai";
  return "claude";
}

export function getLLMProvider(): LLMProvider {
  const providerName = getProviderNameFromEnv();
  if (providerName === "openai") {
    L.detail("BOOT", "LLM_PROVIDER", "openai");
    return new OpenAIProvider();
  }
  L.detail("BOOT", "LLM_PROVIDER", "claude");
  return new ClaudeProvider();
}
