import React from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import type { RendererProps } from "../../types";
import type { MiniAppComponent } from "@swissknife/shared";

// Forward declaration — will be injected to avoid circular imports
let renderComponent: (
  component: MiniAppComponent,
  state: Record<string, unknown>,
  dispatch: RendererProps["dispatch"],
  onNavigate: RendererProps["onNavigate"]
) => React.ReactNode;

export function setRenderComponent(fn: typeof renderComponent) {
  renderComponent = fn;
}

export function ListRenderer({ component, state, dispatch, onNavigate }: RendererProps) {
  if (component.type !== "list") return null;
  const { dataKey, emptyText = "No items yet", renderItem } = component.props;

  const data = Array.isArray(state[dataKey]) ? (state[dataKey] as unknown[]) : [];

  if (data.length === 0) {
    return <Text style={styles.empty}>{emptyText}</Text>;
  }

  return (
    <FlatList
      data={data}
      keyExtractor={(_, index) => String(index)}
      scrollEnabled={false}
      renderItem={({ item, index }) => (
        <View style={styles.item}>
          {renderItem.components.map((comp) => {
            // Inject item data into state for child components
            const itemState = {
              ...state,
              _item: item,
              _index: index,
              // If item is a string, also expose it directly
              ...(typeof item === "string" ? { _itemValue: item } : {}),
              ...(typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {}),
            };

            return (
              <View key={comp.id}>
                {renderComponent(comp, itemState, dispatch, onNavigate)}
              </View>
            );
          })}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  empty: {
    color: "#666",
    fontSize: 14,
    textAlign: "center",
    marginVertical: 16,
  },
  item: {
    backgroundColor: "#1e1e2e",
    borderRadius: 8,
    padding: 12,
    marginVertical: 4,
  },
});
