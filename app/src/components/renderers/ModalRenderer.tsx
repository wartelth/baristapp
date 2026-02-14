import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { RendererProps } from "../../types";
import { useTheme } from "../ThemeProvider";

export function ModalRenderer({ component, state, dispatch, onNavigate, renderChild }: RendererProps) {
  if (component.type !== "modal") return null;
  const theme = useTheme();
  const { visibleKey, title, children } = component.props;

  const isVisible = !!state[visibleKey];

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={() => dispatch({ type: "setState", key: visibleKey, value: false })}
    >
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: theme.surfaceColor }]}>
          <View style={styles.header}>
            {title && <Text style={[styles.title, { color: theme.textColor }]}>{title}</Text>}
            <TouchableOpacity
              onPress={() => dispatch({ type: "setState", key: visibleKey, value: false })}
            >
              <Text style={[styles.close, { color: theme.secondaryTextColor }]}>Close</Text>
            </TouchableOpacity>
          </View>
          {children?.map((child: any) => (
            <View key={child.id}>{renderChild?.(child, state, dispatch, onNavigate)}</View>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  content: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  close: {
    fontSize: 16,
    fontWeight: "500",
  },
});
