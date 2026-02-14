import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import type { RendererProps } from "../../types";

const VARIANT_COLORS = {
  primary: "#4f46e5",
  secondary: "#374151",
  danger: "#dc2626",
};

export function ButtonRenderer({ component, dispatch, onNavigate }: RendererProps) {
  if (component.type !== "button") return null;
  const { label, action, variant = "primary" } = component.props;

  const handlePress = () => {
    if (action.type === "navigate") {
      onNavigate(action.screenId);
    } else {
      dispatch(action);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: VARIANT_COLORS[variant as keyof typeof VARIANT_COLORS] }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Text style={styles.label}>{label}</Text>
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
  label: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
