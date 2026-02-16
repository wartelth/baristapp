import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../context/AppThemeContext";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types/navigation";
import { config } from "../config";

type Props = NativeStackScreenProps<RootStackParamList, "Legal">;

export function LegalScreen({ route }: Props) {
  const { colors } = useAppTheme();
  const isPrivacy = route.params.section === "privacy";

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {isPrivacy ? (
        <>
          <Text style={[styles.title, { color: colors.text }]}>Privacy Policy</Text>
          <Text style={[styles.paragraph, { color: colors.secondaryText }]}>
            SwissKnife processes your prompts and mini-app requests through Anthropic Claude to generate or modify mini-apps.
          </Text>
          <Text style={[styles.paragraph, { color: colors.secondaryText }]}>
            Mini-app specifications and runtime state are stored in Supabase cloud storage and can be associated with your account token or your device ID.
          </Text>
          <Text style={[styles.paragraph, { color: colors.secondaryText }]}>
            We only use this data to provide app generation, modification, syncing, and safety review workflows. You can withdraw consent and delete your data from the Profile screen.
          </Text>
          <View style={[styles.box, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderAlt }]}>
            <Text style={[styles.boxTitle, { color: colors.text }]}>Data processors</Text>
            <Text style={[styles.boxLine, { color: colors.secondaryText }]}>- Anthropic (AI generation/modification)</Text>
            <Text style={[styles.boxLine, { color: colors.secondaryText }]}>- Supabase (data storage and synchronization)</Text>
          </View>
        </>
      ) : (
        <>
          <Text style={[styles.title, { color: colors.text }]}>Support</Text>
          <Text style={[styles.paragraph, { color: colors.secondaryText }]}>
            Contact us if you need help, want to report abusive content, or need account/data assistance.
          </Text>
          <View style={[styles.box, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderAlt }]}>
            <Text style={[styles.boxLine, { color: colors.secondaryText }]}>Email: {config.supportEmail}</Text>
            <Text style={[styles.boxLine, { color: colors.secondaryText }]}>Support URL: {config.supportUrl}</Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 12 },
  paragraph: { fontSize: 15, lineHeight: 22, marginBottom: 12 },
  box: { borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 8 },
  boxTitle: { fontSize: 14, fontWeight: "700", marginBottom: 8 },
  boxLine: { fontSize: 14, lineHeight: 20 },
});
