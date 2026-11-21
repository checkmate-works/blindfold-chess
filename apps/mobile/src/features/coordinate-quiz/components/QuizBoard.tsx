import type { Square } from "@blindfold-chess/types";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { useTheme, fontSize, fontWeight, spacing } from "../../../theme";
import type { CoordinateQuestion } from "../lib/types";
import { ChessBoard } from "./ChessBoard";
import { FeedbackOverlay } from "./FeedbackOverlay";

type TurnIndicatorProps = {
  question: CoordinateQuestion | null;
};

/** "White to move" / "Black to move": which way the board is turned. */
export function TurnIndicator({ question }: TurnIndicatorProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const white = question?.orientation === "white";
  return (
    <View style={styles.turnIndicator}>
      <View
        style={[
          styles.turnDot,
          {
            backgroundColor: white ? colors.card : colors.foreground,
            borderColor: colors.foreground,
          },
        ]}
      />
      <Text style={[styles.turnText, { color: colors.mutedForeground }]}>
        {white
          ? t("coordinateQuiz.session.whiteToMove")
          : t("coordinateQuiz.session.blackToMove")}
      </Text>
    </View>
  );
}

type QuizBoardProps = {
  question: CoordinateQuestion | null;
  feedback: "correct" | "incorrect" | null;
  onSquarePress: (square: Square) => void;
};

/**
 * The coordinate-quiz board: the coordinate-less board turned to the
 * question's side, the target square's name over it while the question is
 * open, and the correct / incorrect flash after an answer. Shared by the
 * timed session and the training run.
 */
export function QuizBoard({
  question,
  feedback,
  onSquarePress,
}: QuizBoardProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.boardWrapper}>
      <ChessBoard
        orientation={question?.orientation ?? "white"}
        targetSquare={question?.targetSquare ?? null}
        feedback={feedback}
        onSquarePress={onSquarePress}
        disabled={!question}
      />
      {question && !feedback && (
        <View style={styles.overlayContainer} pointerEvents="none">
          <Text
            style={[styles.overlayText, { color: colors.primaryForeground }]}
          >
            {question.targetSquare}
          </Text>
        </View>
      )}
      <FeedbackOverlay feedback={feedback} />
    </View>
  );
}

const styles = StyleSheet.create({
  turnIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  turnDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  turnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  boardWrapper: {
    position: "relative",
    aspectRatio: 1,
    width: "100%",
  },
  overlayContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  overlayText: {
    fontSize: 64,
    fontWeight: "900",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    elevation: 5,
  },
});
