import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MiniApp } from "@swissknife/shared";
import { getApp } from "../storage/storageLayer";
import { MiniAppRenderer } from "../components/MiniAppRenderer";
import type { RootStackParamList } from "../../App";

type Props = NativeStackScreenProps<RootStackParamList, "MiniApp">;

export function MiniAppScreen({ route, navigation }: Props) {
  const { appId } = route.params;
  const [spec, setSpec] = useState<MiniApp | null>(null);

  useEffect(() => {
    const loaded = getApp(appId);
    setSpec(loaded);

    if (loaded) {
      navigation.setOptions({ title: loaded.title });
    }
  }, [appId, navigation]);

  if (!spec) {
    return (
      <View style={styles.error}>
        <Text style={styles.errorText}>Mini-app not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MiniAppRenderer spec={spec} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111118",
  },
  error: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#111118",
  },
  errorText: {
    color: "#888",
    fontSize: 16,
  },
});
