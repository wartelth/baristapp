import { getSkill } from "./skillRegistry";
import { buildCacheKey, getCached, setCached } from "./skillCache";
import type {
  SkillDefinition,
  SkillActionDef,
  SkillInvokeRequest,
  SkillInvokeResponse,
} from "./types";
import { checkSlidingWindowLimit } from "../utils/rateLimiter";

const MAX_RESPONSE_BYTES = 512_000; // 500 KB
const FETCH_TIMEOUT_MS = 15_000;

const skillRateBuckets = new Map<string, number[]>();

function interpolateEndpoint(
  endpoint: string,
  params: Record<string, unknown>
): string {
  return endpoint.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const val = params[key];
    return val !== undefined ? encodeURIComponent(String(val)) : "";
  });
}

function validateParams(
  actionDef: SkillActionDef,
  params: Record<string, unknown>
): string | null {
  for (const [name, def] of Object.entries(actionDef.params)) {
    const val = params[name] ?? def.default;

    if (def.required && (val === undefined || val === null)) {
      return `Missing required parameter: ${name}`;
    }

    if (val !== undefined && val !== null) {
      const actualType = typeof val;
      if (def.type === "number" && actualType !== "number") {
        const num = Number(val);
        if (isNaN(num)) return `Parameter ${name} must be a number`;
        params[name] = num;
      } else if (def.type === "boolean" && actualType !== "boolean") {
        params[name] = val === "true" || val === true;
      } else if (def.type === "string" && actualType !== "string") {
        params[name] = String(val);
      }
    }

    if (val === undefined && def.default !== undefined) {
      params[name] = def.default;
    }
  }
  return null;
}

function resolveAuth(
  skill: SkillDefinition
): Record<string, string> {
  const headers: Record<string, string> = {};

  if (skill.provider.authType === "none") return headers;

  const envVar = skill.provider.authEnvVar;
  if (!envVar) return headers;

  const secret = process.env[envVar];
  if (!secret) return headers;

  const headerName = skill.provider.authHeader ?? "Authorization";

  if (skill.provider.authType === "apiKey") {
    headers[headerName] = secret;
  } else if (skill.provider.authType === "bearer") {
    headers[headerName] = `Bearer ${secret}`;
  }

  return headers;
}

function applyTransform(data: unknown, transform: string): unknown {
  if (!transform) return data;

  try {
    const parts = transform.split(".");
    let current: any = data;

    for (const part of parts) {
      if (current === null || current === undefined) return null;
      current = current[part];
    }

    return current;
  } catch {
    return data;
  }
}

export async function invokeSkill(
  req: SkillInvokeRequest
): Promise<SkillInvokeResponse> {
  const { skillId, actionId, params = {}, appId, declaredSkills } = req;

  // Layer 1: Check skill exists
  const skill = getSkill(skillId);
  if (!skill) {
    return { success: false, error: `Unknown skill: ${skillId}`, code: "UNKNOWN_SKILL" };
  }

  // Layer 1: Check skill is declared by the app
  if (!declaredSkills.includes(skillId)) {
    return {
      success: false,
      error: `Skill "${skillId}" not declared by app "${appId}". Add it to the skills array.`,
      code: "UNDECLARED_SKILL",
    };
  }

  // Layer 1: Check action exists
  const actionDef = skill.actions[actionId];
  if (!actionDef) {
    const available = Object.keys(skill.actions).join(", ");
    return {
      success: false,
      error: `Unknown action "${actionId}" for skill "${skillId}". Available: ${available}`,
      code: "UNKNOWN_ACTION",
    };
  }

  // Layer 3: Rate limiting (per app + skill)
  const rateLimitKey = `skill:${appId}:${skillId}`;
  const rateCheck = checkSlidingWindowLimit(
    skillRateBuckets,
    rateLimitKey,
    skill.rateLimit.requests,
    skill.rateLimit.windowMs
  );
  if (!rateCheck.allowed) {
    return {
      success: false,
      error: `Rate limit exceeded for skill "${skillId}". Retry in ${Math.ceil(rateCheck.retryAfterMs / 1000)}s.`,
      code: "RATE_LIMITED",
    };
  }

  // Layer 3: Validate params
  const paramsCopy = { ...params };
  const paramError = validateParams(actionDef, paramsCopy);
  if (paramError) {
    return { success: false, error: paramError, code: "PARAM_ERROR" };
  }

  // Check cache before making the request
  const cacheKey = buildCacheKey(skillId, actionId, paramsCopy);
  if (actionDef.cacheTtlMs) {
    const cached = getCached(cacheKey);
    if (cached !== undefined) {
      console.log(`[SKILLS] Cache hit: ${skillId}/${actionId}`);
      return { success: true, data: cached, cached: true };
    }
  }

  // Layer 4: Resolve auth (server-side only, secrets from env)
  const authHeaders = resolveAuth(skill);
  if (
    skill.provider.authType !== "none" &&
    skill.provider.authEnvVar &&
    Object.keys(authHeaders).length === 0
  ) {
    return {
      success: false,
      error: `Missing API key for skill "${skillId}". Set ${skill.provider.authEnvVar} in server environment.`,
      code: "AUTH_MISSING",
    };
  }

  // Layer 4: Build and execute the request
  const interpolatedPath = interpolateEndpoint(actionDef.endpoint, paramsCopy);
  const fullUrl = `${skill.provider.baseUrl}${interpolatedPath}`;

  // Validate the URL resolves to the declared baseUrl domain (prevent SSRF)
  try {
    const parsed = new URL(fullUrl);
    const baseParsed = new URL(skill.provider.baseUrl);
    if (parsed.hostname !== baseParsed.hostname) {
      return {
        success: false,
        error: `URL hostname mismatch: ${parsed.hostname} vs ${baseParsed.hostname}`,
        code: "FETCH_ERROR",
      };
    }
  } catch {
    return {
      success: false,
      error: `Invalid URL constructed: ${fullUrl}`,
      code: "FETCH_ERROR",
    };
  }

  console.log(`[SKILLS] Invoking ${skillId}/${actionId} → ${fullUrl}`);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const headers: Record<string, string> = {
      Accept: "application/json",
      ...skill.provider.headers,
      ...authHeaders,
    };

    const fetchOptions: RequestInit = {
      method: actionDef.method,
      headers,
      signal: controller.signal,
    };

    const response = await fetch(fullUrl, fetchOptions);
    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return {
        success: false,
        error: `Skill API error (${response.status}): ${errorText.slice(0, 200)}`,
        code: "FETCH_ERROR",
      };
    }

    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_RESPONSE_BYTES) {
      return {
        success: false,
        error: `Response too large (${contentLength} bytes, max ${MAX_RESPONSE_BYTES})`,
        code: "FETCH_ERROR",
      };
    }

    const text = await response.text();
    if (text.length > MAX_RESPONSE_BYTES) {
      return {
        success: false,
        error: `Response too large (${text.length} chars, max ${MAX_RESPONSE_BYTES})`,
        code: "FETCH_ERROR",
      };
    }

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    // Apply transform if defined
    if (actionDef.transform) {
      try {
        data = applyTransform(data, actionDef.transform);
      } catch {
        return {
          success: false,
          error: `Transform failed for ${skillId}/${actionId}`,
          code: "TRANSFORM_ERROR",
        };
      }
    }

    // Cache the result
    if (actionDef.cacheTtlMs) {
      setCached(cacheKey, data, actionDef.cacheTtlMs);
    }

    return { success: true, data, cached: false };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.name === "AbortError"
          ? `Skill request timed out after ${FETCH_TIMEOUT_MS}ms`
          : err.message
        : "Unknown fetch error";

    return { success: false, error: message, code: "FETCH_ERROR" };
  }
}
