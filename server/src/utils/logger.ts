/**
 * Structured logger with ANSI colors, timestamps, and request tracing.
 * No external dependencies — uses raw ANSI escape codes.
 * Also writes stripped-ANSI logs to server/logs/YYYY-MM-DD.log.
 */

import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// File logging — append stripped lines to server/logs/YYYY-MM-DD.log
// ---------------------------------------------------------------------------

const LOGS_DIR = path.join(__dirname, "../../logs");
let logsDirCreated = false;

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

function fileLog(line: string): void {
  if (!logsDirCreated) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
    logsDirCreated = true;
  }
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const file = path.join(LOGS_DIR, `${date}.log`);
  fs.appendFileSync(file, stripAnsi(line) + "\n");
}

// ---------------------------------------------------------------------------
// Console capture — intercepts all console output (including Agent SDK logs)
// ---------------------------------------------------------------------------

const _origLog = console.log;
const _origWarn = console.warn;
const _origError = console.error;

function formatArgs(args: unknown[]): string {
  return args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
}

console.log = (...args: unknown[]) => {
  _origLog(...args);
  fileLog(formatArgs(args));
};

console.warn = (...args: unknown[]) => {
  _origWarn(...args);
  fileLog("[WARN] " + formatArgs(args));
};

console.error = (...args: unknown[]) => {
  _origError(...args);
  fileLog("[ERROR] " + formatArgs(args));
};

// ---------------------------------------------------------------------------
// ANSI colors
// ---------------------------------------------------------------------------

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  // Foreground
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
  // Background
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
  bgMagenta: "\x1b[45m",
  bgCyan: "\x1b[46m",
};

// ---------------------------------------------------------------------------
// Timestamp
// ---------------------------------------------------------------------------

function ts(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  const ms = String(now.getMilliseconds()).padStart(3, "0");
  return `${c.dim}${h}:${m}:${s}.${ms}${c.reset}`;
}

// ---------------------------------------------------------------------------
// Tag colors by module
// ---------------------------------------------------------------------------

const TAG_COLORS: Record<string, string> = {
  BOOT: c.bgBlue + c.white + c.bold,
  REQ: c.cyan,
  RES: c.green,
  GENERATE: c.magenta + c.bold,
  AGENT: c.blue + c.bold,
  VALIDATE: c.yellow,
  SUBSERVER: c.cyan + c.bold,
  STORAGE: c.green,
  SUPABASE: c.blue,
  HEALTH: c.dim,
  RATE: c.red,
  BILLING: c.bgMagenta + c.white + c.bold,
  ENDPOINT: c.cyan,
  CLARIFY: c.yellow + c.bold,
};

function formatTag(tag: string): string {
  const color = TAG_COLORS[tag] ?? c.white;
  return `${color}[${tag}]${c.reset}`;
}

// ---------------------------------------------------------------------------
// Duration formatting
// ---------------------------------------------------------------------------

export function fmtMs(ms: number): string {
  if (ms < 1000) return `${c.dim}${ms}ms${c.reset}`;
  if (ms < 10000) return `${c.yellow}${(ms / 1000).toFixed(1)}s${c.reset}`;
  return `${c.red}${(ms / 1000).toFixed(1)}s${c.reset}`;
}

export function fmtCost(usd: number): string {
  if (usd < 0.01) return `${c.green}$${usd.toFixed(4)}${c.reset}`;
  if (usd < 0.50) return `${c.yellow}$${usd.toFixed(4)}${c.reset}`;
  return `${c.red + c.bold}$${usd.toFixed(4)}${c.reset}`;
}

export function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// ---------------------------------------------------------------------------
// Status code coloring
// ---------------------------------------------------------------------------

export function fmtStatus(code: number): string {
  if (code < 300) return `${c.green + c.bold}${code}${c.reset}`;
  if (code < 400) return `${c.cyan}${code}${c.reset}`;
  if (code < 500) return `${c.yellow + c.bold}${code}${c.reset}`;
  return `${c.red + c.bold}${code}${c.reset}`;
}

// ---------------------------------------------------------------------------
// Core log functions
// ---------------------------------------------------------------------------

export function log(tag: string, message: string): void {
  const line = `${ts()} ${formatTag(tag)} ${message}`;
  _origLog(line);
  fileLog(line);
}

export function warn(tag: string, message: string): void {
  const line = `${ts()} ${c.yellow}⚠${c.reset}  ${formatTag(tag)} ${c.yellow}${message}${c.reset}`;
  _origWarn(line);
  fileLog(line);
}

export function error(tag: string, message: string): void {
  const line = `${ts()} ${c.red}✖${c.reset}  ${formatTag(tag)} ${c.red}${message}${c.reset}`;
  _origError(line);
  fileLog(line);
}

export function success(tag: string, message: string): void {
  const line = `${ts()} ${c.green}✔${c.reset}  ${formatTag(tag)} ${message}`;
  _origLog(line);
  fileLog(line);
}

// ---------------------------------------------------------------------------
// Separator / banner
// ---------------------------------------------------------------------------

export function separator(): void {
  const line = `${c.dim}${"─".repeat(70)}${c.reset}`;
  _origLog(line);
  fileLog(line);
}

export function banner(text: string): void {
  const pad = Math.max(0, Math.floor((66 - text.length) / 2));
  const l1 = `\n${c.dim}╭${"─".repeat(68)}╮${c.reset}`;
  const l2 = `${c.dim}│${c.reset}${" ".repeat(pad)}${c.bold}${text}${c.reset}${" ".repeat(68 - pad - text.length)}${c.dim}│${c.reset}`;
  const l3 = `${c.dim}╰${"─".repeat(68)}╯${c.reset}\n`;
  _origLog(l1);
  _origLog(l2);
  _origLog(l3);
  fileLog(l1);
  fileLog(l2);
  fileLog(l3);
}

// ---------------------------------------------------------------------------
// Indented detail lines (for multi-line structured output)
// ---------------------------------------------------------------------------

export function detail(tag: string, key: string, value: string | number | boolean): void {
  const line = `${ts()} ${formatTag(tag)}   ${c.dim}├─${c.reset} ${c.dim}${key}:${c.reset} ${value}`;
  _origLog(line);
  fileLog(line);
}

// ---------------------------------------------------------------------------
// Request ID generator
// ---------------------------------------------------------------------------

let reqCounter = 0;

export function nextReqId(): string {
  reqCounter++;
  return String(reqCounter).padStart(4, "0");
}

export default { log, warn, error, success, separator, banner, detail, fmtMs, fmtCost, fmtBytes, fmtStatus, nextReqId };
