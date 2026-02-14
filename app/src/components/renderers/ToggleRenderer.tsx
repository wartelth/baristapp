import React from "react";
import { View, Text, Switch, StyleSheet } from "react-native";
import type { RendererProps } from "../../types";
import { useTheme } from "../ThemeProvider";

export function ToggleRenderer({ component, state, dispatch }: RendererProps) {
  if (component.type !== "toggle") return null;
  const theme = useTheme();
  const { stateKey, label } = component.props;

  const value = !!state[stateKey];

  return (
    <View style={styles.row}>
      {label && <Text style={[styles.label, { color: theme.textColor }]}>{label}</Text>}
      <Switch
        value={value}
        onValueChange={(v) => dispatch({ type: "setState", key: stateKey, value: v })}
        trackColor={{ false: theme.borderColor, true: theme.primaryColor }}
        thumbColor="#fff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 8,
    paddingVertical: 4,
  },
  label: {
    fontSize: 16,
    flex: 1,
  },
});
