import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme, fontSize, fontWeight, spacing } from "../../../theme";
import type { BoardSymmetryProblem } from "../lib/types";

type SymmetryQuestionProps = {
  problem: BoardSymmetryProblem;
  selectedFile: string | null;
  selectedRank: string | null;
  isCorrect: boolean | null;
  correctSolution: string | null;
};

export function SymmetryQuestion({
  problem,
  selectedFile,
  selectedRank,
  isCorrect,
  correctSolution,
}: SymmetryQuestionProps) {
  const { t } = useTranslation();
  const { colors, feedbackColors } = useTheme();

  const getAnswerColor = () => {
    if (isCorrect === true) return feedbackColors.success;
    if (isCorrect === false) return feedbackColors.error;
    return colors.mutedForeground;
  };

  const getFeedbackText = () => {
    if (isCorrect === true) return t("boardSymmetry.session.correct");
    if (isCorrect === false)
      return t("boardSymmetry.session.incorrectWithSolution", {
        solution: correctSolution || "?",
      });
    return null;
  };

  const feedbackText = getFeedbackText();

  return (
    <View style={styles.container}>
      <Text style={[styles.typeLabel, { color: colors.primary }]}>
        {t(`boardSymmetry.session.types.${problem.type}`)}
      </Text>

      <View style={styles.squareRow}>
        <Text style={[styles.squareText, { color: colors.foreground }]}>
          {problem.square}
        </Text>
        <Text style={[styles.arrow, { color: colors.mutedForeground }]}>
          {"\u2192"}
        </Text>
        <Text style={[styles.squareText, { color: getAnswerColor() }]}>
          {selectedFile && selectedRank
            ? `${selectedFile}${selectedRank}`
            : "?"}
        </Text>
      </View>

      <View style={styles.feedbackContainer}>
        {feedbackText && (
          <Text style={[styles.feedbackText, { color: getAnswerColor() }]}>
            {feedbackText}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: spacing.md,
  },
  typeLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  squareRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  squareText: {
    fontSize: 48,
    fontWeight: fontWeight.bold,
    fontVariant: ["tabular-nums"],
    minWidth: 80,
    textAlign: "center",
  },
  arrow: {
    fontSize: 32,
  },
  feedbackContainer: {
    minHeight: 24,
  },
  feedbackText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
});
