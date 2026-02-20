import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList } from "react-native";
import type { RendererProps } from "../../types";
import { useTheme } from "../ThemeProvider";

export function SelectRenderer({ component, state, dispatch }: RendererProps) {
  if (component.type !== "select") return null;
  const theme = useTheme();
  const { stateKey, options, placeholder = "Select..." } = component.props;
  const [open, setOpen] = useState(false);

  const currentValue = String(state[stateKey] ?? "");
  const selectedOption = options.find((o: any) => o.value === currentValue);

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={[styles.trigger, { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }]}
        onPress={() => setOpen(true)}
      >
        <Text style={{ color: selectedOption ? theme.textColor : theme.secondaryTextColor, fontSize: 16 }}>
          {selectedOption?.label ?? placeholder}
        </Text>
        <Text style={{ color: theme.secondaryTextColor }}>{">"}</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={[styles.dropdown, { backgroundColor: theme.surfaceColor }]}>
            <FlatList
              data={options}
              keyExtractor={(item: any) => item.value}
              renderItem={({ item }: any) => (
                <TouchableOpacity
                  style={[
                    styles.option,
                    item.value === currentValue && { backgroundColor: theme.primaryColor + "20" },
                  ]}
                  onPress={() => {
                    dispatch({ type: "setState", key: stateKey, value: item.value });
                    setOpen(false);
                  }}
                >
                  <Text style={{ color: theme.textColor, fontSize: 16 }}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginVertical: 6 },
  trigger: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,11,8,0.6)",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  dropdown: {
    borderRadius: 12,
    maxHeight: 300,
    overflow: "hidden",
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#3D2E22",
  },
});
