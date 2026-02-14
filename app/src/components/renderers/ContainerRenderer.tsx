import React from "react";
import { View, StyleSheet } from "react-native";
import type { RendererProps } from "../../types";

export function ContainerRenderer({ component, state, dispatch, onNavigate, renderChild }: RendererProps) {
  if (component.type !== "container") return null;
  const {
    children,
    direction = "column",
    gap = 0,
    padding = 0,
    align,
    justify,
    wrap = false,
  } = component.props;

  return (
    <View
      style={[
        styles.container,
        {
          flexDirection: direction,
          gap,
          padding,
          alignItems: align,
          justifyContent: justify,
          flexWrap: wrap ? "wrap" : "nowrap",
        },
      ]}
    >
      {children?.map((child: any) => (
        <View key={child.id}>{renderChild?.(child, state, dispatch, onNavigate)}</View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
});
