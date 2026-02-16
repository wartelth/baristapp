import React from "react";
import { Text, StyleSheet } from "react-native";
import type { RendererProps } from "../../types";

const VARIANT_STYLES = {
  title: { fontSize: 24, fontWeight: "700" as const },
  subtitle: { fontSize: 18, fontWeight: "600" as const },
  body: { fontSize: 16, fontWeight: "400" as const },
  caption: { fontSize: 12, fontWeight: "400" as const, color: "#888" },
};

export function TextRenderer({ component, state }: RendererProps) {
  if (component.type !== "text") return null;
  const { content, variant = "body", align = "left", stateKey } = component.props;

  const displayText = stateKey
    ? String(resolveStateValue(state, stateKey) ?? content)
    : content;
  const variantStyle = VARIANT_STYLES[variant as keyof typeof VARIANT_STYLES];

  return (
    <Text style={[styles.base, variantStyle, { textAlign: align }]}>
      {displayText}
    </Text>
  );
}

function resolveStateValue(state: Record<string, unknown>, key: string): unknown {
  if (!key.includes(".") && !key.includes("[")) {
    return state[key];
  }
  const normalized = key.replace(/\[(\d+)\]/g, ".$1");
  const parts = normalized.split(".").filter(Boolean);
  let current: unknown = state;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (Array.isArray(current)) {
      const idx = Number(part);
      if (Number.isNaN(idx)) return undefined;
      current = current[idx];
    } else if (typeof current === "object") {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

const styles = StyleSheet.create({
  base: {
    color: "#fff",
    marginVertical: 4,
  },
});
