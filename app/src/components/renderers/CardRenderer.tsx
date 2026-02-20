import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { resolveTemplate } from "@baristapp/shared";
import type { RendererProps } from "../../types";
import { useTheme } from "../ThemeProvider";

export function CardRenderer({ component, state, dispatch, onNavigate, renderChild }: RendererProps) {
  if (component.type !== "card") return null;
  const theme = useTheme();
  const { title, subtitle, children, elevation = 2, onPress } = component.props;

  const resolvedTitle = title ? String(resolveTemplate(title, state) ?? title) : undefined;
  const resolvedSubtitle = subtitle ? String(resolveTemplate(subtitle, state) ?? subtitle) : undefined;

  const content = (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surfaceColor,
          borderColor: theme.borderColor,
          elevation,
          shadowOpacity: elevation * 0.05,
        },
      ]}
    >
      {resolvedTitle && <Text style={[styles.title, { color: theme.textColor }]}>{resolvedTitle}</Text>}
      {resolvedSubtitle && <Text style={[styles.subtitle, { color: theme.secondaryTextColor }]}>{resolvedSubtitle}</Text>}
      {children?.map((child: any) => (
        <View key={child.id}>{renderChild?.(child, state, dispatch, onNavigate)}</View>
      ))}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          if (onPress.type === "navigate") onNavigate(onPress.screenId);
          else dispatch(onPress);
        }}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 8,
  },
});
