import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import type { MiniApp } from "@swissknife/shared";
import { generateMiniApp, modifyMiniApp, clarifyPrompt } from "../api/client";
import { saveApp, clearState } from "../storage/storageLayer";
import { requestAllCapabilities } from "../capabilities/capabilityManager";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Notification {
  message: string;
  success: boolean;
  appId?: string;
}

interface GenerationContextValue {
  /** True while a generate or modify call is in flight */
  busy: boolean;
  /** Human-readable label for what's happening */
  busyLabel: string;
  /** Timestamp (Date.now()) when current operation started */
  busySince: number;
  /** Whether the progress overlay is shown */
  progressVisible: boolean;
  /** Toggle the progress overlay open/closed */
  toggleProgress: () => void;
  /** Toast notification (set on completion) */
  notification: Notification | null;
  dismissNotification: () => void;

  /** Start a full generation (clarify → generate) */
  startGenerate: (
    prompt: string,
    clarifications?: { questionId: string; answer: string }[]
  ) => void;

  /** Start a modification of an existing app */
  startModify: (spec: MiniApp, prompt: string) => void;
}

const GenerationContext = createContext<GenerationContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function GenerationProvider({ children }: { children: React.ReactNode }) {
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("");
  const [busySince, setBusySince] = useState(0);
  const [progressVisible, setProgressVisible] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const notifTimer = useRef<NodeJS.Timeout | null>(null);

  const toggleProgress = useCallback(() => {
    setProgressVisible((v) => !v);
  }, []);

  const showNotification = useCallback((n: Notification) => {
    setNotification(n);
    if (notifTimer.current) clearTimeout(notifTimer.current);
    notifTimer.current = setTimeout(() => setNotification(null), 6000);
  }, []);

  const dismissNotification = useCallback(() => {
    setNotification(null);
    if (notifTimer.current) clearTimeout(notifTimer.current);
  }, []);

  // -------------------------------------------------------------------------
  // Generate
  // -------------------------------------------------------------------------

  const startGenerate = useCallback(
    (
      prompt: string,
      clarifications?: { questionId: string; answer: string }[]
    ) => {
      if (busy) return;
      setBusy(true);
      setBusyLabel("Generating app...");
      setBusySince(Date.now());

      (async () => {
        try {
          const result = await generateMiniApp(prompt, clarifications);

          if (!result.success) {
            showNotification({ message: result.error, success: false });
            return;
          }

          const caps = (result.miniApp as any).capabilities ?? [];
          if (caps.length > 0) {
            await requestAllCapabilities(result.miniApp.appId, caps);
          }

          saveApp(result.miniApp);
          showNotification({
            message: `"${result.miniApp.title}" is ready!`,
            success: true,
            appId: result.miniApp.appId,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          showNotification({ message: `Generation failed: ${msg}`, success: false });
        } finally {
          setBusy(false);
          setBusyLabel("");
          setProgressVisible(false);
        }
      })();
    },
    [busy, showNotification]
  );

  // -------------------------------------------------------------------------
  // Modify
  // -------------------------------------------------------------------------

  const startModify = useCallback(
    (spec: MiniApp, prompt: string) => {
      if (busy) return;
      setBusy(true);
      setBusyLabel(`Modifying "${spec.title}"...`);
      setBusySince(Date.now());

      (async () => {
        try {
          const result = await modifyMiniApp(spec, prompt);

          if (!result.success) {
            showNotification({ message: result.error, success: false });
            return;
          }

          clearState(spec.appId);
          saveApp(result.miniApp);
          showNotification({
            message: `"${result.miniApp.title}" updated!`,
            success: true,
            appId: result.miniApp.appId,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          showNotification({ message: `Modification failed: ${msg}`, success: false });
        } finally {
          setBusy(false);
          setBusyLabel("");
          setProgressVisible(false);
        }
      })();
    },
    [busy, showNotification]
  );

  return (
    <GenerationContext.Provider
      value={{
        busy,
        busyLabel,
        busySince,
        progressVisible,
        toggleProgress,
        notification,
        dismissNotification,
        startGenerate,
        startModify,
      }}
    >
      {children}
    </GenerationContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGeneration(): GenerationContextValue {
  const ctx = useContext(GenerationContext);
  if (!ctx) throw new Error("useGeneration must be used within GenerationProvider");
  return ctx;
}
