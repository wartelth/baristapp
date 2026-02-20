import { Router, Request, Response } from "express";
import { getLLMProvider } from "../services/llm/providerFactory";
import L from "../utils/logger";
import { moderateUserText } from "../utils/contentModeration";
import { getUserId } from "../utils/auth";
import {
  checkSlidingWindowLimit,
  formatRetryAfterSeconds,
} from "../utils/rateLimiter";

const router = Router();
const userRateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 10 * 60_000;

router.post("/", async (req: Request, res: Response): Promise<void> => {
  const reqId = (req as any).__reqId ?? "????";
  const userId = getUserId(req);

  const { prompt } = req.body;

  const rateCheck = checkSlidingWindowLimit(
    userRateLimitMap,
    userId,
    RATE_LIMIT,
    RATE_WINDOW_MS
  );
  if (!rateCheck.allowed) {
    const retryAfterSec = formatRetryAfterSeconds(rateCheck.retryAfterMs);
    L.warn(
      "RATE",
      `#${reqId} Rate limited user=${userId} — ${RATE_LIMIT} req/${RATE_WINDOW_MS / 1000}s`
    );
    res.status(429).json({
      success: false,
      error: "Too many clarification requests for this user.",
      retryAfterSec,
    });
    return;
  }

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    L.warn("CLARIFY", `#${reqId} Rejected: empty prompt`);
    res.status(400).json({ success: false, error: "Prompt is required." });
    return;
  }

  const moderation = moderateUserText(prompt);
  if (moderation.blocked) {
    L.warn("MODERATION", `#${reqId} Clarify prompt blocked: ${moderation.reason}`);
    res.status(400).json({
      success: false,
      error: "This request cannot be processed due to safety policy.",
    });
    return;
  }

  L.log("CLARIFY", `#${reqId} Clarifying: "${prompt.trim().slice(0, 80)}..."`);

  try {
    const provider = getLLMProvider();
    L.detail("CLARIFY", "Provider", provider.providerName);
    const result = await provider.clarifyPrompt(prompt.trim());
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    L.error("CLARIFY", `#${reqId} Exception — ${message}`);
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
