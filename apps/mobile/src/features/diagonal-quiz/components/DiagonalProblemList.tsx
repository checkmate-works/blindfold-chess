import { StyleSheet, Text, View } from "react-native";
import type { DiagonalQuestionResult } from "@blindfold-chess/features/diagonal-quiz";

import { ProblemDetailsList, problemVerdict } from "../../../components";
import { fontSize, spacing, useTheme } from "../../../theme";
import { DiagonalAnswerComparison } from "./DiagonalAnswerComparison";
import { DiagonalBoard } from "./DiagonalBoard";

/**
 * The web's `DiagonalQuizProblemList` under the challenge result: each
 * question's row names the asked square and opens onto the board with both
 * lines tinted and the answers side by side. The row, the verdict and which
 * rows start open are `ProblemDetailsList`'s.
 */
export function DiagonalProblemList({
  results,
}: {
  results: readonly DiagonalQuestionResult[];
}) {
  return (
    <ProblemDetailsList
      problems={results}
      verdictOf={(result) =>
        problemVerdict({
          correct: result.isCorrect,
          timedOut: result.timedOut,
        })
      }
      renderSubtitle={(result) => <SquareLabel square={result.square} />}
      renderDetails={(result) => (
        <>
          <DiagonalBoard square={result.square} />
          <View style={styles.comparison}>
            <DiagonalAnswerComparison
              correctDiagonal={result.correctDiagonal}
              correctAntiDiagonal={result.correctAntiDiagonal}
              userDiagonal={result.userDiagonal}
              userAntiDiagonal={result.userAntiDiagonal}
              isDiagonalCorrect={result.isDiagonalCorrect}
              isAntiDiagonalCorrect={result.isAntiDiagonalCorrect}
            />
          </View>
        </>
      )}
    />
  );
}

function SquareLabel({ square }: { square: string }) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.square, { color: colors.mutedForeground }]}>
      {square}
    </Text>
  );
}

const styles = StyleSheet.create({
  // The web's `text-sm text-muted-foreground`.
  square: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  // The web's `mt-4`.
  comparison: {
    marginTop: spacing.md,
  },
});
