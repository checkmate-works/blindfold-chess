import React, { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";
import {
  lightColors,
  darkColors,
  chessColors,
  feedbackColors,
  type ThemeColors,
} from "@blindfold-chess/ui";

type ThemeContextValue = {
  colors: ThemeColors;
  chessColors: typeof chessColors;
  feedbackColors: typeof feedbackColors;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: isDark ? darkColors : lightColors,
      chessColors,
      feedbackColors,
      isDark,
    }),
    [isDark],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
