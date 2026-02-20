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
 * Attempts to extract JSON from an LLM or aider response.
 * Handles markdown code fences, non-JSON preamble/postamble,
 * and deeply nested JSON objects in mixed output.
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

  // Fast path: direct parse
  try {
    const parsed = JSON.parse(cleaned.trim());
    console.log("[VALIDATE] JSON.parse succeeded");
    return parsed;
  } catch {
    // fall through to extraction strategies
  }

  // Strategy: find the outermost { ... } brace pair using a depth counter.
  // This handles aider output where JSON is surrounded by log lines.
  const firstBrace = cleaned.indexOf("{");
  if (firstBrace !== -1) {
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = firstBrace; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\" && inString) {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          const candidate = cleaned.slice(firstBrace, i + 1);
          try {
            const parsed = JSON.parse(candidate);
            console.log("[VALIDATE] JSON.parse succeeded (extracted from surrounding text)");
            return parsed;
          } catch {
            // keep scanning for a later match
          }
        }
      }
    }
  }

  const message = `Could not extract valid JSON from response (${cleaned.length} chars)`;
  console.error(`[VALIDATE] ${message}`);
  console.error(`[VALIDATE] First 300 chars: ${cleaned.trim().slice(0, 300)}`);
  throw new Error(message);
}
