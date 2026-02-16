import React, { useEffect, useRef } from "react";
import {
  Animated,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useGeneration } from "../context/GenerationContext";

interface Props {
  onTapAppId?: (appId: string) => void;
}

export function NotificationToast({ onTapAppId }: Props) {
  const { notification, dismissNotification } = useGeneration();
  const translateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (notification) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [notification]);

  if (!notification) return null;

  const handlePress = () => {
    if (notification.appId && onTapAppId) {
      onTapAppId(notification.appId);
    }
    dismissNotification();
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY }] },
        notification.success ? styles.success : styles.error,
      ]}
    >
      <TouchableOpacity style={styles.inner} onPress={handlePress} activeOpacity={0.8}>
        <Text style={styles.icon}>{notification.success ? "OK" : "!"}</Text>
        <Text style={styles.message} numberOfLines={2}>
          {notification.message}
        </Text>
        {notification.appId && (
          <Text style={styles.action}>Open</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 50,
    left: 16,
    right: 16,
    borderRadius: 14,
    zIndex: 999,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  success: {
    backgroundColor: "#16432a",
    borderWidth: 1,
    borderColor: "#22c55e",
  },
  error: {
    backgroundColor: "#3f1219",
    borderWidth: 1,
    borderColor: "#dc2626",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 10,
  },
  icon: {
    fontSize: 14,
    fontWeight: "800",
    color: "#fff",
  },
  message: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  action: {
    color: "#1e40af",
    fontSize: 14,
    fontWeight: "700",
  },
});
