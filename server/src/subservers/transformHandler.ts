import { Request } from "express";

interface TransformProcessing {
  type: "transform";
  template?: Record<string, unknown>;
}

/**
 * Simple JSON template transform.
 * Takes input data and applies a template mapping to produce output.
 */
export async function handleTransform(
  req: Request,
  processing: TransformProcessing
): Promise<unknown> {
  const input = req.body ?? {};
  const template = processing.template ?? {};

  // Apply template: replace {{key}} placeholders with input values
  const result = applyTemplate(template, input);
  return result;
}

function applyTemplate(
  template: Record<string, unknown>,
  input: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(template)) {
    if (typeof value === "string") {
      // Replace {{key}} placeholders
      result[key] = value.replace(/\{\{(\w+)\}\}/g, (_, k) =>
        String(input[k] ?? "")
      );
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      result[key] = applyTemplate(
        value as Record<string, unknown>,
        input
      );
    } else {
      result[key] = value;
    }
  }

  return result;
}
