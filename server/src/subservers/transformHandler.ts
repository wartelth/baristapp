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

  // Apply template: replace {{path}} placeholders with input values
  const result = applyTemplate(template, input);
  return result;
}

function getByPath(input: Record<string, unknown>, path: string): unknown {
  const normalized = path.replace(/\[(\d+)\]/g, ".$1");
  const segments = normalized.split(".").filter(Boolean);
  let current: unknown = input;

  for (const segment of segments) {
    if (current === null || current === undefined) return "";
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (Number.isNaN(index)) return "";
      current = current[index];
      continue;
    }
    if (typeof current === "object") {
      current = (current as Record<string, unknown>)[segment];
      continue;
    }
    return "";
  }

  return current ?? "";
}

function applyTemplate(
  template: Record<string, unknown>,
  input: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(template)) {
    if (typeof value === "string") {
      // Replace {{path}} placeholders, e.g. {{current.temperature_2m}}
      result[key] = value.replace(/\{\{([\w.[\]]+)\}\}/g, (_, k) =>
        String(getByPath(input, k))
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
