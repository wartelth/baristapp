import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { RendererProps } from "../../types";
import { useTheme } from "../ThemeProvider";

export function ProgressRenderer({ component, state }: RendererProps) {
  if (component.type !== "progress") return null;
  const theme = useTheme();
  const {
    stateKey,
    variant = "bar",
    max = 100,
    color,
    label,
    height = 8,
    size = 80,
  } = component.props;

  const value = Number(state[stateKey] ?? 0);
  const ratio = Math.max(0, Math.min(1, value / max));
  const barColor = color ?? theme.primaryColor;

  if (variant === "circle") {
    const circumference = Math.PI * (size - 8);
    const progress = circumference * ratio;

    return (
      <View style={styles.circleWrapper}>
        <View
          style={[
            styles.circle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderColor: theme.borderColor,
              borderWidth: 4,
            },
          ]}
        >
          <View
            style={[
              styles.circleProgress,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                borderColor: barColor,
                borderWidth: 4,
                borderRightColor: "transparent",
                borderBottomColor: ratio > 0.5 ? barColor : "transparent",
                transform: [{ rotate: `${ratio * 360}deg` }],
                position: "absolute",
              },
            ]}
          />
          <Text style={[styles.circleText, { color: theme.textColor }]}>
            {Math.round(ratio * 100)}%
          </Text>
        </View>
        {label && <Text style={[styles.label, { color: theme.secondaryTextColor }]}>{label}</Text>}
      </View>
    );
  }

  // Bar variant
  return (
    <View style={styles.barWrapper}>
      {label && (
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: theme.textColor }]}>{label}</Text>
          <Text style={[styles.labelValue, { color: theme.secondaryTextColor }]}>
            {Math.round(ratio * 100)}%
          </Text>
        </View>
      )}
      <View style={[styles.track, { height, backgroundColor: theme.borderColor }]}>
        <View
          style={[
            styles.fill,
            { width: `${ratio * 100}%`, height, backgroundColor: barColor },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  barWrapper: { marginVertical: 8 },
  labelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  label: { fontSize: 14, fontWeight: "500" },
  labelValue: { fontSize: 14 },
  track: { borderRadius: 4, overflow: "hidden" },
  fill: { borderRadius: 4 },
  circleWrapper: { alignItems: "center", marginVertical: 8 },
  circle: { alignItems: "center", justifyContent: "center" },
  circleProgress: {},
  circleText: { fontSize: 16, fontWeight: "700" },
});
