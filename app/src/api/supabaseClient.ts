/**
 * App-side cloud storage via the Baristapp server proxy.
 * Uses the server's REST API (which uses Supabase under the hood).
 * When logged in, sends Authorization Bearer token; otherwise uses device ID.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { config } from "../config";
import { supabase } from "../auth/supabaseAuth";

const BASE_URL = config.apiBaseUrl;

// ---------------------------------------------------------------------------
// Persistent device UUID (fallback when not logged in)
// ---------------------------------------------------------------------------

const DEVICE_UUID_KEY = "device:uuid";
let cachedDeviceId: string = "anonymous";

function generateUUID(): string {
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

/** Returns headers with auth token if logged in, else device ID. */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const base: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    base["Authorization"] = `Bearer ${session.access_token}`;
    base["x-user-id"] = session.user.id;
  } else {
    base["x-device-id"] = cachedDeviceId;
  }
  return base;
}

export async function loadCloudState(
  appId: string
): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(`${BASE_URL}/api/storage/apps/${appId}/state`, {
      headers: await getAuthHeaders(),
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
      headers: await getAuthHeaders(),
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
      headers: await getAuthHeaders(),
      body: JSON.stringify({ spec }),
    });
  } catch {
    // Silently fail
  }
}
