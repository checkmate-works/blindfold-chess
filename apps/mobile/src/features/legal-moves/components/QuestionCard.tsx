import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { Card, SquarePairBadge } from "../../../components";
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
          {/* legalMoves.pieces.<PieceType>: legalMoves.pieces.b, legalMoves.pieces.n, legalMoves.pieces.r, legalMoves.pieces.q, legalMoves.pieces.k (PIECE_TYPES) */}
          {t(`legalMoves.pieces.${question.piece}`)}
        </Text>

        {/* Move squares */}
        <SquarePairBadge from={question.from} to={question.to} />

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
  feedback: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.lg,
  },
});
