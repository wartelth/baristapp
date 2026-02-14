import type { GenerateResult, ClarifyResult, ModifyResult, MiniApp } from "@swissknife/shared";

// In development, use your local machine IP.
// For Expo Go on a physical device, replace with your LAN IP.
const BASE_URL = __DEV__
  ? "http://192.168.2.223:3001"
  : "https://api.swissknife.app";

/** Step 1: Get clarification questions for a prompt */
export async function clarifyPrompt(prompt: string): Promise<ClarifyResult> {
  const response = await fetch(`${BASE_URL}/api/clarify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  const data = await response.json();
  return data as ClarifyResult;
}

/** Step 2: Generate the mini-app with optional clarification answers */
export async function generateMiniApp(
  prompt: string,
  clarifications?: { questionId: string; answer: string }[]
): Promise<GenerateResult> {
  const response = await fetch(`${BASE_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, clarifications }),
  });

  const data = await response.json();
  return data as GenerateResult;
}

/** Modify an existing mini-app with a modification prompt */
export async function modifyMiniApp(
  currentSpec: MiniApp,
  modifyPrompt: string
): Promise<ModifyResult> {
  const response = await fetch(`${BASE_URL}/api/modify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentSpec, modifyPrompt }),
  });

  const data = await response.json();
  return data as ModifyResult;
}

/** Call a per-app server endpoint (ML inference, transforms, proxies) */
export async function callServerEndpoint(
  appId: string,
  endpointId: string,
  data?: unknown
): Promise<unknown> {
  const response = await fetch(
    `${BASE_URL}/api/apps/${appId}/endpoints/${endpointId}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: data ? JSON.stringify(data) : undefined,
    }
  );

  return response.json();
}
