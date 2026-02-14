import React from "react";
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Alert,
  Dimensions,
} from "react-native";
import type { MiniApp } from "@swissknife/shared";
import { getCardColor } from "../utils/colors";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_GAP = 12;
const CARD_HORIZONTAL_PADDING = 16;
// 2 columns with gaps: totalWidth - 2*padding - gap / 2
export const CARD_WIDTH =
  (SCREEN_WIDTH - 2 * CARD_HORIZONTAL_PADDING - CARD_GAP) / 2;

interface MiniAppCardProps {
  app: MiniApp;
  onPress: () => void;
  onDelete: () => void;
}

export function MiniAppCard({ app, onPress, onDelete }: MiniAppCardProps) {
  const bgColor = getCardColor(app.appId);

  const handleLongPress = () => {
    Alert.alert("Delete Mini-App", `Remove "${app.title}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: onDelete },
    ]);
  };

  const handleMenu = () => {
    Alert.alert(app.title, undefined, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: onDelete },
    ]);
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: bgColor, width: CARD_WIDTH }]}
      onPress={onPress}
      onLongPress={handleLongPress}
      activeOpacity={0.8}
    >
      <TouchableOpacity
        style={styles.menuBtn}
        onPress={handleMenu}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.menuDots}>...</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.icon}>{app.icon ?? "🔧"}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {app.title}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

/** "Add new" card — the "+" button at the end of the grid. */
export function AddCard({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.card, styles.addCard, { width: CARD_WIDTH }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <Text style={styles.addIcon}>+</Text>
        <Text style={styles.addLabel}>New App</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    aspectRatio: 1 / 1.1,
    padding: 12,
    position: "relative",
  },
  menuBtn: {
    position: "absolute",
    top: 8,
    right: 10,
    zIndex: 1,
  },
  menuDots: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 20,
  },
  addCard: {
    backgroundColor: "#1e1e2e",
    borderWidth: 2,
    borderColor: "#333",
    borderStyle: "dashed",
  },
  addIcon: {
    color: "#666",
    fontSize: 36,
    fontWeight: "300",
  },
  addLabel: {
    color: "#666",
    fontSize: 14,
    fontWeight: "500",
  },
});
