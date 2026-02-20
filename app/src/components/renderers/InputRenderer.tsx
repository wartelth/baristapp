import React from "react";
import { TextInput, StyleSheet } from "react-native";
import type { RendererProps } from "../../types";

const KEYBOARD_TYPES = {
  text: "default" as const,
  number: "numeric" as const,
  email: "email-address" as const,
};

export function InputRenderer({ component, state, dispatch }: RendererProps) {
  if (component.type !== "input") return null;
  const { placeholder, stateKey, multiline = false, inputType = "text" } = component.props;

  const value = String(state[stateKey] ?? "");

  return (
    <TextInput
      style={[styles.input, multiline && styles.multiline]}
      placeholder={placeholder}
      placeholderTextColor="#9C8B7A"
      value={value}
      onChangeText={(text) =>
        dispatch({ type: "setState", key: stateKey, value: text })
      }
      multiline={multiline}
      keyboardType={KEYBOARD_TYPES[inputType as keyof typeof KEYBOARD_TYPES]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: "#1A1310",
    color: "#EDE5DC",
    borderWidth: 1,
    borderColor: "#3D2E22",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginVertical: 6,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
});
