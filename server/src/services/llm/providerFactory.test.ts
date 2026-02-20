import test from "node:test";
import assert from "node:assert/strict";
import { getLLMProvider, getProviderNameFromEnv } from "./providerFactory";

test("providerFactory selects claude by default", () => {
  delete process.env.LLM_PROVIDER;
  assert.equal(getProviderNameFromEnv(), "claude");
  assert.equal(getLLMProvider().providerName, "claude");
});

test("providerFactory selects openai when configured", () => {
  process.env.LLM_PROVIDER = "openai";
  assert.equal(getProviderNameFromEnv(), "openai");
  assert.equal(getLLMProvider().providerName, "openai");
  process.env.LLM_PROVIDER = "claude";
});
