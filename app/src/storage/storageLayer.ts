import AsyncStorage from "@react-native-async-storage/async-storage";
import type { MiniApp } from "@swissknife/shared";

// ---------------------------------------------------------------------------
// In-memory cache (keeps the public API synchronous)
// AsyncStorage persists in the background.
// ---------------------------------------------------------------------------

const cache = new Map<string, string>();
let cacheLoaded = false;

const APPS_INDEX_KEY = "apps:index";
const appSpecKey = (appId: string) => `app:${appId}:spec`;
const appStateKey = (appId: string) => `app:${appId}:state`;

// ---------------------------------------------------------------------------
// Initialization — must be awaited before first use
// ---------------------------------------------------------------------------

export async function initStorage(): Promise<void> {
  if (cacheLoaded) return;
  const keys = await AsyncStorage.getAllKeys();
  const pairs = await AsyncStorage.multiGet(keys);
  for (const [key, value] of pairs) {
    if (value !== null) cache.set(key, value);
  }
  cacheLoaded = true;
}

/** Write-through: update cache and persist asynchronously */
function persist(key: string, value: string): void {
  cache.set(key, value);
  AsyncStorage.setItem(key, value).catch(console.warn);
}

function remove(key: string): void {
  cache.delete(key);
  AsyncStorage.removeItem(key).catch(console.warn);
}

// ---------------------------------------------------------------------------
// Mini-app spec persistence
// ---------------------------------------------------------------------------

export function saveApp(spec: MiniApp): void {
  persist(appSpecKey(spec.appId), JSON.stringify(spec));

  const index = listAppIds();
  if (!index.includes(spec.appId)) {
    index.push(spec.appId);
    persist(APPS_INDEX_KEY, JSON.stringify(index));
  }

  if (!cache.has(appStateKey(spec.appId))) {
    persist(appStateKey(spec.appId), JSON.stringify(spec.initialState ?? {}));
  }
}

export function getApp(appId: string): MiniApp | null {
  const raw = cache.get(appSpecKey(appId));
  if (!raw) return null;
  return JSON.parse(raw) as MiniApp;
}

export function listApps(): MiniApp[] {
  return listAppIds()
    .map(getApp)
    .filter((app): app is MiniApp => app !== null);
}

export function deleteApp(appId: string): void {
  remove(appSpecKey(appId));
  remove(appStateKey(appId));

  const index = listAppIds().filter((id) => id !== appId);
  persist(APPS_INDEX_KEY, JSON.stringify(index));
}

// ---------------------------------------------------------------------------
// Mini-app runtime state
// ---------------------------------------------------------------------------

export function getState(appId: string): Record<string, unknown> {
  const raw = cache.get(appStateKey(appId));
  if (!raw) return {};
  return JSON.parse(raw) as Record<string, unknown>;
}

export function setState(
  appId: string,
  key: string,
  value: unknown
): Record<string, unknown> {
  const current = getState(appId);
  current[key] = value;
  persist(appStateKey(appId), JSON.stringify(current));
  return current;
}

export function setFullState(
  appId: string,
  state: Record<string, unknown>
): void {
  persist(appStateKey(appId), JSON.stringify(state));
}

export function clearState(appId: string): void {
  remove(appStateKey(appId));
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function listAppIds(): string[] {
  const raw = cache.get(APPS_INDEX_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as string[];
}
