import fs from "fs";
import path from "path";

const REPORTS_DIR = path.join(__dirname, "..", "..", "tmp", "reports");

export interface ContentReport {
  id: string;
  userId: string;
  appId: string;
  reason: string;
  createdAt: string;
}

export function ensureReportsDir(): void {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
}

export function saveReport(input: Omit<ContentReport, "id" | "createdAt">): ContentReport {
  ensureReportsDir();
  const createdAt = new Date().toISOString();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const report: ContentReport = {
    id,
    userId: input.userId,
    appId: input.appId,
    reason: input.reason,
    createdAt,
  };

  const file = path.join(REPORTS_DIR, `${id}.json`);
  fs.writeFileSync(file, JSON.stringify(report, null, 2), "utf-8");
  return report;
}
