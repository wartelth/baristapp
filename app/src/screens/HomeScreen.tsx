import React, { useCallback, useMemo, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  RefreshControl,
  Modal,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MiniApp } from "@swissknife/shared";
import { listApps, deleteApp, clearState } from "../storage/storageLayer";
import { MiniAppCard, AddCard, CARD_WIDTH } from "../components/MiniAppCard";
import { useGeneration } from "../context/GenerationContext";
import type { RootStackParamList } from "../../App";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

const CARD_GAP = 12;

export function HomeScreen({ navigation }: Props) {
  const { busy, startModify } = useGeneration();
  const [apps, setApps] = useState<MiniApp[]>([]);
  const [search, setSearch] = useState("");

  // Modify modal state
  const [modifyTarget, setModifyTarget] = useState<MiniApp | null>(null);
  const [modifyText, setModifyText] = useState("");
  const modifyInputRef = useRef<TextInput>(null);

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

  const handleModifyOpen = (app: MiniApp) => {
    if (busy) {
      Alert.alert("Please wait", "A generation is already in progress.");
      return;
    }
    setModifyTarget(app);
    setModifyText("");
  };

  const handleModifyClose = () => {
    setModifyTarget(null);
    setModifyText("");
  };

  const handleModifySubmit = () => {
    if (!modifyTarget || !modifyText.trim()) return;

    // Fire-and-forget — context handles the API call + notification
    startModify(modifyTarget, modifyText.trim());
    setModifyTarget(null);
    setModifyText("");
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
            <AddCard onPress={() => !busy && navigation.navigate("Create")} />
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
              return <AddCard onPress={() => !busy && navigation.navigate("Create")} />;
            }
            return (
              <MiniAppCard
                app={item}
                onPress={() =>
                  navigation.navigate("MiniApp", { appId: item.appId })
                }
                onDelete={() => handleDelete(item.appId)}
                onModify={() => handleModifyOpen(item)}
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

      {/* Modify Modal */}
      <Modal
        visible={modifyTarget !== null}
        transparent
        animationType="slide"
        onRequestClose={handleModifyClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Modify "{modifyTarget?.title}"
            </Text>
            <Text style={styles.modalSubtitle}>
              What do you want to change?
            </Text>
            <TextInput
              ref={modifyInputRef}
              style={styles.modifyInput}
              placeholder='e.g. "add a dark mode toggle"'
              placeholderTextColor="#555"
              value={modifyText}
              onChangeText={setModifyText}
              multiline
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handleModifyClose}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  !modifyText.trim() && styles.submitBtnDisabled,
                ]}
                onPress={handleModifySubmit}
                disabled={!modifyText.trim()}
              >
                <Text style={styles.submitBtnText}>Modify</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
  // Modify modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#1a1a2e",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: "#2a2a3e",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  modalSubtitle: {
    color: "#888",
    fontSize: 14,
    marginBottom: 16,
  },
  modifyInput: {
    backgroundColor: "#111118",
    color: "#fff",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "#2a2a3e",
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#2a2a3e",
    alignItems: "center",
  },
  cancelBtnText: {
    color: "#888",
    fontSize: 15,
    fontWeight: "600",
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#4f46e5",
    alignItems: "center",
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
