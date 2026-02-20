import React, { createContext, useContext } from "react";
import type { MiniAppTheme } from "@baristapp/shared";

const DEFAULT_THEME: Required<MiniAppTheme> = {
  backgroundColor: "#0F0B08",
  surfaceColor: "#1A1310",
  primaryColor: "#C67C4E",
  textColor: "#EDE5DC",
  secondaryTextColor: "#9C8B7A",
  borderColor: "#3D2E22",
  dangerColor: "#CC5A45",
  successColor: "#7B9A6D",
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
