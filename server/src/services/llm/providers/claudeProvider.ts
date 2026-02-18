import type { MiniApp } from "@swissknife/shared";
import { generateMiniApp as generateWithClaude } from "../../claudeService";
import { clarifyPrompt as clarifyWithClaude } from "../../clarifyService";
import { modifyMiniApp as modifyWithClaude } from "../../modifyService";
import type {
  ClarifyResult,
  GenerationResult,
  LLMProvider,
  ModifyResult,
} from "./types";

export class ClaudeProvider implements LLMProvider {
  providerName: "claude" = "claude";

  async generateMiniApp(userPrompt: string): Promise<GenerationResult> {
    return generateWithClaude(userPrompt);
  }

  async clarifyPrompt(userPrompt: string): Promise<ClarifyResult> {
    return clarifyWithClaude(userPrompt);
  }

  async modifyMiniApp(currentSpec: MiniApp, modifyPrompt: string): Promise<ModifyResult> {
    return modifyWithClaude(currentSpec, modifyPrompt);
  }
}
