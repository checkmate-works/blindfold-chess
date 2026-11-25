import { StyleSheet, Text, View } from "react-native";
import type { ResolvedBoardOrientation } from "@blindfold-chess/types";

import { fontSize, fontWeight, spacing, useTheme } from "../theme";

/**
 * The web's side dot in its own Tailwind greys: white, or `gray-800`
 * (`gray-700` in dark mode), ringed in `gray-800` (`gray-600`). Neither
 * platform has a theme token for them.
 */
const WEB_DOT = {
  light: { black: "#1f2937", border: "#1f2937" },
  dark: { black: "#374151", border: "#4b5563" },
} as const;

type TurnIndicatorProps = {
  /** The side the board is seen from, which is the side to move. */
  side: ResolvedBoardOrientation;
  /**
   * The words beside the dot. Each module has its own "White to move" in
   * its i18n namespace, and they are not worded alike in every language, so
   * the module passes its own.
   */
  label: string;
  /**
   * Keeps the row's height but shows nothing — during a countdown, so a
   * random orientation is not known before the clock starts. The web blurs
   * it; React Native has no blur without another native module.
   */
  hidden?: boolean;
  /**
   * How the dot is painted. `"theme"` follows the app's theme (the card
   * colour or the foreground, ringed in the foreground), with the dot and
   * the words 4pt apart. `"web"` copies the web's greys and its `gap-2`
   * (8pt). The two modules that draw this row were ported at different
   * times and each kept its own, so the variant holds both until the look
   * is settled for every module at once.
   */
  variant?: "theme" | "web";
};

/**
 * "White to move" / "Black to move" above a board the player taps: a 20pt
 * dot in the side's colour (the web's `w-5 h-5 rounded-full border-2`) and
 * the words at 14 medium in the muted colour. It says which way the board is
 * turned, since a board without coordinates does not show it.
 */
export function TurnIndicator({
  side,
  label,
  hidden = false,
  variant = "theme",
}: TurnIndicatorProps) {
  const { colors, isDark } = useTheme();
  const white = side === "white";
  const web = WEB_DOT[isDark ? "dark" : "light"];
  const dot =
    variant === "web"
      ? {
          backgroundColor: white ? "#ffffff" : web.black,
          borderColor: web.border,
        }
      : {
          backgroundColor: white ? colors.card : colors.foreground,
          borderColor: colors.foreground,
        };

  return (
    <View
      style={[
        styles.row,
        variant === "web" ? styles.webGap : styles.themeGap,
        hidden && styles.hidden,
      ]}
    >
      <View style={[styles.dot, dot]} />
      <Text style={[styles.label, { color: colors.mutedForeground }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  themeGap: {
    gap: spacing.xs,
  },
  webGap: {
    gap: spacing.sm,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  hidden: {
    opacity: 0,
  },
});
