import test from "node:test";
import assert from "node:assert/strict";
import type { MiniApp } from "@baristapp/shared";
import { runAgentWorker } from "./agentWorker";
import type { LLMProvider } from "../llm/providers/types";

const validMiniApp: MiniApp = {
  appId: "test-app",
  title: "Test App",
  icon: "🧪",
  version: 2,
  initialState: {},
  screens: [
    {
      id: "main",
      title: "Main",
      components: [
        {
          type: "text",
          id: "hello",
          props: { content: "hello" },
        } as any,
      ],
    } as any,
  ],
} as any;

test("agentWorker succeeds when provider returns valid app", async () => {
  const provider: LLMProvider = {
    providerName: "claude",
    async generateMiniApp() {
      return {
        success: true,
        miniApp: validMiniApp,
        usage: { modelName: "fake", costUsd: 0, numTurns: 1 },
      };
    },
    async clarifyPrompt() {
      return { success: false, error: "unused" };
    },
    async modifyMiniApp() {
      return {
        success: true,
        miniApp: validMiniApp,
        usage: { modelName: "fake", costUsd: 0, numTurns: 1 },
      };
    },
  };

  const result = await runAgentWorker({
    provider,
    prompt: "build app",
    maxIterations: 2,
    tools: {} as any,
  });

  assert.equal(result.success, true);
  assert.equal(result.testReport.passed, true);
  assert.ok(result.miniApp);
});
