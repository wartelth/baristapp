import React from "react";
import { View, Text, StyleSheet, useWindowDimensions } from "react-native";
import type { RendererProps } from "../../types";
import { useTheme } from "../ThemeProvider";

export function ChartRenderer({ component, state }: RendererProps) {
  if (component.type !== "chart") return null;
  const theme = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const { chartType, dataKey, xKey, yKey, height = 200, color, colors } = component.props;

  const data = Array.isArray(state[dataKey]) ? (state[dataKey] as any[]) : [];
  if (data.length === 0) {
    return (
      <View style={[styles.empty, { height, backgroundColor: theme.surfaceColor }]}>
        <Text style={{ color: theme.secondaryTextColor }}>No chart data</Text>
      </View>
    );
  }

  const chartWidth = screenWidth - 64;
  const barColor = color ?? theme.primaryColor;

  if (chartType === "bar") {
    const values = data.map((d) => Number(yKey ? d[yKey] : d.y ?? d.value ?? d));
    const maxVal = Math.max(...values, 1);

    return (
      <View style={[styles.wrapper, { height }]}>
        <View style={styles.barChart}>
          {data.map((d, i) => {
            const val = values[i];
            const barHeight = (val / maxVal) * (height - 30);
            const label = xKey ? String(d[xKey]) : String(d.x ?? d.label ?? i);
            const c = colors?.[i % (colors?.length ?? 1)] ?? barColor;

            return (
              <View key={i} style={styles.barItem}>
                <View
                  style={[styles.bar, { height: barHeight, backgroundColor: c, width: Math.max(16, chartWidth / data.length - 8) }]}
                />
                <Text style={[styles.barLabel, { color: theme.secondaryTextColor }]} numberOfLines={1}>
                  {label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  if (chartType === "pie") {
    const values = data.map((d) => Number(yKey ? d[yKey] : d.y ?? d.value ?? d));
    const total = values.reduce((s, v) => s + v, 0) || 1;
    const defaultColors = ["#1e40af", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#f97316"];

    return (
      <View style={[styles.wrapper, { minHeight: height }]}>
        <View style={styles.pieList}>
          {data.map((d, i) => {
            const val = values[i];
            const pct = ((val / total) * 100).toFixed(1);
            const label = xKey ? String(d[xKey]) : String(d.x ?? d.label ?? i);
            const c = colors?.[i] ?? defaultColors[i % defaultColors.length];

            return (
              <View key={i} style={styles.pieItem}>
                <View style={[styles.pieColor, { backgroundColor: c }]} />
                <Text style={[styles.pieLabel, { color: theme.textColor }]}>{label}</Text>
                <Text style={[styles.piePct, { color: theme.secondaryTextColor }]}>{pct}%</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  if (chartType === "line") {
    const values = data.map((d) => Number(yKey ? d[yKey] : d.y ?? d.value ?? d));
    const maxVal = Math.max(...values, 1);
    const minVal = Math.min(...values, 0);
    const range = maxVal - minVal || 1;

    return (
      <View style={[styles.wrapper, { height }]}>
        <View style={[styles.lineChart, { height: height - 20 }]}>
          {values.map((val, i) => {
            const y = ((val - minVal) / range) * (height - 40);
            return (
              <View
                key={i}
                style={[
                  styles.lineDot,
                  {
                    backgroundColor: barColor,
                    bottom: y,
                    left: (i / Math.max(values.length - 1, 1)) * (chartWidth - 16),
                  },
                ]}
              />
            );
          })}
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  wrapper: { marginVertical: 8 },
  empty: {
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    marginVertical: 8,
  },
  barChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    flex: 1,
  },
  barItem: { alignItems: "center", flex: 1 },
  bar: { borderRadius: 4, minWidth: 16 },
  barLabel: { fontSize: 10, marginTop: 4 },
  pieList: { paddingVertical: 8 },
  pieItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  pieColor: { width: 14, height: 14, borderRadius: 3, marginRight: 8 },
  pieLabel: { flex: 1, fontSize: 14 },
  piePct: { fontSize: 14, fontWeight: "600" },
  lineChart: { position: "relative" },
  lineDot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
