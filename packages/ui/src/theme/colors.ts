// Semantic UI colors for light mode
export const lightColors = {
  background: "#f0f0f0",
  foreground: "#3d3d3d",
  card: "#ffffff",
  cardForeground: "#3d3d3d",
  primary: "#3893E8",
  primaryForeground: "#ffffff",
  secondary: "#e8e8e8",
  secondaryForeground: "#3d3d3d",
  muted: "#e8e8e8",
  mutedForeground: "#7f7f7f",
  accent: "#f0f0f0",
  accentForeground: "#3d3d3d",
  destructive: "#dc524a",
  destructiveForeground: "#ffffff",
  destructiveSoft: "#fde8e8",
  destructiveSoftForeground: "#991b1b",
  success: "#16a34a",
  successForeground: "#ffffff",
  successSoft: "#dcfce7",
  successSoftForeground: "#166534",
  warning: "#d97706",
  warningForeground: "#ffffff",
  warningSoft: "#fef9c3",
  warningSoftForeground: "#854d0e",
  info: "#2563eb",
  infoForeground: "#ffffff",
  infoSoft: "#dbeafe",
  infoSoftForeground: "#1e40af",
  caution: "#ea580c",
  cautionForeground: "#ffffff",
  cautionSoft: "#ffedd5",
  cautionSoftForeground: "#9a3412",
  accentPurple: "#9333ea",
  accentPurpleSoft: "#f3e8ff",
  accentOrange: "#ea580c",
  accentOrangeSoft: "#ffedd5",
  podiumGold: "#fef9c3",
  podiumGoldForeground: "#854d0e",
  podiumSilver: "#f3f4f6",
  podiumSilverForeground: "#4b5563",
  podiumBronze: "#ffedd5",
  podiumBronzeForeground: "#c2410c",
  border: "#cccccc",
  input: "#ffffff",
  ring: "#3893E8",
  linkPrimary: "#3893E8",
  linkSecondary: "#7f7f7f",
} as const;

// Semantic UI colors for dark mode (Lichess-inspired warm dark)
export const darkColors = {
  background: "#161512",
  foreground: "#bababa",
  card: "#262421",
  cardForeground: "#bababa",
  primary: "#3893E8",
  primaryForeground: "#ffffff",
  secondary: "#2b2926",
  secondaryForeground: "#bababa",
  muted: "#2b2926",
  mutedForeground: "#7f7f7f",
  accent: "#2b2926",
  accentForeground: "#bababa",
  destructive: "#dc524a",
  destructiveForeground: "#ffffff",
  destructiveSoft: "rgba(220, 82, 74, 0.15)",
  destructiveSoftForeground: "#fca5a5",
  success: "#22c55e",
  successForeground: "#ffffff",
  successSoft: "rgba(34, 197, 94, 0.15)",
  successSoftForeground: "#86efac",
  warning: "#f59e0b",
  warningForeground: "#ffffff",
  warningSoft: "rgba(245, 158, 11, 0.15)",
  warningSoftForeground: "#fde68a",
  info: "#3b82f6",
  infoForeground: "#ffffff",
  infoSoft: "rgba(59, 130, 246, 0.15)",
  infoSoftForeground: "#93c5fd",
  caution: "#f97316",
  cautionForeground: "#ffffff",
  cautionSoft: "rgba(249, 115, 22, 0.15)",
  cautionSoftForeground: "#fdba74",
  accentPurple: "#c084fc",
  accentPurpleSoft: "rgba(88, 28, 135, 0.3)",
  accentOrange: "#fb923c",
  accentOrangeSoft: "rgba(124, 45, 18, 0.3)",
  podiumGold: "rgba(161, 98, 7, 0.3)",
  podiumGoldForeground: "#fbbf24",
  podiumSilver: "rgba(75, 85, 99, 0.3)",
  podiumSilverForeground: "#d1d5db",
  podiumBronze: "rgba(124, 45, 18, 0.3)",
  podiumBronzeForeground: "#fb923c",
  border: "#7f7f7f",
  input: "#2b2926",
  ring: "#3893E8",
  linkPrimary: "#3893E8",
  linkSecondary: "#7f7f7f",
} as const;

// Type for theme colors (widened to string so both light and dark satisfy it)
export type ThemeColors = { [K in keyof typeof lightColors]: string };

// Chess-specific colors (not affected by light/dark mode)
export const chessColors = {
  boardLight: "#f0d9b5",
  boardDark: "#b58863",
  boardHighlight: "#ffff00",
  boardHighlightCorrect: "#22c55e",
  boardHighlightIncorrect: "#ef4444",
} as const;

// Semantic feedback colors (not affected by light/dark mode)
export const feedbackColors = {
  success: "#22c55e",
  error: "#ef4444",
  warning: "#f59e0b",
  /** Translucent tint of `success` — for subtle highlight backgrounds. */
  successSoft: "rgba(34, 197, 94, 0.1)",
  /** Translucent tint of `error` — for subtle highlight backgrounds. */
  errorSoft: "rgba(239, 68, 68, 0.1)",
} as const;

// Board theme colors (moved from @blindfold-chess/types to keep that package type-only)
import type { BoardTheme, BoardThemeColors } from "@blindfold-chess/types";

export const boardThemeColors: Record<BoardTheme, BoardThemeColors> = {
  monotone: {
    light: "#e6e3de",
    dark: "#78716c",
    lightText: "#57534e",
    darkText: "#d6d3d1",
  },
  lichess: {
    light: "#f0d9b5",
    dark: "#b58863",
    lightText: "#b58863",
    darkText: "#f0d9b5",
  },
  chesscom: {
    light: "#eeeed2",
    dark: "#769656",
    lightText: "#769656",
    darkText: "#eeeed2",
  },
};
