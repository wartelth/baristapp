import React from "react";
import { View, Text, StyleSheet, useWindowDimensions } from "react-native";
import Svg, { Polyline, Circle } from "react-native-svg";
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
    const defaultColors = ["#C67C4E", "#7B9A6D", "#D4956A", "#CC5A45", "#8B5E3C", "#6E8A60", "#B46D42", "#A35A32"];

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

    const padX = 16;
    const padY = 16;
    const svgWidth = chartWidth;
    const svgHeight = height - 20;
    const plotW = svgWidth - padX * 2;
    const plotH = svgHeight - padY * 2;

    const points = values.map((val, i) => {
      const x = padX + (i / Math.max(values.length - 1, 1)) * plotW;
      const y = padY + plotH - ((val - minVal) / range) * plotH;
      return { x, y };
    });

    const pointsStr = points.map((p) => `${p.x},${p.y}`).join(" ");
    const lineColor = barColor;

    return (
      <View style={[styles.wrapper, { height }]}>
        <Svg width={svgWidth} height={svgHeight}>
          <Polyline
            points={pointsStr}
            fill="none"
            stroke={lineColor}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {points.map((p, i) => (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={4}
              fill={lineColor}
            />
          ))}
        </Svg>
        {/* X labels */}
        <View style={styles.xLabels}>
          {data.map((d, i) => {
            const label = xKey ? String(d[xKey]) : String(d.x ?? d.label ?? i);
            return (
              <Text key={i} style={[styles.xLabel, { color: theme.secondaryTextColor }]} numberOfLines={1}>
                {label}
              </Text>
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
  xLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  xLabel: { fontSize: 10, textAlign: "center", flex: 1 },
});
