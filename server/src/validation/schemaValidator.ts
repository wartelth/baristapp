import { MiniAppSchema } from "@swissknife/shared";
import type { MiniApp } from "@swissknife/shared";

export interface ValidationSuccess {
  valid: true;
  data: MiniApp;
}

export interface ValidationFailure {
  valid: false;
  errors: string[];
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

function normalizeRawSpec(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return raw;
  const obj = raw as Record<string, unknown>;

  if (typeof obj.version === "number") {
    obj.version = Math.round(obj.version);
  }
  if (obj.version === undefined || obj.version === null) {
    obj.version = 2;
  }
  if (obj.version === 1 && ("theme" in obj || "serverEndpoints" in obj || "effects" in obj)) {
    obj.version = 2;
  }

  // Normalize dataModel: {} → { entities: [] } so the Zod schema doesn't reject it
  if (
    obj.dataModel !== undefined &&
    typeof obj.dataModel === "object" &&
    obj.dataModel !== null &&
    !Array.isArray(obj.dataModel)
  ) {
    const dm = obj.dataModel as Record<string, unknown>;
    if (!Array.isArray(dm.entities)) {
      dm.entities = [];
    }
  }

  return obj;
}

/**
 * Validates raw JSON against the MiniApp Zod schema.
 * Returns structured result with parsed data or error messages.
 */
export function validateMiniApp(raw: unknown): ValidationResult {
  const normalized = normalizeRawSpec(raw);
  const result = MiniAppSchema.safeParse(normalized);

  if (result.success) {
    return { valid: true, data: result.data };
  }

  const errors = result.error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "<root>";
    return `${path}: ${issue.message}`;
  });

  return { valid: false, errors };
}

/**
 * Attempts to extract JSON from Claude's response.
 * Handles cases where the model wraps JSON in markdown code fences.
 */
export function extractJSON(text: string): unknown {
  let cleaned = text.trim();

  // Strip markdown code fences if present
  if (cleaned.startsWith("```")) {
    console.log("[VALIDATE] Stripping markdown code fences from response");
    const firstNewline = cleaned.indexOf("\n");
    cleaned = cleaned.slice(firstNewline + 1);
    const lastFence = cleaned.lastIndexOf("```");
    if (lastFence !== -1) {
      cleaned = cleaned.slice(0, lastFence);
    }
  }

  try {
    const parsed = JSON.parse(cleaned.trim());
    console.log("[VALIDATE] JSON.parse succeeded");
    return parsed;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[VALIDATE] ✖ JSON.parse failed: ${message}`);
    console.error(`[VALIDATE] First 300 chars of cleaned text: ${cleaned.trim().slice(0, 300)}`);
    throw err;
  }
}
