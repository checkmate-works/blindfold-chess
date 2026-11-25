import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { Square } from "@blindfold-chess/types";

import { Button } from "../../../components";
import { fontSize, fontWeight, spacing, useTheme } from "../../../theme";
import { DiagonalAnswerComparison } from "./DiagonalAnswerComparison";
import { DiagonalBoard } from "./DiagonalBoard";

type TrainingAnswerReviewProps = {
  square: Square;
  correctDiagonal: string;
  correctAntiDiagonal: string;
  /**
   * What the player entered, with whether each half was right. Absent for a
   * skipped question, which shows only the answer.
   */
  userAnswer?: {
    diagonal: string;
    antiDiagonal: string;
    isDiagonalCorrect: boolean;
    isAntiDiagonalCorrect: boolean;
  };
  onNext: () => void;
};

/**
 * The board's edge here: the web's 320 left the Next button under the
 * score on an iPhone 17, where training's Skip and End take the bottom.
 */
const BOARD_SIZE = 280;

/**
 * What diagonal-quiz training shows in place of the question after a wrong
 * or skipped answer, as the web's result views: the question title, the
 * board with both lines tinted, 24 below it the answers side by side (a
 * skip has only the correct one, as a line of text), and 24 below that the
 * Next Problem button. Training waits on that button instead of moving on,
 * so the player can study the answer.
 */
export function TrainingAnswerReview({
  square,
  correctDiagonal,
  correctAntiDiagonal,
  userAnswer,
  onNext,
}: TrainingAnswerReviewProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.foreground }]}>
        {t("diagonalQuiz.session.question", { square })}
      </Text>

      <DiagonalBoard square={square} maxSize={BOARD_SIZE} />

      <View style={styles.answer}>
        {userAnswer ? (
          <DiagonalAnswerComparison
            correctDiagonal={correctDiagonal}
            correctAntiDiagonal={correctAntiDiagonal}
            userDiagonal={userAnswer.diagonal}
            userAntiDiagonal={userAnswer.antiDiagonal}
            isDiagonalCorrect={userAnswer.isDiagonalCorrect}
            isAntiDiagonalCorrect={userAnswer.isAntiDiagonalCorrect}
          />
        ) : (
          <Text style={[styles.skipAnswer, { color: colors.mutedForeground }]}>
            {t("diagonalQuiz.session.correctAnswer", {
              diagonal: correctDiagonal,
              antiDiagonal: correctAntiDiagonal,
            })}
          </Text>
        )}
      </View>

      <Button
        title={t("diagonalQuiz.session.nextProblem")}
        icon="refresh"
        onPress={onNext}
        size="lg"
        fullWidth
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
  },
  // The web's question title: `text-base font-medium mb-4`.
  title: {
    fontSize: fontSize.md,
    lineHeight: 24,
    fontWeight: fontWeight.medium,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  // The web's `mt-6` around the answers.
  answer: {
    marginVertical: spacing.lg,
  },
  // The web's `text-sm text-muted-foreground`.
  skipAnswer: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    textAlign: "center",
  },
});
