import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { MiniApp } from "@baristapp/shared";
import { useAppTheme } from "../context/AppThemeContext";
import type { LibraryScreenProps } from "../types/navigation";
import {
  addFeaturedLibraryApp,
  ignoreFeaturedLibraryApp,
  listFeaturedLibraryApps,
} from "../api/client";
import { saveApp } from "../storage/storageLayer";

type FeaturedItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  spec: MiniApp;
  status: "new" | "added" | "ignored";
  installedAppId?: string;
};

export function DeveloperLibraryScreen({ navigation }: LibraryScreenProps) {
  const { colors } = useAppTheme();
  const [items, setItems] = useState<FeaturedItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await listFeaturedLibraryApps();
      if (result.success && result.items) setItems(result.items);
      else setItems([]);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const handleAdd = async (item: FeaturedItem) => {
    const result = await addFeaturedLibraryApp(item.id);
    if (!result.success || !result.spec) {
      Alert.alert("Add failed", result.error ?? "Could not add this mini-app.");
      return;
    }

    saveApp(result.spec);
    Alert.alert(
      "Added",
      `"${item.title}" added to your apps.`,
      [
        { text: "Close", style: "cancel" },
        {
          text: "Open",
          onPress: () =>
            navigation.navigate("MiniApp", {
              appId: result.installedAppId ?? (result.spec?.appId as string),
            }),
        },
      ]
    );
    void load();
  };

  const handleIgnore = async (item: FeaturedItem) => {
    const result = await ignoreFeaturedLibraryApp(item.id);
    if (!result.success) {
      Alert.alert("Ignore failed", result.error ?? "Could not update this item.");
      return;
    }
    void load();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.heading, { color: colors.text }]}>Official Library</Text>
      <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
        Curated apps built by the Baristapp team. Add any app to My Apps.
      </Text>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.primary} />
        }
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              if (item.status === "added") {
                navigation.navigate("MiniApp", {
                  appId: item.installedAppId ?? item.spec.appId,
                });
              } else {
                void handleAdd(item);
              }
            }}
            style={[styles.card, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderAlt }]}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.icon}>{item.icon || "🔧"}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.description, { color: colors.secondaryText }]}>
                  {item.description}
                </Text>
              </View>
              <Text
                style={[
                  styles.status,
                  {
                    color:
                      item.status === "added"
                        ? colors.primary
                        : item.status === "ignored"
                          ? colors.secondaryText
                          : colors.primary,
                  },
                ]}
              >
                {item.status}
              </Text>
            </View>

            <View style={styles.actions}>
              {item.status !== "added" ? (
                <TouchableOpacity
                  style={[styles.addBtn, { backgroundColor: colors.primary }]}
                  onPress={() => void handleAdd(item)}
                >
                  <Text style={styles.addBtnText}>Add</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.addBtn, { backgroundColor: colors.primary }]}
                  onPress={() =>
                    navigation.navigate("MiniApp", {
                      appId: item.installedAppId ?? item.spec.appId,
                    })
                  }
                >
                  <Text style={styles.addBtnText}>Open</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.ignoreBtn, { borderColor: colors.borderAlt }]}
                onPress={() => void handleIgnore(item)}
              >
                <Text style={[styles.ignoreBtnText, { color: colors.secondaryText }]}>Ignore</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={[styles.emptyCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderAlt }]}>
            <Text style={styles.emptyEmoji}>🧪</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Nothing in Official Library yet</Text>
            <Text style={[styles.empty, { color: colors.secondaryText }]}>
              Add a few starter apps in `featured_mini_apps` to showcase capabilities.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  heading: { fontSize: 22, fontWeight: "700" },
  subtitle: { fontSize: 14, marginTop: 4, marginBottom: 12 },
  list: { paddingBottom: 28 },
  card: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  icon: { fontSize: 24 },
  title: { fontSize: 15, fontWeight: "700" },
  description: { fontSize: 13, marginTop: 2 },
  status: { fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  actions: { flexDirection: "row", gap: 10, marginTop: 10 },
  addBtn: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 10 },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  ignoreBtn: { borderWidth: 1, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 10 },
  ignoreBtnText: { fontWeight: "600", fontSize: 13 },
  emptyCard: { borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 12 },
  emptyEmoji: { fontSize: 22, marginBottom: 6 },
  emptyTitle: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  empty: { fontSize: 13, lineHeight: 18 },
});
