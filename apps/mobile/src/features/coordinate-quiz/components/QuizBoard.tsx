import { useMemo } from "react";
import type { Square } from "@blindfold-chess/types";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { BoardCountdown, TurnIndicator } from "../../../components";
import { useTheme } from "../../../theme";
import type { CoordinateQuestion } from "../lib/types";
import { ChessBoard } from "./ChessBoard";
import type { SquareHighlight } from "./ChessBoardSquare";

type QuizTurnIndicatorProps = {
  question: CoordinateQuestion | null;
  /** Hides the side during the countdown; see `TurnIndicator`'s `hidden`. */
  hidden?: boolean;
};

/**
 * Which way the quiz board is turned, in a row of its own directly above
 * the board, as on the web — not in the timer row. Before the first
 * question arrives it reads as Black, the side a missing orientation has
 * always fallen to here; the row is hidden or not yet shown at that point.
 */
export function QuizTurnIndicator({
  question,
  hidden = false,
}: QuizTurnIndicatorProps) {
  const { t } = useTranslation();
  const white = question?.orientation === "white";
  return (
    <TurnIndicator
      side={white ? "white" : "black"}
      label={
        white
          ? t("coordinateQuiz.session.whiteToMove")
          : t("coordinateQuiz.session.blackToMove")
      }
      hidden={hidden}
    />
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
  /**
   * Seconds left before the timed session starts, or null once it has (and
   * always in training). While set, a dark veil covers the board with the
   * count over it, as the web's countdown does; the board takes no input and
   * the target's name stays hidden.
   */
  countdown?: number | null;
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
  countdown = null,
}: QuizBoardProps) {
  const { colors } = useTheme();
  const countingDown = countdown !== null;
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
        disabled={!question || countingDown}
      />
      {question && !showingResult && !countingDown && (
        <View style={styles.overlayContainer} pointerEvents="none">
          <Text
            style={[styles.overlayText, { color: colors.primaryForeground }]}
          >
            {question.targetSquare}
          </Text>
        </View>
      )}
      <BoardCountdown countdown={countdown} />
    </View>
  );
}
const styles = StyleSheet.create({
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
