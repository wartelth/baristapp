import React from "react";
import { View } from "react-native";
import type { RendererProps } from "../../types";
import { useTheme } from "../ThemeProvider";

export function DividerRenderer({ component }: RendererProps) {
  if (component.type !== "divider") return null;
  const theme = useTheme();
  const color = component.props?.color ?? theme.borderColor;
  const thickness = component.props?.thickness ?? 1;
  const marginVertical = component.props?.marginVertical ?? 12;

  return (
    <View
      style={{
        height: thickness,
        backgroundColor: color,
        marginVertical,
      }}
    />
  );
}
