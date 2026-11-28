import { Platform } from "react-native";

export {
  lightColors,
  darkColors,
  chessColors,
  feedbackColors,
} from "@blindfold-chess/ui";
export type { ThemeColors } from "@blindfold-chess/ui";

export { surfaceColors } from "./surface";
export type { AppColors, SurfaceColors } from "./surface";

export { ThemeProvider, useTheme } from "./ThemeProvider";
export { useFeedbackColor } from "./use-feedback-color";
export { monoFont, withAlpha } from "./type-and-tint";

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  /** The corner of a full-width button. */
  button: 14,
  full: 9999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const fontWeight = {
  normal: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
};

// Board/key geometry stays compact; standalone actions follow each platform.
export const touchTarget = {
  minSize: 44,
  actionSize: Platform.OS === "android" ? 48 : 44,
} as const;

export const shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
} as const;

/** Shared action geometry. Minimum heights grow with wrapped or scaled text. */
export const controlSize = {
  sm: {
    minHeight: touchTarget.actionSize,
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  md: { minHeight: 48, paddingVertical: 13, paddingHorizontal: 24 },
  lg: { minHeight: 52, paddingVertical: 15, paddingHorizontal: 24 },
} as const;

export const controlLabel = {
  fontSize: 15,
  lineHeight: 20,
  fontWeight: fontWeight.semibold,
} as const;
