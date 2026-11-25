import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { ChessPieceIcon } from "@blindfold-chess/icons";
import type { RoutePlannerProblem } from "@blindfold-chess/features/route-planner";

import { fontSize, fontWeight, useTheme } from "../../../theme";
import { MONO_FONT } from "../lib/fonts";
import { withAlpha } from "../lib/with-alpha";

/** The web's `w-14 h-14` piece box and its 32px piece. */
const BOX_SIZE = 56;
const PIECE_SIZE = 32;

type ProblemHeaderProps = {
  problem: RoutePlannerProblem | null;
  /** The challenge's countdown, shown where the problem will appear. */
  countdown?: number | null;
};

/**
 * The problem as the web's session states it: the piece in a tinted box,
 * then "Starting Square e4 → Target Square h5". During the challenge's
 * countdown the same row holds the count instead, so nothing moves when the
 * first problem arrives.
 */
export function ProblemHeader({
  problem,
  countdown = null,
}: ProblemHeaderProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  if (countdown !== null) {
    return (
      <View style={styles.row}>
        <Text style={[styles.countdown, { color: colors.primary }]}>
          {countdown > 0 ? String(countdown) : "START!"}
        </Text>
      </View>
    );
  }
  if (!problem) return <View style={styles.row} />;

  return (
    <View style={styles.row}>
      <View
        style={[
          styles.box,
          {
            backgroundColor: withAlpha(colors.primary, 0.1),
            borderColor: withAlpha(colors.primary, 0.2),
          },
        ]}
      >
        <ChessPieceIcon type={problem.piece} color="w" size={PIECE_SIZE} />
      </View>
      <View style={styles.squares}>
        <View>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            {t("routePlanner.session.startSquare")}
          </Text>
          <Text style={[styles.square, { color: colors.foreground }]}>
            {problem.start}
          </Text>
        </View>
        <Ionicons
          name="arrow-forward"
          size={16}
          color={colors.mutedForeground}
          style={styles.arrow}
        />
        <View>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            {t("routePlanner.session.targetSquare")}
          </Text>
          <Text style={[styles.square, { color: colors.foreground }]}>
            {problem.end}
          </Text>
        </View>
      </View>
    </View>
  );
}

/**
 * The web's `flex justify-center items-center gap-6`, a `rounded-lg border`
 * box, `gap-4` between the squares, `text-sm` labels over `text-xl
 * font-mono font-bold` squares and the arrow's `pt-4`.
 */
const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    minHeight: BOX_SIZE,
  },
  box: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  squares: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  label: {
    fontSize: fontSize.sm,
  },
  square: {
    fontFamily: MONO_FONT,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  arrow: {
    paddingTop: 16,
  },
  countdown: {
    fontSize: 48,
    fontWeight: fontWeight.bold,
    fontVariant: ["tabular-nums"],
  },
});
