import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ---------------------------------------------------------------------------
// Color palettes
// ---------------------------------------------------------------------------

export interface AppColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  secondaryText: string;
  border: string;
  borderAlt: string;
  primary: string;
  danger: string;
  success: string;
  tabInactive: string;
  searchPlaceholder: string;
  modalOverlay: string;
}

const DARK: AppColors = {
  background: "#111118",
  surface: "#1e1e2e",
  surfaceAlt: "#1a1a2e",
  text: "#fff",
  secondaryText: "#888",
  border: "#333",
  borderAlt: "#2a2a3e",
  primary: "#1e40af",
  danger: "#dc2626",
  success: "#22c55e",
  tabInactive: "#555",
  searchPlaceholder: "#555",
  modalOverlay: "rgba(0,0,0,0.7)",
};

const LIGHT: AppColors = {
  background: "#f5f5f7",
  surface: "#ffffff",
  surfaceAlt: "#f0f0f5",
  text: "#111118",
  secondaryText: "#666",
  border: "#e0e0e0",
  borderAlt: "#d8d8e0",
  primary: "#1e40af",
  danger: "#dc2626",
  success: "#22c55e",
  tabInactive: "#999",
  searchPlaceholder: "#999",
  modalOverlay: "rgba(0,0,0,0.4)",
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export type ThemeMode = "dark" | "light";

interface AppThemeValue {
  mode: ThemeMode;
  colors: AppColors;
  toggleTheme: () => void;
}

const STORAGE_KEY = "settings:theme";

const AppThemeContext = createContext<AppThemeValue>({
  mode: "dark",
  colors: DARK,
  toggleTheme: () => {},
});

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("dark");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === "light" || v === "dark") setMode(v);
    });
  }, []);

  const toggleTheme = () => {
    const next: ThemeMode = mode === "dark" ? "light" : "dark";
    setMode(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(console.warn);
  };

  const colors = mode === "dark" ? DARK : LIGHT;

  return (
    <AppThemeContext.Provider value={{ mode, colors, toggleTheme }}>
      {children}
    </AppThemeContext.Provider>
  );
}

export function useAppTheme(): AppThemeValue {
  return useContext(AppThemeContext);
}
