import { useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import {
  COORDINATE_QUIZ_FEEDBACK_MS,
  checkAnswer,
  generateSingleQuestion,
} from "@blindfold-chess/features/coordinate-quiz";
import { useBatchTrainingSession } from "@blindfold-chess/features/practice-session";
import type { Square } from "@blindfold-chess/types";

import { PracticeTrainingScreen } from "../../../../components";
import {
  QuizBoard,
  TurnIndicator,
} from "../../../../features/coordinate-quiz/components";
import { BOARD_ORIENTATIONS } from "../../../../features/coordinate-quiz/lib/types";
import type {
  BoardOrientation,
  CoordinateQuestion,
} from "../../../../features/coordinate-quiz/lib/types";
import { answerHaptics } from "../../../../lib/answer-haptics";
import { parseEnumParam } from "../../../../lib/route-params";
import { useCloseSession } from "../../../../navigation/use-close-session";
import { spacing } from "../../../../theme";

const BATCH_SIZE = 100;

/** How many of the latest targets a new question avoids repeating. */
const RECENT_WINDOW = 8;

/**
 * A batch of questions in which no target repeats within the last
 * `RECENT_WINDOW` — the timed session's rule, so the drill does not ask for
 * the same square twice in a row.
 */
function generateBatch(orientation: BoardOrientation): CoordinateQuestion[] {
  const recent: Square[] = [];
  return Array.from({ length: BATCH_SIZE }, () => {
    const question = generateSingleQuestion(orientation, recent);
    recent.push(question.targetSquare);
    if (recent.length > RECENT_WINDOW) recent.shift();
    return question;
  });
}

/**
 * Untimed coordinate quiz: the session's board and target, with no clock
 * and no end other than the player's (the web's `/coordinate-quiz/training`).
 */
export default function CoordinateQuizTraining() {
  const { close } = useCloseSession("/practice/coordinate-quiz");
  const params = useLocalSearchParams<{ orientation: string }>();
  const orientation = parseEnumParam<BoardOrientation>(
    params.orientation,
    BOARD_ORIENTATIONS,
    "white",
  );

  const {
    currentQuestion,
    hasQuestions,
    showResult,
    lastAnswer,
    correctCount,
    incorrectCount,
    handleAnswer,
  } = useBatchTrainingSession<CoordinateQuestion, Square>({
    batchSize: BATCH_SIZE,
    generateBatch: () => generateBatch(orientation),
    checkAnswer: (question, square) =>
      checkAnswer(square, question.targetSquare),
    feedbackDelayMs: COORDINATE_QUIZ_FEEDBACK_MS,
  });

  const onSquarePress = useCallback(
    (square: Square) => handleAnswer(square, false, answerHaptics),
    [handleAnswer],
  );

  const feedback =
    showResult && lastAnswer
      ? lastAnswer.correct
        ? ("correct" as const)
        : ("incorrect" as const)
      : null;

  return (
    <PracticeTrainingScreen
      isReady={hasQuestions && currentQuestion !== null}
      correctCount={correctCount}
      incorrectCount={incorrectCount}
      onEnd={close}
    >
      <View style={styles.body}>
        <View style={styles.turnRow}>
          <TurnIndicator question={currentQuestion} />
        </View>
        <QuizBoard
          question={currentQuestion}
          feedback={feedback}
          onSquarePress={onSquarePress}
        />
      </View>
    </PracticeTrainingScreen>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  turnRow: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
});
