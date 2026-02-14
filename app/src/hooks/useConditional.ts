import type { MiniAppVisibleWhen } from "@swissknife/shared";

export function evaluateVisibility(
  condition: MiniAppVisibleWhen | undefined,
  state: Record<string, unknown>
): boolean {
  if (!condition) return true;

  const actual = state[condition.stateKey];
  const expected = condition.value;

  switch (condition.operator) {
    case "eq":
      return actual === expected;
    case "neq":
      return actual !== expected;
    case "gt":
      return Number(actual) > Number(expected);
    case "lt":
      return Number(actual) < Number(expected);
    case "gte":
      return Number(actual) >= Number(expected);
    case "lte":
      return Number(actual) <= Number(expected);
    case "truthy":
      return !!actual;
    case "falsy":
      return !actual;
    case "contains":
      if (typeof actual === "string" && typeof expected === "string") {
        return actual.includes(expected);
      }
      if (Array.isArray(actual)) {
        return actual.includes(expected);
      }
      return false;
    default:
      return true;
  }
}
