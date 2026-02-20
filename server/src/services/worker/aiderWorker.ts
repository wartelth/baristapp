import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import type { MiniApp } from "@swissknife/shared";
import { MiniAppJSONSchema } from "../../validation/jsonSchema";
import { extractJSON, validateMiniApp } from "../../validation/schemaValidator";
import L from "../../utils/logger";
import {
  createSandbox,
  isDaytonaConfigured,
  runSandboxCommand,
  writeSandboxFile,
} from "../runtime/daytonaClient";

export interface AiderWorkerResult {
  success: boolean;
  miniApp?: MiniApp;
  logs: string[];
  error?: string;
}

const DEFAULT_AIDER_TIMEOUT_MS = 300_000; // 5 min — large webview apps need time
const MAX_AIDER_RETRIES = 2;

function timestampSlug(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function buildAiderTaskPrompt(userPrompt: string): string {
  return [
    "You are generating a full mini app JSON spec for SwissKnife, a mobile micro-app platform.",
    "Write only valid JSON into app_spec.json that matches the schema in mini_app.schema.json.",
    'IMPORTANT: The "version" field MUST be the integer 2 (not 1, not 1.0, not 2.0 — exactly 2).',
    "",
    "WEBVIEW-FIRST STRATEGY: For any app that needs visual polish (learning apps, games, dashboards,",
    "trackers, social apps, anything with cards/lists/rich UI), use a SINGLE webView component with",
    'height 800 and put ALL the UI in the "html" prop as self-contained HTML/CSS/JS.',
    "",
    "The WebView has a built-in dark-theme design system with CSS variables:",
    "  var(--bg) #111118, var(--surface) #1e1e2e, var(--primary), var(--text), var(--text2), var(--border), var(--danger), var(--success)",
    "  var(--radius-sm/md/lg/full), var(--shadow-sm/md/lg), var(--font), var(--ease), var(--ease-bounce)",
    "Utility classes: .card, .btn, .btn-secondary, .badge, .progress-track/.progress-fill,",
    "  .flex, .flex-col, .flex-row, .items-center, .justify-between, .gap-1 to .gap-6, .p-1 to .p-5,",
    "  .mb-1 to .mb-4, .rounded, .rounded-lg, .text-center, .text-muted, .animate-fade, .animate-slide, .stagger",
    "Typography: h1 (28px), h2 (22px), h3 (18px), h4 (16px), p (15px), small (13px) — all pre-styled.",
    "",
    "Bridge API for state persistence:",
    '  window.SwissKnife.getState("key"), window.SwissKnife.setState("key", value)',
    "  window.SwissKnife.dispatch(action), window.SwissKnife.onStateUpdate(fn)",
    "",
    "Design principles: use gradients for headers, inline SVG icons, generous whitespace,",
    "  .card for grouping, .stagger for list animations, :active transforms on tappable elements.",
    "HTML must be self-contained (NO external scripts/stylesheets).",
    "",
    "Only use native declarative components (text, button, input, etc.) for simple utility apps",
    "(counter, timer, unit converter) or when hardware access is needed (camera, microphone, map).",
    "",
    "Do not output markdown or explanations.",
    "",
    `User request: ${userPrompt}`,
  ].join("\n");
}

function buildEnvForAider(): Record<string, string> {
  return {
    ...process.env as Record<string, string>,
    PYTHONIOENCODING: "utf-8",
    PYTHONUTF8: "1",
    PYTHONLEGACYWINDOWSSTDIO: "0",
  };
}

function runCommand(
  command: string,
  cwd: string,
  timeoutMs: number
): Promise<{ ok: boolean; output: string; exitCode: number | null }> {
  return new Promise((resolve) => {
    const child = spawn(command, {
      cwd,
      shell: true,
      stdio: "pipe",
      env: buildEnvForAider(),
    });
    const chunks: string[] = [];
    let done = false;

    const finish = (ok: boolean, output: string, exitCode: number | null) => {
      if (done) return;
      done = true;
      resolve({ ok, output, exitCode });
    };

    const timer = setTimeout(() => {
      try { child.kill("SIGTERM"); } catch { /* already dead */ }
      setTimeout(() => {
        try { child.kill("SIGKILL"); } catch { /* already dead */ }
      }, 5_000);
      finish(false, chunks.join("") + `\n[Aider timed out after ${timeoutMs}ms]`, null);
    }, timeoutMs);

    child.stdout.on("data", (d) => chunks.push(String(d)));
    child.stderr.on("data", (d) => chunks.push(String(d)));
    child.on("close", (code) => {
      clearTimeout(timer);
      finish(code === 0, chunks.join(""), code);
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      finish(false, err.message, null);
    });
  });
}

function isEmptySpec(raw: string): boolean {
  const trimmed = raw.trim();
  return !trimmed || trimmed === "{}" || trimmed === "{ }";
}

function buildAiderCommand(model: string): string {
  return [
    "aider",
    "--yes",
    "--no-auto-commits",
    "--edit-format", "whole",
    `--model`, model,
    `--message`, `"Read task.txt and update app_spec.json only."`,
    "app_spec.json", "task.txt", "mini_app.schema.json",
  ].join(" ");
}

async function runAiderLocal(userPrompt: string): Promise<AiderWorkerResult> {
  const runDir = path.resolve(process.cwd(), "tmp", "aider", timestampSlug());
  await fs.mkdir(runDir, { recursive: true });

  const taskPrompt = buildAiderTaskPrompt(userPrompt);
  await fs.writeFile(path.join(runDir, "task.txt"), taskPrompt, "utf8");
  await fs.writeFile(
    path.join(runDir, "mini_app.schema.json"),
    JSON.stringify(MiniAppJSONSchema, null, 2),
    "utf8"
  );
  await fs.writeFile(path.join(runDir, "app_spec.json"), "{}", "utf8");

  const aiderModel = process.env.AIDER_MODEL ?? process.env.OPENAI_CODING_MODEL ?? "gpt-5.1";
  const timeoutMs = Number(process.env.AIDER_TIMEOUT_MS || DEFAULT_AIDER_TIMEOUT_MS);
  const maxRetries = Number(process.env.AIDER_MAX_RETRIES || MAX_AIDER_RETRIES);
  const cmd = process.env.AIDER_LOCAL_COMMAND ?? buildAiderCommand(aiderModel);

  let lastError = "";
  const allLogs: string[] = [];

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    if (attempt > 1) {
      await fs.writeFile(path.join(runDir, "app_spec.json"), "{}", "utf8");
      L.warn("AGENT", `Aider retry ${attempt}/${maxRetries} — previous attempt produced no output`);
    }

    L.log("AGENT", `Aider local run started (attempt ${attempt}/${maxRetries})`);
    L.detail("AGENT", "Aider model", aiderModel);
    L.detail("AGENT", "Edit format", "whole");
    L.detail("AGENT", "Timeout", `${timeoutMs}ms`);
    L.detail("AGENT", "Run dir", runDir);

    const exec = await runCommand(cmd, runDir, timeoutMs);
    allLogs.push(exec.output);
    L.detail("AGENT", "Aider exit", exec.exitCode ?? -1);

    const specPath = path.join(runDir, "app_spec.json");
    let raw: string;
    try {
      raw = await fs.readFile(specPath, "utf8");
    } catch {
      lastError = "Aider did not produce app_spec.json";
      continue;
    }

    if (isEmptySpec(raw)) {
      lastError = exec.ok
        ? "Aider exited successfully but app_spec.json is still empty (edit format error)"
        : `Aider failed (exit ${exec.exitCode}): ${exec.output.slice(-500)}`;
      continue;
    }

    let parsed: unknown;
    try {
      parsed = extractJSON(raw);
    } catch (e) {
      lastError = `Aider output is not valid JSON: ${e instanceof Error ? e.message : String(e)}`;
      continue;
    }

    const validation = validateMiniApp(parsed);
    if (!validation.valid) {
      lastError = `Aider output validation failed: ${validation.errors.join("; ")}`;
      continue;
    }

    return { success: true, miniApp: validation.data, logs: allLogs };
  }

  return { success: false, logs: allLogs, error: lastError || "Aider failed after all retries" };
}

async function runAiderDaytona(userPrompt: string): Promise<AiderWorkerResult> {
  if (!isDaytonaConfigured()) {
    return { success: false, logs: [], error: "Daytona is not configured for Aider execution." };
  }

  const sandbox = await createSandbox(`aider-${timestampSlug()}`.slice(0, 60));
  const taskPrompt = buildAiderTaskPrompt(userPrompt);
  await writeSandboxFile(sandbox.id, "/workspace/task.txt", taskPrompt);
  await writeSandboxFile(
    sandbox.id,
    "/workspace/mini_app.schema.json",
    JSON.stringify(MiniAppJSONSchema, null, 2)
  );
  await writeSandboxFile(sandbox.id, "/workspace/app_spec.json", "{}");

  const aiderModel = process.env.AIDER_MODEL ?? process.env.OPENAI_CODING_MODEL ?? "gpt-5.1";
  const cmd =
    process.env.AIDER_DAYTONA_COMMAND ??
    `cd /workspace && PYTHONIOENCODING=utf-8 PYTHONUTF8=1 aider --yes --no-auto-commits --edit-format whole --model ${aiderModel} --message "Read task.txt and update app_spec.json only." app_spec.json task.txt mini_app.schema.json && cat /workspace/app_spec.json`;

  L.log("AGENT", "Aider Daytona run started");
  L.detail("AGENT", "Sandbox", sandbox.id);
  const result = await runSandboxCommand(sandbox.id, cmd);
  if (!result.ok) {
    return { success: false, logs: [result.output], error: result.output };
  }

  let parsed: unknown;
  try {
    parsed = extractJSON(result.output);
  } catch (e) {
    return {
      success: false,
      logs: [result.output],
      error: `Aider Daytona output is not valid JSON: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  const validation = validateMiniApp(parsed);
  if (!validation.valid) {
    return {
      success: false,
      logs: [result.output],
      error: `Aider Daytona output validation failed: ${validation.errors.join("; ")}`,
    };
  }
  return { success: true, miniApp: validation.data, logs: [result.output] };
}

export async function runAiderWorker(userPrompt: string): Promise<AiderWorkerResult> {
  const target = (process.env.AIDER_EXECUTION_TARGET ?? "auto").toLowerCase();
  const tryDaytonaFirst = target === "daytona" || (target === "auto" && isDaytonaConfigured());

  if (tryDaytonaFirst) {
    try {
      const daytona = await runAiderDaytona(userPrompt);
      if (daytona.success) return daytona;
      if ((process.env.AIDER_FALLBACK_LOCAL ?? "true").toLowerCase() !== "true") {
        return daytona;
      }
      L.warn("AGENT", `Aider Daytona failed, trying local fallback: ${daytona.error}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      L.warn("AGENT", `Aider Daytona threw, trying local fallback: ${msg}`);
    }
  }

  return runAiderLocal(userPrompt);
}
