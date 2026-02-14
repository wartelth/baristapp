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

/**
 * Validates raw JSON against the MiniApp Zod schema.
 * Returns structured result with parsed data or error messages.
 */
export function validateMiniApp(raw: unknown): ValidationResult {
  const result = MiniAppSchema.safeParse(raw);

  if (result.success) {
    return { valid: true, data: result.data };
  }

  const errors = result.error.issues.map(
    (issue) => `${issue.path.join(".")}: ${issue.message}`
  );

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
