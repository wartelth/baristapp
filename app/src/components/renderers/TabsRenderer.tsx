import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import type { RendererProps } from "../../types";
import { useTheme } from "../ThemeProvider";

export function TabsRenderer({ component, state, dispatch, onNavigate, renderChild }: RendererProps) {
  if (component.type !== "tabs") return null;
  const theme = useTheme();
  const { stateKey, tabs } = component.props;

  const activeTab = String(state[stateKey] ?? tabs[0]?.value ?? "");
  const activeTabData = tabs.find((t: any) => t.value === activeTab) ?? tabs[0];

  return (
    <View style={styles.wrapper}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
        {tabs.map((tab: any) => {
          const isActive = tab.value === activeTab;
          return (
            <TouchableOpacity
              key={tab.value}
              style={[
                styles.tab,
                {
                  borderBottomColor: isActive ? theme.primaryColor : "transparent",
                  borderBottomWidth: 2,
                },
              ]}
              onPress={() => dispatch({ type: "setState", key: stateKey, value: tab.value })}
            >
              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? theme.primaryColor : theme.secondaryTextColor },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <View style={styles.content}>
        {activeTabData?.children?.map((child: any) => (
          <View key={child.id}>{renderChild?.(child, state, dispatch, onNavigate)}</View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginVertical: 6 },
  tabBar: {
    flexDirection: "row",
    marginBottom: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 4,
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  content: {},
});
