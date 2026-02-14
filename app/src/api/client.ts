import type { GenerateResult } from "@swissknife/shared";

// In development, use your local machine IP.
// For Expo Go on a physical device, replace with your LAN IP.
const BASE_URL = __DEV__
  ? "http://192.168.2.223:3001"
  : "https://api.swissknife.app";

export async function generateMiniApp(prompt: string): Promise<GenerateResult> {
  const response = await fetch(`${BASE_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  const data = await response.json();
  return data as GenerateResult;
}
