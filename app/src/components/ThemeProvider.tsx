import React, { createContext, useContext } from "react";
import type { MiniAppTheme } from "@swissknife/shared";

const DEFAULT_THEME: Required<MiniAppTheme> = {
  backgroundColor: "#111118",
  surfaceColor: "#1e1e2e",
  primaryColor: "#1e40af",
  textColor: "#ffffff",
  secondaryTextColor: "#888888",
  borderColor: "#333333",
  dangerColor: "#dc2626",
  successColor: "#22c55e",
};

const ThemeContext = createContext<Required<MiniAppTheme>>(DEFAULT_THEME);

export function ThemeProvider({
  theme,
  children,
}: {
  theme?: MiniAppTheme;
  children: React.ReactNode;
}) {
  const merged = { ...DEFAULT_THEME, ...theme };
  return (
    <ThemeContext.Provider value={merged}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): Required<MiniAppTheme> {
  return useContext(ThemeContext);
}

export function themeToCssVars(theme: Required<MiniAppTheme>): string {
  return `--bg:${theme.backgroundColor};--surface:${theme.surfaceColor};--primary:${theme.primaryColor};--text:${theme.textColor};--text2:${theme.secondaryTextColor};--border:${theme.borderColor};--danger:${theme.dangerColor};--success:${theme.successColor};`;
}
