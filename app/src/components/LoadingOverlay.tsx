import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";

const MESSAGES = [
  "Designing your mini-app...",
  "Generating UI components...",
  "Validating schema...",
  "Almost there...",
];

export function LoadingOverlay() {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.text}>{MESSAGES[msgIndex]}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  card: {
    backgroundColor: "#1e1e2e",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    gap: 16,
    width: 260,
  },
  text: {
    color: "#ccc",
    fontSize: 15,
    textAlign: "center",
  },
});
