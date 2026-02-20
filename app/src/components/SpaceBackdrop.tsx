import React from "react";
import { Dimensions, StyleSheet, View } from "react-native";

type Star = { left: number; top: number; size: number; opacity: number };
const { width, height } = Dimensions.get("window");

function makeStars(count: number): Star[] {
  let seed = 1337;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  return Array.from({ length: count }).map(() => {
    const size = rand() > 0.85 ? 2 : 1;
    return {
      left: Math.floor(rand() * width),
      top: Math.floor(rand() * height),
      size,
      opacity: 0.25 + rand() * 0.6,
    };
  });
}

const STARS = makeStars(58);

export function SpaceBackdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.glow, styles.glowTop]} />
      <View style={[styles.glow, styles.glowRight]} />
      <View style={[styles.glow, styles.glowBottom]} />
      {STARS.map((star, i) => (
        <View
          key={i}
          style={[
            styles.star,
            {
              left: star.left,
              top: star.top,
              width: star.size,
              height: star.size,
              opacity: star.opacity,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  glow: {
    position: "absolute",
    borderRadius: 999,
  },
  glowTop: {
    width: width * 0.95,
    height: width * 0.95,
    left: -width * 0.2,
    top: -width * 0.55,
    backgroundColor: "rgba(118, 91, 255, 0.12)",
  },
  glowRight: {
    width: width * 0.9,
    height: width * 0.9,
    right: -width * 0.35,
    top: height * 0.08,
    backgroundColor: "rgba(38, 179, 255, 0.08)",
  },
  glowBottom: {
    width: width * 1.2,
    height: width * 1.2,
    left: -width * 0.3,
    bottom: -width * 0.75,
    backgroundColor: "rgba(109, 122, 255, 0.08)",
  },
  star: {
    position: "absolute",
    backgroundColor: "#eaf0ff",
    borderRadius: 999,
  },
});
