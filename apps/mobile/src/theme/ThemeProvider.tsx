import React, { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";
import {
  lightColors,
  darkColors,
  chessColors,
  feedbackColors,
} from "@blindfold-chess/ui";

import { surfaceColors, type AppColors } from "./surface";

type ThemeContextValue = {
  colors: AppColors;
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
      colors: {
        ...(isDark ? darkColors : lightColors),
        ...surfaceColors[isDark ? "dark" : "light"],
      },
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

/**
 * Current theme values. Light/dark follows the OS appearance
 * (`useColorScheme`) — mobile has no in-app theme override. Throws when
 * called outside {@link ThemeProvider}.
 *
 * `colors` is the shared `@blindfold-chess/ui` palette with the app-only
 * surface tokens (`page`, `panelBorder`, `rowSeparator`, `primaryPressed`)
 * merged on top. The surface tokens live in the app rather than in the
 * shared package because that package also generates the web app's CSS
 * custom properties, which should not carry values the web never uses;
 * merging here leaves every existing `colors.*` read unchanged. The merge
 * only adds keys — a test checks that no surface token shadows a shared one.
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
