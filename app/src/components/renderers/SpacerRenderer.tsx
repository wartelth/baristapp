import React from "react";
import { View } from "react-native";
import type { RendererProps } from "../../types";

export function SpacerRenderer({ component }: RendererProps) {
  if (component.type !== "spacer") return null;
  const height = component.props?.height;
  const flex = component.props?.flex;

  return <View style={{ height: height ?? undefined, flex: flex ?? undefined }} />;
}
