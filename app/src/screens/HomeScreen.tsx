import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MiniApp } from "@swissknife/shared";
import { listApps, deleteApp, clearState } from "../storage/storageLayer";
import { MiniAppCard, AddCard, CARD_WIDTH } from "../components/MiniAppCard";
import type { RootStackParamList } from "../../App";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

const CARD_GAP = 12;

export function HomeScreen({ navigation }: Props) {
  const [apps, setApps] = useState<MiniApp[]>([]);
  const [search, setSearch] = useState("");

  const loadApps = useCallback(() => {
    setApps(listApps());
  }, []);

  // Reload on every focus (e.g. after creating a new app)
  useFocusEffect(loadApps);

  const handleDelete = (appId: string) => {
    deleteApp(appId);
    clearState(appId);
    loadApps();
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return apps;
    const q = search.toLowerCase();
    return apps.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.appId.toLowerCase().includes(q)
    );
  }, [apps, search]);

  // Grid data: filtered apps + a sentinel for the "+" add card
  const ADD_SENTINEL = { __add: true } as const;
  type GridItem = MiniApp | typeof ADD_SENTINEL;
  const gridData: GridItem[] = [...filtered, ADD_SENTINEL];

  const isAddCard = (item: GridItem): item is typeof ADD_SENTINEL =>
    "__add" in item;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>All Mini-Apps</Text>
        {apps.length > 0 && (
          <Text style={styles.headerCount}>{apps.length}</Text>
        )}
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search apps..."
          placeholderTextColor="#555"
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {apps.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔧</Text>
          <Text style={styles.emptyTitle}>No mini-apps yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap the + card below to create your first one
          </Text>
          <View style={styles.emptyAddWrapper}>
            <AddCard onPress={() => navigation.navigate("Create")} />
          </View>
        </View>
      ) : (
        <FlatList<GridItem>
          data={gridData}
          keyExtractor={(item, index) =>
            isAddCard(item) ? "__add__" : item.appId
          }
          numColumns={2}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => {
            if (isAddCard(item)) {
              return <AddCard onPress={() => navigation.navigate("Create")} />;
            }
            return (
              <MiniAppCard
                app={item}
                onPress={() =>
                  navigation.navigate("MiniApp", { appId: item.appId })
                }
                onDelete={() => handleDelete(item.appId)}
              />
            );
          }}
          contentContainerStyle={styles.grid}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={loadApps}
              tintColor="#4f46e5"
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111118",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 8,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },
  headerCount: {
    color: "#888",
    fontSize: 16,
    fontWeight: "500",
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchInput: {
    backgroundColor: "#1e1e2e",
    color: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#2a2a3e",
  },
  grid: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  row: {
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptySubtitle: {
    color: "#888",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 24,
  },
  emptyAddWrapper: {
    alignItems: "center",
  },
});
