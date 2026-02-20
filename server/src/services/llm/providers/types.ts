import type { ClarificationQuestion, MiniApp } from "@baristapp/shared";

export interface LlmUsage {
  modelName: string;
  costUsd: number;
  numTurns: number;
}

export interface GenerationSuccess {
  success: true;
  miniApp: MiniApp;
  usage: LlmUsage;
}

export interface GenerationFailure {
  success: false;
  error: string;
}

export type GenerationResult = GenerationSuccess | GenerationFailure;

export interface ModifySuccess {
  success: true;
  miniApp: MiniApp;
  usage: LlmUsage;
}

export interface ModifyFailure {
  success: false;
  error: string;
}

export type ModifyResult = ModifySuccess | ModifyFailure;

export interface ClarifySuccess {
  success: true;
  questions: ClarificationQuestion[];
  summary: string;
}

export interface ClarifyFailure {
  success: false;
  error: string;
}

export type ClarifyResult = ClarifySuccess | ClarifyFailure;

export interface LLMProvider {
  providerName: "claude" | "openai";
  generateMiniApp(userPrompt: string): Promise<GenerationResult>;
  clarifyPrompt(userPrompt: string): Promise<ClarifyResult>;
  modifyMiniApp(currentSpec: MiniApp, modifyPrompt: string): Promise<ModifyResult>;
}
