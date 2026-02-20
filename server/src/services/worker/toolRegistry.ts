import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";

export interface ToolExecutionResult {
  ok: boolean;
  output: string;
  durationMs: number;
}

async function resolveSafePath(workspaceDir: string, relativePath: string): Promise<string> {
  const resolved = path.resolve(workspaceDir, relativePath);
  if (!resolved.startsWith(path.resolve(workspaceDir))) {
    throw new Error("Path escapes workspace");
  }
  return resolved;
}

async function runCommand(
  command: string,
  args: string[],
  cwd: string,
  timeoutMs: number
): Promise<ToolExecutionResult> {
  const start = Date.now();
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, stdio: "pipe", shell: false });
    const chunks: string[] = [];
    let done = false;

    const finish = (ok: boolean, output: string) => {
      if (done) return;
      done = true;
      resolve({
        ok,
        output,
        durationMs: Date.now() - start,
      });
    };

    const timeout = setTimeout(() => {
      child.kill();
      finish(false, `Timed out after ${timeoutMs}ms`);
    }, timeoutMs);

    child.stdout.on("data", (d) => chunks.push(String(d)));
    child.stderr.on("data", (d) => chunks.push(String(d)));
    child.on("error", (err) => {
      clearTimeout(timeout);
      finish(false, err.message);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      finish(code === 0, chunks.join(""));
    });
  });
}

export interface WorkerTools {
  readFile: (relativePath: string) => Promise<string>;
  writeFile: (relativePath: string, content: string) => Promise<void>;
  runTests: () => Promise<ToolExecutionResult>;
  healthCheck: (url: string) => Promise<ToolExecutionResult>;
}

export function createToolRegistry(workspaceDir: string): WorkerTools {
  return {
    async readFile(relativePath: string): Promise<string> {
      const fullPath = await resolveSafePath(workspaceDir, relativePath);
      return fs.readFile(fullPath, "utf8");
    },
    async writeFile(relativePath: string, content: string): Promise<void> {
      const fullPath = await resolveSafePath(workspaceDir, relativePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, "utf8");
    },
    async runTests(): Promise<ToolExecutionResult> {
      // Keep this intentionally lightweight to avoid heavy CI-style runs in request path.
      return runCommand("npm", ["test", "--", "--runInBand"], workspaceDir, 45_000);
    },
    async healthCheck(url: string): Promise<ToolExecutionResult> {
      const start = Date.now();
      try {
        const response = await fetch(url, { method: "GET" });
        const text = await response.text();
        return {
          ok: response.ok,
          output: `status=${response.status} body=${text.slice(0, 140)}`,
          durationMs: Date.now() - start,
        };
      } catch (err) {
        return {
          ok: false,
          output: err instanceof Error ? err.message : String(err),
          durationMs: Date.now() - start,
        };
      }
    },
  };
}
