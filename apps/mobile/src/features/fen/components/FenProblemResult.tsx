import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import type { PositionAccuracy } from "@blindfold-chess/features/common";

import { PracticeResultCard } from "../../../components";
import { useTheme, spacing, fontSize, fontWeight } from "../../../theme";
import { FenBoard } from "./FenBoard";

type FenProblemResultProps = {
  accuracy: PositionAccuracy;
  originalFen: string;
  recreatedFen: string;
  flipped: boolean;
};

/**
 * Score of one submitted problem: accuracy with the piece counts, then the
 * original position above the player's recreation. The web places the two
 * boards side by side with per-square overlays; at phone width they are
 * stacked and drawn plain.
 */
export function FenProblemResult({
  accuracy,
  originalFen,
  recreatedFen,
  flipped,
}: FenProblemResultProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <PracticeResultCard
        scoreLabel={t("fen.problemResult.accuracy")}
        scoreValue={`${accuracy.accuracy.toFixed(1)}%`}
        statItems={[
          {
            label: t("fen.problemResult.correct"),
            value: `${accuracy.correctPieces} / ${accuracy.totalPieces}`,
            highlight: true,
          },
          {
            label: t("fen.problemResult.incorrect"),
            value: String(accuracy.incorrectPieces),
          },
          {
            label: t("fen.problemResult.missing"),
            value: String(accuracy.missingPieces),
          },
          {
            label: t("fen.problemResult.extra"),
            value: String(accuracy.extraPieces),
          },
        ]}
      />

      <Text style={[styles.boardLabel, { color: colors.foreground }]}>
        {t("fen.problemResult.original")}
      </Text>
      <FenBoard fen={originalFen} flipped={flipped} maxSize={280} />

      <Text style={[styles.boardLabel, { color: colors.foreground }]}>
        {t("fen.problemResult.yourRecreation")}
      </Text>
      <FenBoard fen={recreatedFen} flipped={flipped} maxSize={280} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  boardLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    textAlign: "center",
  },
});
