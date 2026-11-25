import { useMemo } from "react";
import type { Square } from "@blindfold-chess/types";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { useTheme, fontSize, fontWeight, spacing } from "../../../theme";
import type { CoordinateQuestion } from "../lib/types";
import { ChessBoard } from "./ChessBoard";
import type { SquareHighlight } from "./ChessBoardSquare";

type TurnIndicatorProps = {
  question: CoordinateQuestion | null;
};

/**
 * "White to move" / "Black to move": which way the board is turned. A row of
 * its own directly above the board, as on the web — not in the timer row.
 */
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
  /**
   * The square the player pressed for the current question, while its result
   * is on screen; null otherwise (no answer yet, or the feedback has ended).
   */
  answeredSquare: Square | null;
  /** Whether `answeredSquare` was the target. */
  answerCorrect: boolean;
  onSquarePress: (square: Square) => void;
};

/**
 * The coordinate-quiz board, as the web's `CoordinateQuizGameBoard` draws it:
 * the coordinate-less board turned to the question's side and the target
 * square's name over it while the question is open. Once answered, the name
 * goes and the board itself shows the result: the pressed square red when
 * wrong, and the target square green either way, so a miss also teaches
 * where the square was. Shared by the timed session and the training run.
 */
export function QuizBoard({
  question,
  answeredSquare,
  answerCorrect,
  onSquarePress,
}: QuizBoardProps) {
  const { colors } = useTheme();
  const showingResult = question !== null && answeredSquare !== null;
  const highlights = useMemo(() => {
    if (!question || !answeredSquare) return {};
    // The target is written last, so a correct answer (pressed square ==
    // target) shows as the target, as on the web.
    return {
      [answeredSquare]: answerCorrect ? "correct" : "incorrect",
      [question.targetSquare]: "target",
    } as const satisfies Partial<Record<Square, SquareHighlight>>;
  }, [question, answeredSquare, answerCorrect]);

  return (
    <View style={styles.boardWrapper}>
      <ChessBoard
        orientation={question?.orientation ?? "white"}
        highlights={highlights}
        onSquarePress={onSquarePress}
        disabled={!question}
      />
      {question && !showingResult && (
        <View style={styles.overlayContainer} pointerEvents="none">
          <Text
            style={[styles.overlayText, { color: colors.primaryForeground }]}
          >
            {question.targetSquare}
          </Text>
        </View>
      )}
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
    alignSelf: "center",
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
