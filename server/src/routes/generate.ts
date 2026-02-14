import { Router, Request, Response } from "express";
import { generateMiniApp } from "../services/claudeService";

const router = Router();

// Simple in-memory rate limiter: max 10 requests per minute per IP
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_WINDOW_MS);
  rateLimitMap.set(ip, recent);

  if (recent.length >= RATE_LIMIT) return true;
  recent.push(now);
  return false;
}

router.post("/", async (req: Request, res: Response): Promise<void> => {
  const ip = req.ip ?? "unknown";
  const startTime = Date.now();

  console.log(`[GENERATE] ── New request from ${ip}`);

  if (isRateLimited(ip)) {
    console.log(`[GENERATE] ✖ Rate limited (${RATE_LIMIT} req/${RATE_WINDOW_MS / 1000}s)`);
    res.status(429).json({ success: false, error: "Too many requests. Try again in a minute." });
    return;
  }

  const { prompt } = req.body;

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    console.log("[GENERATE] ✖ Rejected: empty or missing prompt");
    res.status(400).json({ success: false, error: "Prompt is required." });
    return;
  }

  if (prompt.length > 2000) {
    console.log(`[GENERATE] ✖ Rejected: prompt too long (${prompt.length} chars)`);
    res.status(400).json({ success: false, error: "Prompt too long (max 2000 characters)." });
    return;
  }

  console.log(`[GENERATE] Prompt (${prompt.trim().length} chars): "${prompt.trim().slice(0, 100)}${prompt.trim().length > 100 ? "..." : ""}"`);
  console.log("[GENERATE] Calling Claude...");

  try {
    const result = await generateMiniApp(prompt.trim());
    const elapsed = Date.now() - startTime;

    if (result.success) {
      console.log(`[GENERATE] ✔ Success — appId="${result.miniApp.appId}", ${result.miniApp.screens.length} screen(s) — ${elapsed}ms`);
      res.json(result);
    } else {
      console.log(`[GENERATE] ✖ Failed (422) — ${result.error} — ${elapsed}ms`);
      res.status(422).json(result);
    }
  } catch (err) {
    const elapsed = Date.now() - startTime;
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[GENERATE] ✖ Unexpected error (500) — ${message} — ${elapsed}ms`);
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
