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

  const displayText = stateKey ? String(state[stateKey] ?? content) : content;
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
