import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useLocalSearchParams } from "expo-router";
import {
  knightTourStateFromPath,
  summarizeKnightTour,
} from "@blindfold-chess/features/knight-tour";

import { PracticeResultScreen } from "../../../../components";
import { KnightTourBoard } from "../../../../features/knight-tour/components";
import { useTheme, spacing, fontSize, fontWeight } from "../../../../theme";

const NO_SQUARES: readonly string[] = [];

export default function KnightTourResult() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ path?: string }>();

  // Replaying the path re-validates every move, so a hand-edited deep link
  // cannot claim a tour that was never played.
  const summary = useMemo(
    () =>
      summarizeKnightTour(
        knightTourStateFromPath(params.path ? params.path.split(",") : []),
      ),
    [params.path],
  );

  return (
    <PracticeResultScreen
      title={t("knightTour.result.title")}
      playAgainLabel={t("knightTour.result.playAgain")}
      backToMenuLabel={t("knightTour.result.backToMenu")}
      setupHref="/(tabs)/practice/knight-tour/setup"
    >
      {/* No Card around the board: the board sizes itself to the screen
          width minus the screen padding, and a card's extra padding would
          push it past the edge. */}
      <View style={styles.content}>
        <Text style={[styles.score, { color: colors.foreground }]}>
          {t("knightTour.result.squaresVisited")}: {summary.visitedSquares.size}{" "}
          / 64
        </Text>

        {summary.success && (
          <View style={styles.message}>
            <Text style={[styles.successTitle, { color: colors.foreground }]}>
              {t("knightTour.result.success")}
            </Text>
            <Text
              style={[styles.successText, { color: colors.mutedForeground }]}
            >
              {summary.isClosedTour
                ? t("knightTour.result.closedTourMessage")
                : t("knightTour.result.openTourMessage")}
            </Text>
          </View>
        )}

        <KnightTourBoard
          currentSquare={summary.lastSquare}
          visitedSquares={summary.visitedSquares}
          tappableSquares={NO_SQUARES}
          showMoveNumbers
        />
      </View>
    </PracticeResultScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
  score: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    textAlign: "center",
  },
  message: {
    alignItems: "center",
    gap: spacing.xs,
  },
  successTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
  },
  successText: {
    textAlign: "center",
  },
});
