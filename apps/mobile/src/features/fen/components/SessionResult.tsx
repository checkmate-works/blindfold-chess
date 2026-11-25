import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { fontSize, fontWeight, spacing, useTheme } from "../../../theme";
import type { FenResult } from "../lib/route-params";
import { ProblemResultList } from "./ProblemResultList";
import { RecreationProgress, accuracyHeading } from "./RecreationResult";

/**
 * A finished FEN or position-memory run, as the web's `PracticeComplete`
 * lays it out for both: "Accuracy: x% (a/b)" over every submitted problem,
 * the recreation progress summed over them, then the per-problem list. The
 * web's heading is a `SectionTitle` with a rule under it; here it is the
 * screen's large heading, without the rule, as the other result screens'.
 */
export function SessionResult({
  result,
  showLichess = false,
}: {
  result: FenResult;
  /** Position memory's "Analyze on Lichess" in each open problem row. */
  showLichess?: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.stack}>
      <Text
        style={[styles.heading, { color: colors.foreground }]}
        testID="result-score"
      >
        {accuracyHeading(
          t,
          result.accuracy,
          result.correct,
          result.totalPieces,
        )}
      </Text>
      <RecreationProgress
        counts={{
          correctPieces: result.correct,
          incorrectPieces: result.incorrect,
          missingPieces: result.missing,
          extraPieces: result.extra,
          totalPieces: result.totalPieces,
        }}
      />
      <ProblemResultList results={result.results} showLichess={showLichess} />
    </View>
  );
}

const styles = StyleSheet.create({
  // The web's `mb-6` between the blocks.
  stack: {
    gap: spacing.lg,
  },
  // `text-2xl font-bold`.
  heading: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
  },
});
