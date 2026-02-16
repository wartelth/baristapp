import React from "react";
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Alert,
  Dimensions,
  Image,
} from "react-native";
import type { MiniApp } from "@swissknife/shared";
import { getCardColor } from "../utils/colors";
import { useAppTheme } from "../context/AppThemeContext";

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
  onModify: () => void;
  onReport: () => void;
  friendAvatarUrl?: string;
  friendName?: string;
  onShare?: () => void;
}

export function MiniAppCard({
  app,
  onPress,
  onDelete,
  onModify,
  onReport,
  friendAvatarUrl,
  friendName,
  onShare,
}: MiniAppCardProps) {
  const bgColor = getCardColor(app.appId);

  const handleLongPress = () => {
    Alert.alert(app.title, undefined, [
      { text: "Modify", onPress: onModify },
      ...(onShare ? [{ text: "Share", onPress: onShare }] : []),
      { text: "Report", onPress: onReport },
      { text: "Delete", style: "destructive", onPress: onDelete },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleMenu = () => {
    Alert.alert(app.title, undefined, [
      { text: "Modify", onPress: onModify },
      ...(onShare ? [{ text: "Share", onPress: onShare }] : []),
      { text: "Report", onPress: onReport },
      { text: "Delete", style: "destructive", onPress: onDelete },
      { text: "Cancel", style: "cancel" },
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

      <Text style={styles.icon}>{app.icon ?? "🔧"}</Text>
      <View style={styles.titleRow}>
        <Text style={styles.title} numberOfLines={2}>
          {app.title}
        </Text>
        {!!friendAvatarUrl && (
          <View style={styles.friendBadge}>
            <Image source={{ uri: friendAvatarUrl }} style={styles.friendAvatar} />
            <Text style={styles.friendText} numberOfLines={1}>
              {friendName ? `by ${friendName}` : "friend"}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

/** "Add new" card — the "+" button at the end of the grid. */
export function AddCard({ onPress }: { onPress: () => void }) {
  const { colors } = useAppTheme();

  return (
    <TouchableOpacity
      style={[styles.card, styles.addCard, { width: CARD_WIDTH, backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.addIcon, { color: colors.tabInactive }]}>+</Text>
      <View style={styles.titleRow}>
        <Text style={[styles.addLabel, { color: colors.tabInactive }]}>New App</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    aspectRatio: 1 / 0.7,
    padding: 14,
    justifyContent: "space-between",
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
  icon: {
    fontSize: 28,
  },
  titleRow: {
    marginTop: "auto",
  },
  title: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
  friendBadge: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  friendAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  friendText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    maxWidth: CARD_WIDTH - 60,
  },
  addCard: {
    borderWidth: 2,
    borderStyle: "dashed",
  },
  addIcon: {
    fontSize: 24,
    fontWeight: "300",
  },
  addLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
});
