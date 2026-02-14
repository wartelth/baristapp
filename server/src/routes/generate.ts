import { Router, Request, Response } from "express";
import { generateMiniApp } from "../services/claudeService";
import { mountAppEndpoints } from "../services/subServerManager";
import L, { fmtMs } from "../utils/logger";

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
  const reqId = (req as any).__reqId ?? "????";
  const startTime = Date.now();

  L.separator();
  L.log("GENERATE", `#${reqId} New generation request from ${ip}`);

  if (isRateLimited(ip)) {
    L.warn("RATE", `#${reqId} Rate limited — ${RATE_LIMIT} req/${RATE_WINDOW_MS / 1000}s`);
    res.status(429).json({ success: false, error: "Too many requests. Try again in a minute." });
    return;
  }

  const { prompt, clarifications } = req.body;

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    L.warn("GENERATE", `#${reqId} Rejected: empty or missing prompt`);
    res.status(400).json({ success: false, error: "Prompt is required." });
    return;
  }

  if (prompt.length > 2000) {
    L.warn("GENERATE", `#${reqId} Rejected: prompt too long (${prompt.length} chars)`);
    res.status(400).json({ success: false, error: "Prompt too long (max 2000 characters)." });
    return;
  }

  // Build enriched prompt with clarification answers
  let enrichedPrompt = prompt.trim();
  if (Array.isArray(clarifications) && clarifications.length > 0) {
    const answers = clarifications
      .map((c: { questionId: string; answer: string }) => `- ${c.answer}`)
      .join("\n");
    enrichedPrompt += `\n\nAdditional context from user:\n${answers}`;
    L.detail("GENERATE", "Clarifications", `${clarifications.length} answer(s) attached`);
  }

  L.detail("GENERATE", "Prompt", `"${enrichedPrompt.slice(0, 120)}${enrichedPrompt.length > 120 ? "..." : ""}" (${enrichedPrompt.length} chars)`);
  L.log("GENERATE", `#${reqId} Calling Claude agent...`);

  try {
    const result = await generateMiniApp(enrichedPrompt);
    const elapsed = Date.now() - startTime;

    if (result.success) {
      const app = result.miniApp;
      const specSize = JSON.stringify(app).length;

      L.success("GENERATE", `#${reqId} App generated in ${fmtMs(elapsed)}`);
      L.detail("GENERATE", "appId", app.appId);
      L.detail("GENERATE", "title", `"${app.title}"`);
      L.detail("GENERATE", "version", (app as any).version ?? 1);
      L.detail("GENERATE", "screens", app.screens.length);
      L.detail("GENERATE", "spec size", `${(specSize / 1024).toFixed(1)}KB`);

      // Auto-mount server endpoints for v2 apps
      const v2 = app as any;
      if (v2.version === 2 && v2.serverEndpoints?.length > 0) {
        try {
          mountAppEndpoints(app.appId, v2.serverEndpoints);
          L.success("SUBSERVER", `Mounted ${v2.serverEndpoints.length} endpoint(s) for ${app.appId}`);
        } catch (err) {
          L.warn("SUBSERVER", `Failed to mount endpoints: ${err}`);
        }
      }

      L.separator();
      res.json(result);
    } else {
      L.error("GENERATE", `#${reqId} Failed — ${result.error} — ${fmtMs(elapsed)}`);
      L.separator();
      res.status(422).json(result);
    }
  } catch (err) {
    const elapsed = Date.now() - startTime;
    const message = err instanceof Error ? err.message : "Unknown error";
    L.error("GENERATE", `#${reqId} Exception — ${message} — ${fmtMs(elapsed)}`);
    L.separator();
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
