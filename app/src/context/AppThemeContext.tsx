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
  background: "#0F0B08",
  surface: "#1A1310",
  surfaceAlt: "#241C16",
  text: "#EDE5DC",
  secondaryText: "#9C8B7A",
  border: "#3D2E22",
  borderAlt: "#4A392B",
  primary: "#C67C4E",
  danger: "#CC5A45",
  success: "#7B9A6D",
  tabInactive: "#7A6858",
  searchPlaceholder: "#7A6858",
  modalOverlay: "rgba(15,11,8,0.76)",
};

const LIGHT: AppColors = {
  background: "#F7EFE6",
  surface: "#FFF9F3",
  surfaceAlt: "#F1E5D8",
  text: "#2B2018",
  secondaryText: "#7D6A59",
  border: "#D8C4AF",
  borderAlt: "#E6D5C4",
  primary: "#C67C4E",
  danger: "#C55440",
  success: "#7B9A6D",
  tabInactive: "#A28F7D",
  searchPlaceholder: "#A28F7D",
  modalOverlay: "rgba(15,11,8,0.38)",
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
