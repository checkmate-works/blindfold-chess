import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { Card } from "../../../components";
import { useTheme, fontSize, fontWeight, spacing } from "../../../theme";
import type { MoveQuestion } from "../lib/types";
import { pieceDisplayMap } from "../lib/types";

type QuestionCardProps = {
  question: MoveQuestion;
  feedback: "correct" | "incorrect" | null;
};

export function QuestionCard({ question, feedback }: QuestionCardProps) {
  const { t } = useTranslation();
  const { colors, feedbackColors } = useTheme();

  return (
    <Card padding="lg">
      <View style={styles.container}>
        {/* Piece icon */}
        <Text style={styles.pieceIcon}>{pieceDisplayMap[question.piece]}</Text>

        {/* Piece name */}
        <Text style={[styles.pieceName, { color: colors.mutedForeground }]}>
          {t(`legalMoves.pieces.${question.piece}`)}
        </Text>

        {/* Move squares */}
        <View style={styles.moveContainer}>
          <View
            style={[styles.squareBadge, { backgroundColor: colors.secondary }]}
          >
            <Text style={[styles.squareText, { color: colors.foreground }]}>
              {question.from}
            </Text>
          </View>
          <Text style={[styles.arrow, { color: colors.mutedForeground }]}>
            →
          </Text>
          <View
            style={[styles.squareBadge, { backgroundColor: colors.secondary }]}
          >
            <Text style={[styles.squareText, { color: colors.foreground }]}>
              {question.to}
            </Text>
          </View>
        </View>

        {/* Feedback */}
        {feedback && (
          <Text
            style={[
              styles.feedback,
              {
                color:
                  feedback === "correct"
                    ? feedbackColors.success
                    : feedbackColors.error,
              },
            ]}
          >
            {feedback === "correct"
              ? t("legalMoves.session.correct")
              : t("legalMoves.session.incorrect")}
          </Text>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  pieceIcon: {
    fontSize: 64,
    marginBottom: spacing.sm,
  },
  pieceName: {
    fontSize: fontSize.md,
    marginBottom: spacing.lg,
  },
  moveContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  squareBadge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  squareText: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
  },
  arrow: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
  },
  feedback: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.lg,
  },
});
