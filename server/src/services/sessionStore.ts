import fs from "fs";
import path from "path";
import type { MiniApp } from "@baristapp/shared";

const TMP_DIR = path.join(__dirname, "..", "..", "tmp");

/** Ensure the tmp/ directory exists. Call once at server boot. */
export function ensureTmpDir(): void {
  if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
    console.log(`[SESSION] Created tmp directory: ${TMP_DIR}`);
  }
}

/** Save a generated session (prompt + validated app spec) to disk. */
export function saveSession(
  appId: string,
  prompt: string,
  miniApp: MiniApp
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const folderName = `${timestamp}-${appId}`;
  const sessionDir = path.join(TMP_DIR, folderName);

  fs.mkdirSync(sessionDir, { recursive: true });
  fs.writeFileSync(
    path.join(sessionDir, "prompt.txt"),
    prompt,
    "utf-8"
  );
  fs.writeFileSync(
    path.join(sessionDir, "app.json"),
    JSON.stringify(miniApp, null, 2),
    "utf-8"
  );

  console.log(`[SESSION] Saved session to ${folderName}`);
  return sessionDir;
}

/** List all saved sessions (most recent first). */
export function listSessions(): Array<{
  folder: string;
  appId: string;
  createdAt: string;
}> {
  if (!fs.existsSync(TMP_DIR)) return [];

  return fs
    .readdirSync(TMP_DIR)
    .filter((name) => {
      const fullPath = path.join(TMP_DIR, name);
      return fs.statSync(fullPath).isDirectory();
    })
    .sort()
    .reverse()
    .map((folder) => {
      // folder format: 2026-02-14T16-38-31-739Z-my-app-id
      const dashParts = folder.split("-");
      // The timestamp is the first ~7 parts (ISO with dashes), appId is the rest
      const appId = dashParts.slice(7).join("-") || "unknown";
      return { folder, appId, createdAt: folder };
    });
}
