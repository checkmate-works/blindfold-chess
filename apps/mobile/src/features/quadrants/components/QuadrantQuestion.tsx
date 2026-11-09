import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";

import type { QuadrantQuestion as Question } from "@blindfold-chess/features/quadrants";

import {
  useTheme,
  useFeedbackColor,
  fontSize,
  fontWeight,
  spacing,
} from "../../../theme";

type QuadrantQuestionProps = {
  question: Question;
  /** `null` while the question awaits an answer. */
  isCorrect: boolean | null;
  remainingLives: number;
  maxLives: number;
};

/**
 * The side the board is seen from, the square to place, the verdict on the
 * last answer, and the lives left before the mistake limit ends the run.
 */
export function QuadrantQuestion({
  question,
  isCorrect,
  remainingLives,
  maxLives,
}: QuadrantQuestionProps) {
  const { t } = useTranslation();
  const { colors, feedbackColors } = useTheme();
  const feedbackColor = useFeedbackColor(isCorrect);

  const feedbackText =
    isCorrect === true
      ? t("quadrants.session.correct")
      : isCorrect === false
        ? t("quadrants.session.incorrect")
        : null;

  const isWhite = question.orientation === "white";

  return (
    <View style={styles.container}>
      <Text style={[styles.lives, { color: feedbackColors.error }]}>
        {"♥".repeat(Math.max(remainingLives, 0))}
        <Text style={{ color: colors.muted }}>
          {"♥".repeat(Math.max(maxLives - remainingLives, 0))}
        </Text>
      </Text>

      <View style={styles.orientationRow}>
        <View
          style={[
            styles.orientationDot,
            {
              backgroundColor: isWhite ? "#ffffff" : "#1f2937",
              borderColor: colors.foreground,
            },
          ]}
        />
        <Text
          style={[styles.orientationText, { color: colors.mutedForeground }]}
        >
          {isWhite
            ? t("quadrants.session.whiteToMove")
            : t("quadrants.session.blackToMove")}
        </Text>
      </View>

      <Text style={[styles.question, { color: colors.foreground }]}>
        {t("quadrants.session.question", { square: question.square })}
      </Text>

      <View style={styles.feedbackContainer}>
        {feedbackText && (
          <Text style={[styles.feedbackText, { color: feedbackColor }]}>
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
    gap: spacing.sm,
  },
  lives: {
    fontSize: fontSize.lg,
    letterSpacing: 2,
  },
  orientationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  orientationDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  orientationText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  question: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    textAlign: "center",
  },
  feedbackContainer: {
    minHeight: 24,
  },
  feedbackText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
});
