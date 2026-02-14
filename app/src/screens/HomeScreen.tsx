import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MiniApp } from "@swissknife/shared";
import { listApps, deleteApp, clearState } from "../storage/storageLayer";
import { MiniAppCard } from "../components/MiniAppCard";
import type { RootStackParamList } from "../../App";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export function HomeScreen({ navigation }: Props) {
  const [apps, setApps] = useState<MiniApp[]>([]);

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

  return (
    <View style={styles.container}>
      {apps.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔧</Text>
          <Text style={styles.emptyTitle}>No mini-apps yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap the button below to create your first one
          </Text>
        </View>
      ) : (
        <FlatList
          data={apps}
          keyExtractor={(item) => item.appId}
          renderItem={({ item }) => (
            <MiniAppCard
              app={item}
              onPress={() => navigation.navigate("MiniApp", { appId: item.appId })}
              onDelete={() => handleDelete(item.appId)}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={loadApps} tintColor="#4f46e5" />
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("Create")}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111118",
  },
  list: {
    paddingVertical: 12,
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
  },
  fab: {
    position: "absolute",
    bottom: 32,
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#4f46e5",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#4f46e5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  fabText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "400",
    marginTop: -2,
  },
});
