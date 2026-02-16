import React, { useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

interface PieceConfig {
  x: number;
  size: number;
  delayMs: number;
  rotateDeg: number;
  color: string;
}

interface Props {
  visible: boolean;
}

const COLORS = ["#60a5fa", "#34d399", "#fbbf24", "#f472b6", "#a78bfa", "#22d3ee"];
const PIECES = 24;

function createPieces(): PieceConfig[] {
  return Array.from({ length: PIECES }).map((_, index) => ({
    x: 8 + Math.random() * 84,
    size: 6 + Math.random() * 8,
    delayMs: index * 45,
    rotateDeg: -40 + Math.random() * 80,
    color: COLORS[index % COLORS.length],
  }));
}

export function CelebrationConfetti({ visible }: Props) {
  const progress = useRef(new Animated.Value(0)).current;
  const pieces = useMemo(() => createPieces(), []);

  useEffect(() => {
    if (!visible) return;
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 1600,
      useNativeDriver: true,
    }).start();
  }, [visible, progress]);

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {pieces.map((p, idx) => {
        const translateY = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [-40, 350 + idx * 6],
        });
        const translateX = progress.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0, (idx % 2 === 0 ? -1 : 1) * (14 + (idx % 5) * 6), (idx % 2 === 0 ? -1 : 1) * 8],
        });
        const opacity = progress.interpolate({
          inputRange: [0, 0.85, 1],
          outputRange: [0, 1, 0],
        });
        const spin = progress.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", `${p.rotateDeg * 8}deg`],
        });

        return (
          <Animated.View
            key={idx}
            style={[
              styles.piece,
              {
                left: `${p.x}%`,
                width: p.size,
                height: p.size * 1.6,
                backgroundColor: p.color,
                opacity,
                transform: [{ translateY }, { translateX }, { rotate: spin }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    zIndex: 1000,
  },
  piece: {
    position: "absolute",
    top: -10,
    borderRadius: 2,
  },
});
