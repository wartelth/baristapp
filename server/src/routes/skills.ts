import { Router } from "express";
import { invokeSkill } from "../skills/skillExecutor";
import { getSkillManifest, hasSkill } from "../skills/skillRegistry";
import { getUserId } from "../utils/auth";
import { checkSlidingWindowLimit, formatRetryAfterSeconds } from "../utils/rateLimiter";

const router = Router();

// Global rate limit for skill invocations: 120 req/min per user
const globalSkillBuckets = new Map<string, number[]>();
const GLOBAL_LIMIT = 120;
const GLOBAL_WINDOW_MS = 60_000;

/**
 * GET /api/skills/manifest
 * Returns the public skill catalog (no secrets) for client display.
 */
router.get("/manifest", (_req, res) => {
  res.json({ skills: getSkillManifest() });
});

/**
 * POST /api/skills/:skillId/invoke
 * Invokes a skill action on behalf of a mini app.
 *
 * Body: { actionId, params?, appId, declaredSkills }
 */
router.post("/:skillId/invoke", async (req, res) => {
  const userId = getUserId(req);
  const { skillId } = req.params;
  const { actionId, params, appId, declaredSkills } = req.body ?? {};

  if (!actionId || !appId || !Array.isArray(declaredSkills)) {
    res.status(400).json({
      success: false,
      error: "Missing required fields: actionId, appId, declaredSkills",
    });
    return;
  }

  if (!hasSkill(skillId)) {
    res.status(404).json({
      success: false,
      error: `Unknown skill: ${skillId}`,
      code: "UNKNOWN_SKILL",
    });
    return;
  }

  // Global rate limit per user across all skills
  const globalCheck = checkSlidingWindowLimit(
    globalSkillBuckets,
    `skill-global:${userId}`,
    GLOBAL_LIMIT,
    GLOBAL_WINDOW_MS
  );
  if (!globalCheck.allowed) {
    res.status(429).json({
      success: false,
      error: `Global skill rate limit exceeded. Retry in ${formatRetryAfterSeconds(globalCheck.retryAfterMs)}s.`,
      code: "RATE_LIMITED",
    });
    return;
  }

  console.log(`[SKILLS] ${userId} invoking ${skillId}/${actionId} for app ${appId}`);

  const result = await invokeSkill({
    skillId,
    actionId,
    params: params ?? {},
    appId,
    declaredSkills,
  });

  if (result.success) {
    res.json(result);
  } else {
    const statusMap: Record<string, number> = {
      UNKNOWN_SKILL: 404,
      UNKNOWN_ACTION: 404,
      UNDECLARED_SKILL: 403,
      PARAM_ERROR: 400,
      RATE_LIMITED: 429,
      AUTH_MISSING: 503,
      FETCH_ERROR: 502,
      TRANSFORM_ERROR: 500,
    };
    res.status(statusMap[result.code] ?? 500).json(result);
  }
});

export default router;
