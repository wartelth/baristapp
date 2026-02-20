import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { resolveTemplate } from "@swissknife/shared";
import type { RendererProps } from "../../types";
import { useTheme } from "../ThemeProvider";

export function SliderRenderer({ component, state, dispatch }: RendererProps) {
  if (component.type !== "slider") return null;
  const theme = useTheme();
  const { stateKey, min = 0, max = 100, step = 1, label: rawLabel } = component.props;
  const label = rawLabel ? String(resolveTemplate(rawLabel, state) ?? rawLabel) : undefined;

  const value = Number(state[stateKey] ?? min);
  // Native slider via a simple track + thumb since @react-native-community/slider
  // may not be installed. We use a pressable track approach.
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));

  return (
    <View style={styles.wrapper}>
      {label && (
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: theme.textColor }]}>{label}</Text>
          <Text style={[styles.value, { color: theme.secondaryTextColor }]}>{value}</Text>
        </View>
      )}
      <View style={[styles.track, { backgroundColor: theme.borderColor }]}>
        <View
          style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: theme.primaryColor }]}
        />
      </View>
      <View style={styles.buttonRow}>
        <Text
          style={[styles.btn, { color: theme.primaryColor }]}
          onPress={() => {
            const next = Math.max(min, value - step);
            dispatch({ type: "setState", key: stateKey, value: next });
          }}
        >
          -
        </Text>
        <Text
          style={[styles.btn, { color: theme.primaryColor }]}
          onPress={() => {
            const next = Math.min(max, value + step);
            dispatch({ type: "setState", key: stateKey, value: next });
          }}
        >
          +
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginVertical: 8 },
  labelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  label: { fontSize: 14, fontWeight: "500" },
  value: { fontSize: 14 },
  track: { height: 6, borderRadius: 3, overflow: "hidden" },
  fill: { height: 6, borderRadius: 3 },
  buttonRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  btn: { fontSize: 24, fontWeight: "700", paddingHorizontal: 20 },
});
