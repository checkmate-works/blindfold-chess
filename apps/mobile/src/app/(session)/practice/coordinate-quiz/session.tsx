import { useCallback, useMemo, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import type { RemoteChallengePort } from "@blindfold-chess/features/challenge-attempt";
import { useCoordinateQuizSession } from "@blindfold-chess/features/coordinate-quiz/client";
import {
  CHALLENGE_TIME_LIMIT,
  MISTAKE_LIMIT,
} from "@blindfold-chess/features/practice-registry";

import { PracticeSessionScreen } from "../../../../components";
import {
  QuizBoard,
  TurnIndicator,
} from "../../../../features/coordinate-quiz/components";
import { spacing } from "../../../../theme";
import { ChallengeAttemptGate } from "../../../../features/challenge/ChallengeAttemptGate";
import { BOARD_ORIENTATIONS } from "../../../../features/coordinate-quiz/lib/types";
import type {
  BoardOrientation,
  CoordinateQuestion,
  QuizResult,
  Square,
} from "../../../../features/coordinate-quiz/lib/types";
import { parseEnumParam } from "../../../../lib/route-params";

/**
 * The coordinate-quiz challenge (the web's `/coordinate-quiz/challenge`) for
 * one board orientation, which is also the leaderboard key; recorded when
 * signed in.
 */
export default function CoordinateQuizChallenge() {
  const params = useLocalSearchParams<{ orientation: string }>();
  const orientation = parseEnumParam<BoardOrientation>(
    params.orientation,
    BOARD_ORIENTATIONS,
    "white",
  );
  const settings = useMemo(
    () => ({ boardOrientation: orientation }),
    [orientation],
  );
  return (
    <ChallengeAttemptGate<CoordinateQuestion>
      menuType="coordinate_quiz"
      settings={settings}
    >
      {(attempt) => (
        <CoordinateQuizSession
          orientation={orientation}
          attemptId={attempt.attemptId}
          remote={attempt.remote}
        />
      )}
    </ChallengeAttemptGate>
  );
}

function CoordinateQuizSession({
  orientation,
  attemptId,
  remote,
}: {
  orientation: BoardOrientation;
  attemptId: string | null;
  remote: RemoteChallengePort<CoordinateQuestion> | undefined;
}) {
  const router = useRouter();
  const timeLimit = CHALLENGE_TIME_LIMIT;

  const handleComplete = useCallback(
    (result: QuizResult) => {
      router.replace({
        pathname: "/practice/coordinate-quiz/result",
        params: {
          totalQuestions: result.totalQuestions.toString(),
          correctAnswers: result.correctAnswers.toString(),
          accuracy: result.accuracy.toString(),
          averageTime: result.averageTime.toString(),
          points: result.points.toString(),
          timeTaken: result.timeTaken.toString(),
          ...(attemptId ? { attemptId } : {}),
        },
      });
    },
    [router, attemptId],
  );

  const {
    currentQuestion,
    countdown,
    timeRemaining,
    correctCount,
    incorrectCount,
    showFeedback,
    awaitingServer,
    lastAnswerCorrect,
    handleAnswer,
  } = useCoordinateQuizSession({
    timeLimit,
    orientation,
    mistakeAllowance: MISTAKE_LIMIT,
    remote,
    disablePause: true,
    onComplete: handleComplete,
    onAnswerEffect: (correct) =>
      Haptics.notificationAsync(
        correct
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error,
      ),
  });

  // The pressed square keeps its colour until the next question, including
  // any wait for the server; a press meanwhile is ignored by the session and
  // must not move it. Only read while `showFeedback`, so it needs no reset.
  const [answeredSquare, setAnsweredSquare] = useState<Square | null>(null);

  const onSquarePress = useCallback(
    (square: Square) => {
      if (showFeedback || awaitingServer) return;
      setAnsweredSquare(square);
      handleAnswer(square);
    },
    [handleAnswer, showFeedback, awaitingServer],
  );

  return (
    <PracticeSessionScreen
      countdown={countdown}
      timeRemaining={timeRemaining}
      progress={timeRemaining / timeLimit}
      correctCount={correctCount}
      incorrectCount={incorrectCount}
      lives={{
        remaining: Math.max(MISTAKE_LIMIT - incorrectCount, 0),
        max: MISTAKE_LIMIT,
      }}
      headerShown
    >
      <View style={styles.body}>
        <View style={styles.turnRow}>
          <TurnIndicator question={currentQuestion} />
        </View>
        <QuizBoard
          question={currentQuestion}
          answeredSquare={showFeedback ? answeredSquare : null}
          answerCorrect={lastAnswerCorrect ?? false}
          onSquarePress={onSquarePress}
        />
      </View>
    </PracticeSessionScreen>
  );
}

/**
 * Stacked from the top with the score right under the board, as the web's
 * session lays it out. Centring the body would open a gap between the clock
 * row and the board on a tall phone.
 */
const styles = StyleSheet.create({
  body: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  turnRow: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
});
