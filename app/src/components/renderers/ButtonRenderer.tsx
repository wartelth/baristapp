import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { resolveTemplate } from "@baristapp/shared";
import type { RendererProps } from "../../types";

const VARIANT_COLORS = {
  primary: "#C67C4E",
  secondary: "#3D2E22",
  danger: "#CC5A45",
};

export function ButtonRenderer({ component, state, dispatch, onNavigate }: RendererProps) {
  if (component.type !== "button") return null;
  const { label, action, variant = "primary", disabled } = component.props;

  const resolvedLabel = String(resolveTemplate(label, state) ?? label);
  const isDisabled = typeof disabled === "string" ? !!state[disabled] : !!disabled;

  const handlePress = () => {
    if (isDisabled) return;
    if (action.type === "navigate") {
      onNavigate(action.screenId);
    } else {
      dispatch(action);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: VARIANT_COLORS[variant as keyof typeof VARIANT_COLORS] },
        isDisabled && styles.disabled,
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={isDisabled}
    >
      <Text style={styles.label}>{resolvedLabel}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 6,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
