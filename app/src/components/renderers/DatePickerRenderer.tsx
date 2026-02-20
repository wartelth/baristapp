import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { resolveTemplate } from "@baristapp/shared";
import type { RendererProps } from "../../types";
import { useTheme } from "../ThemeProvider";

let RNDateTimePicker: any = null;
try {
  RNDateTimePicker = require("@react-native-community/datetimepicker").default;
} catch {
  // not installed
}

export function DatePickerRenderer({ component, state, dispatch }: RendererProps) {
  if (component.type !== "datePicker") return null;
  const theme = useTheme();
  const { stateKey, mode = "date", label: rawLabel } = component.props;
  const label = rawLabel ? String(resolveTemplate(rawLabel, state) ?? rawLabel) : undefined;
  const [show, setShow] = useState(false);

  const currentValue = state[stateKey] ? new Date(String(state[stateKey])) : new Date();
  const isValidDate = !isNaN(currentValue.getTime());
  const date = isValidDate ? currentValue : new Date();

  const formatDisplay = () => {
    if (!state[stateKey]) return "Tap to select";
    if (mode === "time") return date.toLocaleTimeString();
    if (mode === "datetime") return date.toLocaleString();
    return date.toLocaleDateString();
  };

  if (!RNDateTimePicker) {
    // Fallback: simple text display
    return (
      <View style={styles.wrapper}>
        {label && <Text style={[styles.label, { color: theme.textColor }]}>{label}</Text>}
        <View style={[styles.trigger, { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }]}>
          <Text style={{ color: theme.secondaryTextColor }}>
            Date picker not available (@react-native-community/datetimepicker not installed)
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      {label && <Text style={[styles.label, { color: theme.textColor }]}>{label}</Text>}
      <TouchableOpacity
        style={[styles.trigger, { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }]}
        onPress={() => setShow(true)}
      >
        <Text style={{ color: theme.textColor, fontSize: 16 }}>{formatDisplay()}</Text>
      </TouchableOpacity>
      {show && (
        <RNDateTimePicker
          value={date}
          mode={mode === "datetime" ? "date" : mode}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_: any, selectedDate?: Date) => {
            setShow(Platform.OS === "ios");
            if (selectedDate) {
              dispatch({ type: "setState", key: stateKey, value: selectedDate.toISOString() });
            }
          }}
          themeVariant="dark"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginVertical: 6 },
  label: { fontSize: 14, fontWeight: "500", marginBottom: 4 },
  trigger: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
