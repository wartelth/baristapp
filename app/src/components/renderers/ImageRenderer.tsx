import React from "react";
import { Image, StyleSheet } from "react-native";
import type { RendererProps } from "../../types";

export function ImageRenderer({ component, state }: RendererProps) {
  if (component.type !== "image") return null;
  const { uri, stateKey, width = 200, height = 200, resizeMode = "cover" } = component.props;

  const imageUri = stateKey ? String(state[stateKey] ?? uri ?? "") : uri;
  if (!imageUri) return null;

  return (
    <Image
      source={{ uri: imageUri }}
      style={[styles.image, { width, height }]}
      resizeMode={resizeMode}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    borderRadius: 10,
    alignSelf: "center",
    marginVertical: 8,
  },
});
