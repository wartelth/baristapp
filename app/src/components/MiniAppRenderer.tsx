import React, { useState, useCallback, useEffect, useRef } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import type { MiniApp, MiniAppComponent, MiniAppAction } from "@baristapp/shared";
import { resolveTemplate, evaluate } from "@baristapp/shared";
import type { RendererProps } from "../types";
import { getState, setFullState } from "../storage/storageLayer";
import { saveCloudState, loadCloudState } from "../api/supabaseClient";
import { config } from "../config";
import { evaluateVisibility } from "../hooks/useConditional";
import { ThemeProvider } from "./ThemeProvider";

// v1 renderers
import { TextRenderer } from "./renderers/TextRenderer";
import { ButtonRenderer } from "./renderers/ButtonRenderer";
import { InputRenderer } from "./renderers/InputRenderer";
import { ListRenderer, setRenderComponent } from "./renderers/ListRenderer";
import { ImageRenderer } from "./renderers/ImageRenderer";

// v2 layout renderers
import { CardRenderer } from "./renderers/CardRenderer";
import { ContainerRenderer } from "./renderers/ContainerRenderer";
import { TabsRenderer } from "./renderers/TabsRenderer";
import { ModalRenderer } from "./renderers/ModalRenderer";
import { DividerRenderer } from "./renderers/DividerRenderer";
import { SpacerRenderer } from "./renderers/SpacerRenderer";

// v2 input renderers
import { SliderRenderer } from "./renderers/SliderRenderer";
import { ToggleRenderer } from "./renderers/ToggleRenderer";
import { SelectRenderer } from "./renderers/SelectRenderer";
import { ProgressRenderer } from "./renderers/ProgressRenderer";

// v2 media renderers
import { CameraViewRenderer } from "./renderers/CameraViewRenderer";
import { AudioRecorderRenderer } from "./renderers/AudioRecorderRenderer";
import { DatePickerRenderer } from "./renderers/DatePickerRenderer";

// v2 data viz renderers
import { ChartRenderer } from "./renderers/ChartRenderer";
import { MapViewRenderer } from "./renderers/MapViewRenderer";

// v3 webview renderer
import { WebViewRenderer } from "./renderers/WebViewRenderer";

// ---------------------------------------------------------------------------
// Component registry — 20 total
// ---------------------------------------------------------------------------

const RENDERERS: Record<string, React.FC<RendererProps>> = {
  text: TextRenderer,
  button: ButtonRenderer,
  input: InputRenderer,
  list: ListRenderer,
  image: ImageRenderer,
  card: CardRenderer,
  container: ContainerRenderer,
  tabs: TabsRenderer,
  modal: ModalRenderer,
  divider: DividerRenderer,
  spacer: SpacerRenderer,
  slider: SliderRenderer,
  toggle: ToggleRenderer,
  select: SelectRenderer,
  progress: ProgressRenderer,
  cameraView: CameraViewRenderer,
  audioRecorder: AudioRecorderRenderer,
  datePicker: DatePickerRenderer,
  chart: ChartRenderer,
  mapView: MapViewRenderer,
  webView: WebViewRenderer,
};

function renderSingleComponent(
  component: MiniAppComponent,
  state: Record<string, unknown>,
  dispatch: (action: MiniAppAction) => void,
  onNavigate: (screenId: string) => void
): React.ReactNode {
  if (!evaluateVisibility((component as any).visibleWhen, state)) {
    return null;
  }
  const Renderer = RENDERERS[component.type];
  if (!Renderer) {
    console.warn(`[Renderer] Unknown component type: ${component.type}`);
    return null;
  }
  return (
    <Renderer
      key={component.id}
      component={component}
      state={state}
      dispatch={dispatch}
      onNavigate={onNavigate}
      renderChild={renderSingleComponent}
    />
  );
}

// Inject into ListRenderer to avoid circular dependency
setRenderComponent(renderSingleComponent);

// ---------------------------------------------------------------------------
// Pure compute handler — operates on state snapshot, returns new state
// Supports 40+ operations across arithmetic, string, array, date, and type
// ---------------------------------------------------------------------------

function applyCompute(
  action: any,
  state: Record<string, unknown>
): Record<string, unknown> {
  const next = { ...state };
  const { operation, key, operands = [], resultKey } = action;
  const target = resultKey ?? key;
  const current = state[key];
  const op0 = operands[0];
  const op1 = operands[1];

  switch (operation) {
    // --- Arithmetic ---
    case "increment": next[target] = (Number(current) || 0) + (Number(op0) || 1); break;
    case "decrement": next[target] = (Number(current) || 0) - (Number(op0) || 1); break;
    case "add": next[target] = operands.reduce((s: number, v: unknown) => s + Number(v), Number(current) || 0); break;
    case "subtract": next[target] = operands.reduce((s: number, v: unknown) => s - Number(v), Number(current) || 0); break;
    case "multiply": next[target] = operands.reduce((s: number, v: unknown) => s * Number(v), Number(current) || 1); break;
    case "divide": { const d = Number(op0); next[target] = d !== 0 ? (Number(current) || 0) / d : 0; break; }
    case "modulo": { const m = Number(op0); next[target] = m !== 0 ? (Number(current) || 0) % m : 0; break; }
    case "round": next[target] = Math.round(Number(current) || 0); break;
    case "ceil": next[target] = Math.ceil(Number(current) || 0); break;
    case "floor": next[target] = Math.floor(Number(current) || 0); break;
    case "abs": next[target] = Math.abs(Number(current) || 0); break;
    case "pow": next[target] = Math.pow(Number(current) || 0, Number(op0) || 2); break;
    case "sqrt": next[target] = Math.sqrt(Number(current) || 0); break;
    case "random": next[target] = Math.random(); break;
    case "min": next[target] = Math.min(Number(current) || 0, ...operands.map(Number)); break;
    case "max": next[target] = Math.max(Number(current) || 0, ...operands.map(Number)); break;
    case "clamp": next[target] = Math.min(Math.max(Number(current) || 0, Number(op0) || 0), Number(op1) || 100); break;

    // --- String ---
    case "concat": next[target] = String(current ?? "") + operands.map(String).join(""); break;
    case "toUpperCase": next[target] = String(current ?? "").toUpperCase(); break;
    case "toLowerCase": next[target] = String(current ?? "").toLowerCase(); break;
    case "trim": next[target] = String(current ?? "").trim(); break;
    case "replace": next[target] = String(current ?? "").split(String(op0 ?? "")).join(String(op1 ?? "")); break;
    case "split": next[target] = String(current ?? "").split(String(op0 ?? ",")); break;
    case "join": next[target] = Array.isArray(current) ? current.join(String(op0 ?? ", ")) : String(current ?? ""); break;
    case "padStart": next[target] = String(current ?? "").padStart(Number(op0) || 2, String(op1 ?? "0")); break;
    case "padEnd": next[target] = String(current ?? "").padEnd(Number(op0) || 2, String(op1 ?? " ")); break;
    case "substring": next[target] = String(current ?? "").substring(Number(op0) || 0, op1 != null ? Number(op1) : undefined); break;
    case "capitalize": {
      const s = String(current ?? "");
      next[target] = s.charAt(0).toUpperCase() + s.slice(1);
      break;
    }

    // --- Array ---
    case "length": next[target] = Array.isArray(current) ? current.length : String(current ?? "").length; break;
    case "push": {
      const arr = Array.isArray(current) ? [...current] : [];
      arr.push(op0);
      next[target] = arr;
      break;
    }
    case "pop": {
      const arr = Array.isArray(current) ? [...current] : [];
      arr.pop();
      next[target] = arr;
      break;
    }
    case "shift": {
      const arr = Array.isArray(current) ? [...current] : [];
      arr.shift();
      next[target] = arr;
      break;
    }
    case "unshift": {
      const arr = Array.isArray(current) ? [...current] : [];
      arr.unshift(op0);
      next[target] = arr;
      break;
    }
    case "reverse": next[target] = Array.isArray(current) ? [...current].reverse() : current; break;
    case "sort": {
      if (!Array.isArray(current)) break;
      const sorted = [...current];
      const sortKey = op0 != null ? String(op0) : null;
      const dir = op1 === "desc" ? -1 : 1;
      if (sortKey) {
        sorted.sort((a: any, b: any) => {
          const va = a?.[sortKey] ?? 0;
          const vb = b?.[sortKey] ?? 0;
          return va < vb ? -dir : va > vb ? dir : 0;
        });
      } else {
        sorted.sort((a, b) => (a as number) < (b as number) ? -dir : (a as number) > (b as number) ? dir : 0);
      }
      next[target] = sorted;
      break;
    }
    case "unique": next[target] = Array.isArray(current) ? [...new Set(current)] : current; break;
    case "flatten": next[target] = Array.isArray(current) ? current.flat(Number(op0) || 1) : current; break;
    case "sum": {
      if (!Array.isArray(current)) { next[target] = 0; break; }
      const sumKey = op0 != null ? String(op0) : null;
      next[target] = sumKey
        ? current.reduce((s: number, item: any) => s + (Number(item?.[sumKey]) || 0), 0)
        : current.reduce((s: number, v: any) => s + (Number(v) || 0), 0);
      break;
    }
    case "avg": {
      if (!Array.isArray(current) || current.length === 0) { next[target] = 0; break; }
      const avgKey = op0 != null ? String(op0) : null;
      const total = avgKey
        ? current.reduce((s: number, item: any) => s + (Number(item?.[avgKey]) || 0), 0)
        : current.reduce((s: number, v: any) => s + (Number(v) || 0), 0);
      next[target] = total / current.length;
      break;
    }
    case "pluck": {
      if (!Array.isArray(current)) { next[target] = []; break; }
      const pluckKey = String(op0 ?? "");
      next[target] = current.map((item: any) => item?.[pluckKey]);
      break;
    }

    // --- Boolean ---
    case "toggle": next[target] = !current; break;

    // --- Date/Time ---
    case "now": next[target] = new Date().toISOString(); break;
    case "formatDate": {
      try {
        const d = new Date(current as string | number);
        const fmt = String(op0 ?? "short");
        if (fmt === "iso") next[target] = d.toISOString();
        else if (fmt === "time") next[target] = d.toLocaleTimeString();
        else if (fmt === "long") next[target] = d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
        else next[target] = d.toLocaleDateString();
      } catch { next[target] = String(current); }
      break;
    }
    case "dateDiff": {
      try {
        const d1 = new Date(current as string | number);
        const d2 = op0 ? new Date(op0 as string | number) : new Date();
        const unit = String(op1 ?? "days");
        const diffMs = d2.getTime() - d1.getTime();
        if (unit === "seconds") next[target] = Math.floor(diffMs / 1000);
        else if (unit === "minutes") next[target] = Math.floor(diffMs / 60000);
        else if (unit === "hours") next[target] = Math.floor(diffMs / 3600000);
        else next[target] = Math.floor(diffMs / 86400000);
      } catch { next[target] = 0; }
      break;
    }

    // --- Type conversion ---
    case "toNumber": next[target] = Number(current) || 0; break;
    case "toString": next[target] = String(current ?? ""); break;
    case "toBoolean": next[target] = Boolean(current); break;

    // --- JSON ---
    case "jsonParse": { try { next[target] = JSON.parse(String(current)); } catch { next[target] = null; } break; }
    case "jsonStringify": next[target] = JSON.stringify(current); break;
  }

  return next;
}

// ---------------------------------------------------------------------------
// Pure append handler
// ---------------------------------------------------------------------------

function applyAppend(
  action: any,
  state: Record<string, unknown>
): Record<string, unknown> {
  const next = { ...state };
  const arr = Array.isArray(next[action.key]) ? [...(next[action.key] as unknown[])] : [];
  const value = action.fromKey ? next[action.fromKey] : action.value;
  if (value !== undefined && value !== "") {
    arr.push(value);
    next[action.key] = arr;
    if (action.fromKey) next[action.fromKey] = "";
  }
  return next;
}

// ---------------------------------------------------------------------------
// Pure remove handler
// ---------------------------------------------------------------------------

function applyRemove(
  action: any,
  state: Record<string, unknown>
): Record<string, unknown> {
  const next = { ...state };
  const arr = Array.isArray(next[action.key]) ? [...(next[action.key] as unknown[])] : [];
  if (action.index !== undefined && action.index >= 0 && action.index < arr.length) {
    arr.splice(action.index, 1);
    next[action.key] = arr;
  }
  return next;
}

// ---------------------------------------------------------------------------
// Apply a single synchronous action to state (pure function)
// Returns new state, or null if the action is async/side-effect only
// ---------------------------------------------------------------------------

function applySyncAction(
  action: any,
  state: Record<string, unknown>
): Record<string, unknown> | null {
  switch (action.type) {
    case "setState": {
      const val = typeof action.value === "string"
        ? resolveTemplate(action.value, state)
        : action.value;
      return { ...state, [action.key]: val };
    }
    case "append":
      return applyAppend(action, state);
    case "remove":
      return applyRemove(action, state);
    case "compute":
      return applyCompute(action, state);
    case "transform": {
      const result = evaluate(action.expression, state);
      return { ...state, [action.resultKey]: result };
    }
    case "setMultiple": {
      const next = { ...state };
      for (const [k, v] of Object.entries(action.values)) {
        next[k] = typeof v === "string" ? resolveTemplate(v, state) : v;
      }
      return next;
    }
    default:
      return null; // not a sync action
  }
}

// ---------------------------------------------------------------------------
// Evaluate condition
// ---------------------------------------------------------------------------

function evaluateCondition(
  stateKey: string,
  operator: string,
  value: unknown,
  state: Record<string, unknown>
): boolean {
  const actual = state[stateKey];
  switch (operator) {
    case "eq": return actual === value;
    case "neq": return actual !== value;
    case "gt": return Number(actual) > Number(value);
    case "lt": return Number(actual) < Number(value);
    case "gte": return Number(actual) >= Number(value);
    case "lte": return Number(actual) <= Number(value);
    case "truthy": return !!actual;
    case "falsy": return !actual;
    default: return false;
  }
}

// ---------------------------------------------------------------------------
// Main renderer
// ---------------------------------------------------------------------------

interface MiniAppRendererProps {
  spec: MiniApp;
  initialScreenId?: string;
}

export function MiniAppRenderer({ spec, initialScreenId }: MiniAppRendererProps) {
  const [screenId, setScreenId] = useState(initialScreenId ?? spec.screens[0]?.id ?? "");
  const [state, setState] = useState<Record<string, unknown>>(() => {
    const persisted = getState(spec.appId);
    if (Object.keys(persisted).length > 0) return persisted;
    return spec.initialState ?? {};
  });

  // Ref to always have latest state (avoids stale closures)
  const stateRef = useRef(state);
  stateRef.current = state;

  // Timer registry for cleanup
  const timerRegistry = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Debounced cloud state sync timer
  const cloudSyncTimer = useRef<NodeJS.Timeout | null>(null);

  // Persist state to storage on every change + schedule cloud sync
  useEffect(() => {
    setFullState(spec.appId, state);

    // Debounced cloud sync (2s)
    if (cloudSyncTimer.current) clearTimeout(cloudSyncTimer.current);
    cloudSyncTimer.current = setTimeout(() => {
      saveCloudState(spec.appId, stateRef.current).catch(() => {});
    }, 2000);
  }, [state, spec.appId]);

  // On mount: bootstrap from cloud if local state is empty/default
  useEffect(() => {
    (async () => {
      const persisted = getState(spec.appId);
      const isDefault =
        Object.keys(persisted).length === 0 ||
        JSON.stringify(persisted) === JSON.stringify(spec.initialState ?? {});
      if (isDefault) {
        const cloudState = await loadCloudState(spec.appId);
        if (cloudState && Object.keys(cloudState).length > 0) {
          setState(cloudState);
        }
      }
    })();
  }, [spec.appId]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      timerRegistry.current.forEach((id) => clearInterval(id));
      timerRegistry.current.clear();
      if (cloudSyncTimer.current) clearTimeout(cloudSyncTimer.current);
    };
  }, []);

  // -------------------------------------------------------------------------
  // Core dispatch — stable reference, never recreated
  // Uses stateRef for reading current state, setState updater for writing
  // -------------------------------------------------------------------------

  const dispatch = useCallback((action: MiniAppAction) => {
    if (!action || !action.type) return;
    const a = action as any;

    // --- Navigate (side effect) ---
    if (a.type === "navigate") {
      setScreenId(a.screenId);
      return;
    }

    // --- Haptic (fire-and-forget side effect) ---
    if (a.type === "haptic") {
      try {
        const Haptics = require("expo-haptics");
        const style = a.style ?? "medium";
        if (["success", "warning", "error"].includes(style)) {
          const map: Record<string, any> = {
            success: Haptics.NotificationFeedbackType.Success,
            warning: Haptics.NotificationFeedbackType.Warning,
            error: Haptics.NotificationFeedbackType.Error,
          };
          Haptics.notificationAsync(map[style]);
        } else {
          const map: Record<string, any> = {
            light: Haptics.ImpactFeedbackStyle.Light,
            medium: Haptics.ImpactFeedbackStyle.Medium,
            heavy: Haptics.ImpactFeedbackStyle.Heavy,
          };
          Haptics.impactAsync(map[style] ?? Haptics.ImpactFeedbackStyle.Medium);
        }
      } catch {
        // expo-haptics not installed
      }
      return;
    }

    // --- Copy to clipboard (reads stateRef) ---
    if (a.type === "copyToClipboard") {
      try {
        const Clipboard = require("expo-clipboard");
        const text = a.value ?? String(stateRef.current[a.fromKey] ?? "");
        Clipboard.setStringAsync(text);
      } catch {
        // expo-clipboard not installed
      }
      return;
    }

    // --- Transform (expression-powered state computation) ---
    if (a.type === "transform") {
      const result = evaluate(a.expression, stateRef.current);
      setState((prev) => ({ ...prev, [a.resultKey]: result }));
      return;
    }

    // --- SetMultiple (set many keys at once) ---
    if (a.type === "setMultiple") {
      setState((prev) => {
        const next = { ...prev };
        for (const [k, v] of Object.entries(a.values)) {
          next[k] = typeof v === "string" ? resolveTemplate(v, prev) : v;
        }
        return next;
      });
      return;
    }

    // --- HTTP (async, reads stateRef, supports full expression interpolation) ---
    if (a.type === "http") {
      (async () => {
        const { url, method = "GET", headers = {}, bodyKey, resultKey, loadingKey, errorKey } = a;

        if (loadingKey) setState((prev) => ({ ...prev, [loadingKey]: true }));
        if (errorKey) setState((prev) => ({ ...prev, [errorKey]: null }));

        try {
          // Use expression engine for URL interpolation (supports paths, expressions)
          const interpolatedUrl = String(resolveTemplate(url, stateRef.current));
          const options: RequestInit = {
            method,
            headers: { "Content-Type": "application/json", ...headers },
          };
          if (bodyKey && method !== "GET") {
            options.body = JSON.stringify(stateRef.current[bodyKey]);
          }

          const response = await fetch(interpolatedUrl, options);
          const data = await response.json();

          setState((prev) => ({
            ...prev,
            [resultKey]: data,
            ...(loadingKey ? { [loadingKey]: false } : {}),
          }));
        } catch (err) {
          const message = err instanceof Error ? err.message : "HTTP request failed";
          setState((prev) => ({
            ...prev,
            ...(errorKey ? { [errorKey]: message } : {}),
            ...(loadingKey ? { [loadingKey]: false } : {}),
          }));
        }
      })();
      return;
    }

    // --- Device location (async, reads device sensors) ---
    if (a.type === "getLocation") {
      (async () => {
        const { resultKey, latitudeKey, longitudeKey, loadingKey, errorKey } = a;
        if (loadingKey) setState((prev) => ({ ...prev, [loadingKey]: true }));
        if (errorKey) setState((prev) => ({ ...prev, [errorKey]: "" }));

        try {
          const Location = require("expo-location");
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== "granted") {
            throw new Error("Location permission denied");
          }

          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

          setState((prev) => ({
            ...prev,
            [resultKey]: {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              timestamp: pos.timestamp,
            },
            ...(latitudeKey ? { [latitudeKey]: pos.coords.latitude } : {}),
            ...(longitudeKey ? { [longitudeKey]: pos.coords.longitude } : {}),
            ...(loadingKey ? { [loadingKey]: false } : {}),
          }));
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Unable to get current location";
          setState((prev) => ({
            ...prev,
            ...(errorKey ? { [errorKey]: message } : {}),
            ...(loadingKey ? { [loadingKey]: false } : {}),
          }));
        }
      })();
      return;
    }

    // --- Server call (async, reads stateRef) ---
    if (a.type === "serverCall") {
      (async () => {
        const { endpointId, dataKey, resultKey, loadingKey, errorKey } = a;
        if (loadingKey) setState((prev) => ({ ...prev, [loadingKey]: true }));

        try {
          const BASE_URL = config.apiBaseUrl;
          const body = dataKey ? stateRef.current[dataKey] : undefined;

          const response = await fetch(
            `${BASE_URL}/api/apps/${spec.appId}/endpoints/${endpointId}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: body ? JSON.stringify(body) : undefined,
            }
          );
          const data = await response.json();

          setState((prev) => ({
            ...prev,
            [resultKey]: data,
            ...(loadingKey ? { [loadingKey]: false } : {}),
          }));
        } catch (err) {
          const message = err instanceof Error ? err.message : "Server call failed";
          setState((prev) => ({
            ...prev,
            ...(errorKey ? { [errorKey]: message } : {}),
            ...(loadingKey ? { [loadingKey]: false } : {}),
          }));
        }
      })();
      return;
    }

    // --- Skill call (async, server-proxied data feed) ---
    if (a.type === "skillCall") {
      (async () => {
        const { skillId, actionId, params, resultKey, loadingKey, errorKey } = a;
        if (loadingKey) setState((prev) => ({ ...prev, [loadingKey]: true }));
        if (errorKey) setState((prev) => ({ ...prev, [errorKey]: null }));

        try {
          const BASE_URL = config.apiBaseUrl;
          const resolvedParams: Record<string, unknown> = {};
          if (params) {
            for (const [k, v] of Object.entries(params)) {
              resolvedParams[k] =
                typeof v === "string" ? resolveTemplate(v, stateRef.current) : v;
            }
          }

          const response = await fetch(
            `${BASE_URL}/api/skills/${skillId}/invoke`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                actionId,
                params: resolvedParams,
                appId: spec.appId,
                declaredSkills: (spec as any).skills ?? [],
              }),
            }
          );
          const result = await response.json();

          if (result.success) {
            setState((prev) => ({
              ...prev,
              [resultKey]: result.data,
              ...(loadingKey ? { [loadingKey]: false } : {}),
            }));
          } else {
            setState((prev) => ({
              ...prev,
              ...(errorKey ? { [errorKey]: result.error } : {}),
              ...(loadingKey ? { [loadingKey]: false } : {}),
            }));
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : "Skill call failed";
          setState((prev) => ({
            ...prev,
            ...(errorKey ? { [errorKey]: message } : {}),
            ...(loadingKey ? { [loadingKey]: false } : {}),
          }));
        }
      })();
      return;
    }

    // --- Timer (side effect + state) ---
    if (a.type === "timer") {
      const { timerId, command, intervalMs = 1000, tickAction } = a;
      if (command === "start") {
        const existing = timerRegistry.current.get(timerId);
        if (existing) clearInterval(existing);
        const id = setInterval(() => {
          if (tickAction) dispatch(tickAction);
        }, intervalMs);
        timerRegistry.current.set(timerId, id);
      } else {
        // stop or reset
        const id = timerRegistry.current.get(timerId);
        if (id) {
          clearInterval(id);
          timerRegistry.current.delete(timerId);
        }
      }
      return;
    }

    // --- Conditional (evaluate, then dispatch the right branch) ---
    if (a.type === "conditional") {
      const result = evaluateCondition(a.stateKey, a.operator, a.value, stateRef.current);
      if (result && a.thenAction) dispatch(a.thenAction);
      if (!result && a.elseAction) dispatch(a.elseAction);
      return;
    }

    // --- Batch (the core fix: apply ALL sync actions in one setState call) ---
    if (a.type === "batch") {
      const actions = a.actions ?? [];
      const asyncActions: any[] = [];

      // First pass: collect all sync state changes into one update
      setState((prev) => {
        let next = { ...prev };
        for (const sub of actions) {
          const result = applySyncAction(sub, next);
          if (result !== null) {
            next = result;
          } else {
            // Async action — dispatch after state is committed
            asyncActions.push(sub);
          }
        }
        return next;
      });

      // Second pass: dispatch async/side-effect actions (navigate, haptic, http, etc.)
      // Use setTimeout(0) to ensure state is committed first
      if (asyncActions.length > 0) {
        setTimeout(() => {
          for (const sub of asyncActions) {
            dispatch(sub);
          }
        }, 0);
      }
      return;
    }

    // --- Single sync actions (setState, append, remove, compute) ---
    setState((prev) => {
      const result = applySyncAction(a, prev);
      return result ?? prev;
    });

  }, [spec.appId]); // Only depends on appId, never on state

  // -------------------------------------------------------------------------
  // Effects system
  // -------------------------------------------------------------------------

  // onMount + onInterval
  useEffect(() => {
    const v2 = spec as any;
    if (!v2.effects) return;

    const cleanups: (() => void)[] = [];

    for (const effect of v2.effects) {
      if (effect.trigger === "onMount") {
        dispatch(effect.action);
      }
      if (effect.trigger === "onInterval" && effect.intervalMs) {
        const id = setInterval(() => dispatch(effect.action), effect.intervalMs);
        cleanups.push(() => clearInterval(id));
      }
    }

    return () => cleanups.forEach((fn) => fn());
  }, [spec.appId, dispatch]);

  // onStateChange — with loop protection
  const prevStateRef = useRef<Record<string, unknown>>(state);
  useEffect(() => {
    const v2 = spec as any;
    if (!v2.effects) return;

    for (const effect of v2.effects) {
      if (effect.trigger === "onStateChange" && effect.stateKey) {
        const prev = prevStateRef.current[effect.stateKey];
        const curr = state[effect.stateKey];
        if (prev !== curr) {
          dispatch(effect.action);
        }
      }
    }
    prevStateRef.current = state;
  }, [state, spec, dispatch]);

  const onNavigate = useCallback((targetScreenId: string) => {
    setScreenId(targetScreenId);
  }, []);

  const currentScreen = spec.screens.find((s) => s.id === screenId) ?? spec.screens[0];
  if (!currentScreen) return null;

  const appTheme = (spec as any).theme;

  return (
    <ThemeProvider theme={appTheme}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {currentScreen.components.map((component) => (
          <View key={component.id}>
            {renderSingleComponent(component, state, dispatch, onNavigate)}
          </View>
        ))}
      </ScrollView>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
});
