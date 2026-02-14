/**
 * App-side cloud storage via the SwissKnife server proxy.
 * Uses the server's REST API (which uses Supabase under the hood).
 * This avoids needing @supabase/supabase-js in the app bundle.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = __DEV__
  ? "http://192.168.2.223:3001"
  : "https://api.swissknife.app";

// ---------------------------------------------------------------------------
// Persistent device UUID (replaces the old Platform.OS + Version approach)
// ---------------------------------------------------------------------------

const DEVICE_UUID_KEY = "device:uuid";
let cachedDeviceId: string = "anonymous";

function generateUUID(): string {
  // Simple UUID v4 generator (no crypto dependency needed)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Must be called once at app boot before any cloud sync calls. */
export async function initDeviceId(): Promise<void> {
  const stored = await AsyncStorage.getItem(DEVICE_UUID_KEY);
  if (stored) {
    cachedDeviceId = stored;
    return;
  }
  const id = generateUUID();
  await AsyncStorage.setItem(DEVICE_UUID_KEY, id);
  cachedDeviceId = id;
}

function getDeviceId(): string {
  return cachedDeviceId;
}

const headers = () => ({
  "Content-Type": "application/json",
  "x-device-id": getDeviceId(),
});

export async function loadCloudState(
  appId: string
): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(`${BASE_URL}/api/storage/apps/${appId}/state`, {
      headers: headers(),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.state ?? null;
  } catch {
    return null;
  }
}

export async function saveCloudState(
  appId: string,
  state: Record<string, unknown>
): Promise<void> {
  try {
    await fetch(`${BASE_URL}/api/storage/apps/${appId}/state`, {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify({ state }),
    });
  } catch {
    // Silently fail — local state is the source of truth
  }
}

export async function saveCloudSpec(
  appId: string,
  spec: unknown
): Promise<void> {
  try {
    await fetch(`${BASE_URL}/api/storage/apps/${appId}/spec`, {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify({ spec }),
    });
  } catch {
    // Silently fail
  }
}
