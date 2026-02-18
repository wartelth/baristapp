import React from "react";
import { Text, StyleSheet } from "react-native";
import { resolveTemplate, getByPath } from "@swissknife/shared";
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

  let displayText: string;
  if (stateKey) {
    // Direct state binding (backward compat)
    displayText = String(getByPath(state, stateKey) ?? content ?? "");
  } else {
    // Resolve {{expressions}} in content string
    const resolved = resolveTemplate(content ?? "", state);
    displayText = String(resolved ?? "");
  }

  const variantStyle = VARIANT_STYLES[variant as keyof typeof VARIANT_STYLES];

  return (
    <Text style={[styles.base, variantStyle, { textAlign: align }]}>
      {displayText}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    color: "#fff",
    marginVertical: 4,
  },
});
