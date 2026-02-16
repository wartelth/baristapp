import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Animated,
  Easing,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { MiniApp } from "@swissknife/shared";
import { listApps, deleteApp, clearState } from "../storage/storageLayer";
import { MiniAppCard } from "../components/MiniAppCard";
import { useGeneration } from "../context/GenerationContext";
import { useAppTheme } from "../context/AppThemeContext";
import type { LibraryScreenProps } from "../types/navigation";

type Props = LibraryScreenProps;

const CARD_GAP = 12;

export function HomeScreen({ navigation }: Props) {
  const { busy, busyLabel, startModify } = useGeneration();
  const { colors } = useAppTheme();
  const [apps, setApps] = useState<MiniApp[]>([]);
  const [search, setSearch] = useState("");

  // Banner animation
  const bannerAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (busy) {
      Animated.spring(bannerAnim, {
        toValue: 1,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }).start();
      Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      Animated.timing(bannerAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [busy]);

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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Library</Text>
        {apps.length > 0 && (
          <Text style={[styles.headerCount, { color: colors.secondaryText }]}>{apps.length}</Text>
        )}
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.borderAlt }]}
          placeholder="Search apps..."
          placeholderTextColor={colors.searchPlaceholder}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Generating banner */}
      <Animated.View
        style={[
          styles.banner,
          {
            backgroundColor: colors.surfaceAlt,
            borderColor: colors.borderAlt,
            opacity: bannerAnim,
            transform: [
              {
                translateY: bannerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-40, 0],
                }),
              },
              {
                scale: bannerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.95, 1],
                }),
              },
            ],
          },
        ]}
        pointerEvents={busy ? "auto" : "none"}
      >
        <Animated.View
          style={[
            styles.bannerDot,
            {
              backgroundColor: colors.primary,
              transform: [
                {
                  scale: shimmerAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [1, 1.4, 1],
                  }),
                },
              ],
              opacity: shimmerAnim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [1, 0.4, 1],
              }),
            },
          ]}
        />
        <View style={styles.bannerTextCol}>
          <Text style={[styles.bannerTitle, { color: colors.text }]}>
            {busyLabel || "Generating app..."}
          </Text>
          <Text style={[styles.bannerSub, { color: colors.secondaryText }]}>
            This may take a moment
          </Text>
        </View>
      </Animated.View>

      {apps.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔧</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No mini-apps yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.secondaryText }]}>
            Tap the + tab to create your first one
          </Text>
        </View>
      ) : (
        <FlatList<MiniApp>
          data={filtered}
          keyExtractor={(item) => item.appId}
          numColumns={2}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => (
            <MiniAppCard
              app={item}
              onPress={() =>
                navigation.navigate("MiniApp", { appId: item.appId })
              }
              onDelete={() => handleDelete(item.appId)}
              onModify={() => handleModifyOpen(item)}
            />
          )}
          contentContainerStyle={styles.grid}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={loadApps}
              tintColor={colors.primary}
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
          style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderAlt }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Modify "{modifyTarget?.title}"
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.secondaryText }]}>
              What do you want to change?
            </Text>
            <TextInput
              ref={modifyInputRef}
              style={[styles.modifyInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.borderAlt }]}
              placeholder='e.g. "add a dark mode toggle"'
              placeholderTextColor={colors.searchPlaceholder}
              value={modifyText}
              onChangeText={setModifyText}
              multiline
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: colors.borderAlt }]}
                onPress={handleModifyClose}
              >
                <Text style={[styles.cancelBtnText, { color: colors.secondaryText }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  { backgroundColor: colors.primary },
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
    fontSize: 22,
    fontWeight: "700",
  },
  headerCount: {
    fontSize: 16,
    fontWeight: "500",
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchInput: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
  },
  // Generating banner
  banner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  bannerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  bannerTextCol: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  bannerSub: {
    fontSize: 12,
    marginTop: 2,
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
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 24,
  },
  // Modify modal
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  modifyInput: {
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: "top",
    borderWidth: 1,
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
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
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
