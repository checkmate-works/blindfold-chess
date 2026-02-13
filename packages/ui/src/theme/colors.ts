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
  border: "#cccccc",
  input: "#ffffff",
  ring: "#3893E8",
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
  border: "#3d3d3d",
  input: "#2b2926",
  ring: "#3893E8",
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
} as const;
