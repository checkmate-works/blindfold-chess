import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";

import { Button, Card } from "../../../components";
import { useTheme, fontSize, fontWeight, spacing } from "../../../theme";

type TrainingAnswerReviewProps = {
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
 * What diagonal-quiz training shows in place of the input after a wrong or
 * skipped answer: the right diagonals, the player's own answer beside them
 * when there was one (each half coloured by whether it was right), and a
 * Next button. Training waits on that button instead of auto-advancing, as
 * the web training screen does, so the player can study the answer.
 */
export function TrainingAnswerReview({
  correctDiagonal,
  correctAntiDiagonal,
  userAnswer,
  onNext,
}: TrainingAnswerReviewProps) {
  const { t } = useTranslation();
  const { colors, feedbackColors } = useTheme();
  const verdictColor = (correct: boolean) =>
    correct ? feedbackColors.success : feedbackColors.error;

  return (
    <View style={styles.container}>
      <Card padding="lg">
        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          {t("diagonalQuiz.session.correctAnswerLabel")}
        </Text>
        <Text style={[styles.value, { color: colors.foreground }]}>
          {t("diagonalQuiz.session.correctAnswer", {
            diagonal: correctDiagonal,
            antiDiagonal: correctAntiDiagonal,
          })}
        </Text>

        {userAnswer && (
          <>
            <Text
              style={[
                styles.label,
                styles.spaced,
                { color: colors.mutedForeground },
              ]}
            >
              {t("diagonalQuiz.session.yourAnswer")}
            </Text>
            <Text style={styles.value}>
              <Text
                style={{ color: verdictColor(userAnswer.isDiagonalCorrect) }}
              >
                {userAnswer.diagonal}
              </Text>
              <Text style={{ color: colors.mutedForeground }}>{", "}</Text>
              <Text
                style={{
                  color: verdictColor(userAnswer.isAntiDiagonalCorrect),
                }}
              >
                {userAnswer.antiDiagonal}
              </Text>
            </Text>
          </>
        )}
      </Card>

      <Button
        title={t("diagonalQuiz.session.nextProblem")}
        onPress={onNext}
        size="lg"
        fullWidth
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    textAlign: "center",
  },
  spaced: {
    marginTop: spacing.md,
  },
  value: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    textAlign: "center",
    marginTop: spacing.xs,
  },
});
