import { Router, Request, Response } from "express";
import { createMiniAppWithOrchestrator } from "../services/orchestrator/appCreatorOrchestrator";
import { mountAppEndpoints } from "../services/subServerManager";
import L, { fmtMs } from "../utils/logger";
import { moderateUserText } from "../utils/contentModeration";
import { getUserId } from "../utils/auth";
import {
  checkSlidingWindowLimit,
  formatRetryAfterSeconds,
} from "../utils/rateLimiter";
import {
  checkGenerationAllowance,
  recordModelUsage,
} from "../services/billingService";

const router = Router();

// In-memory rate limiter: 5 generate requests per 10 minutes per user/device.
const userRateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60_000;

router.post("/", async (req: Request, res: Response): Promise<void> => {
  const reqId = (req as any).__reqId ?? "????";
  const startTime = Date.now();
  const userId = getUserId(req);

  L.separator();
  L.log("GENERATE", `#${reqId} New generation request from user=${userId}`);

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
      error: "Too many generation requests for this user.",
      retryAfterSec,
    });
    return;
  }

  const { prompt, clarifications, additionalContext } = req.body;

  const allowance = await checkGenerationAllowance(userId);
  if (!allowance.allowed) {
    L.warn("RATE", `#${reqId} Plan limit reached user=${userId} plan=${allowance.planKey}`);
    res.status(402).json({
      success: false,
      error: allowance.reason ?? "Plan limit reached.",
      billing: {
        planKey: allowance.planKey,
        appLimitPerPeriod: allowance.plan.appLimitPerPeriod,
        periodDays: allowance.periodDays,
        usedInPeriod: allowance.usedInPeriod,
        remainingInPeriod: allowance.remainingInPeriod,
      },
    });
    return;
  }

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

  const moderation = moderateUserText(prompt);
  if (moderation.blocked) {
    L.warn("MODERATION", `#${reqId} Prompt blocked: ${moderation.reason}`);
    res.status(400).json({
      success: false,
      error: "This request cannot be processed due to safety policy.",
    });
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
  if (typeof additionalContext === "string" && additionalContext.trim().length > 0) {
    enrichedPrompt += `\n\nAdditional user context:\n${additionalContext.trim()}`;
    L.detail("GENERATE", "Extra context", `${additionalContext.trim().length} chars attached`);
  }

  L.detail("GENERATE", "Prompt", `"${enrichedPrompt.slice(0, 120)}${enrichedPrompt.length > 120 ? "..." : ""}" (${enrichedPrompt.length} chars)`);
  L.log("GENERATE", `#${reqId} Calling app creator orchestrator...`);

  try {
    const result = await createMiniAppWithOrchestrator(userId, enrichedPrompt);
    const elapsed = Date.now() - startTime;

    if (result.success) {
      const app = result.miniApp;
      const specSize = JSON.stringify(app).length;
      await recordModelUsage({
        userId,
        appId: app.appId,
        requestType: "generate",
        modelName: result.usage.modelName,
        costUsd: result.usage.costUsd,
        numTurns: result.usage.numTurns,
      });

      L.success("GENERATE", `#${reqId} App generated in ${fmtMs(elapsed)}`);
      L.detail("GENERATE", "appId", app.appId);
      L.detail("GENERATE", "title", `"${app.title}"`);
      L.detail("GENERATE", "version", (app as any).version ?? 1);
      L.detail("GENERATE", "screens", app.screens.length);
      L.detail("GENERATE", "spec size", `${(specSize / 1024).toFixed(1)}KB`);
      L.detail("GENERATE", "model cost", `$${result.usage.costUsd.toFixed(4)}`);
      if (result.previewUrl) {
        L.detail("GENERATE", "preview", result.previewUrl);
      }
      L.detail("GENERATE", "tests passed", result.testReport.passed);

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
