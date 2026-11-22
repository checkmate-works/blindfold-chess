import { useCallback, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import type { RemoteChallengePort } from "@blindfold-chess/features/challenge-attempt";
import { useCoordinateQuizSession } from "@blindfold-chess/features/coordinate-quiz/client";
import {
  CHALLENGE_TIME_LIMIT,
  MISTAKE_LIMIT,
} from "@blindfold-chess/features/practice-registry";

import {
  CountdownOverlay,
  QuizTimer,
  ScoreFooter,
  Screen,
} from "../../../../components";
import {
  QuizBoard,
  TurnIndicator,
} from "../../../../features/coordinate-quiz/components";
import { SessionCloseButton } from "../../../../navigation/SessionCloseButton";
import { spacing } from "../../../../theme";
import { ChallengeAttemptGate } from "../../../../features/challenge/ChallengeAttemptGate";
import { BOARD_ORIENTATIONS } from "../../../../features/coordinate-quiz/lib/types";
import type {
  BoardOrientation,
  CoordinateQuestion,
  QuizResult,
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

  const feedbackValue = showFeedback
    ? lastAnswerCorrect
      ? ("correct" as const)
      : ("incorrect" as const)
    : null;

  return (
    <Screen>
      <CountdownOverlay countdown={countdown} />

      {/* Main content */}
      {countdown === null && (
        <>
          {/* Board Container with Overlay */}
          <View style={styles.boardContainer}>
            {/* Turn Indicator Row with Timer */}
            <View style={styles.turnRow}>
              <View style={styles.closeContainer}>
                <SessionCloseButton confirm />
              </View>
              <TurnIndicator question={currentQuestion} />

              <View style={styles.timerContainer}>
                <QuizTimer
                  timeRemaining={timeRemaining}
                  progress={timeRemaining / timeLimit}
                  size={50}
                />
              </View>
            </View>

            <QuizBoard
              question={currentQuestion}
              feedback={feedbackValue}
              onSquarePress={(square) => {
                if (!awaitingServer) handleAnswer(square);
              }}
            />
          </View>

          <ScoreFooter
            correctCount={correctCount}
            incorrectCount={incorrectCount}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  boardContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  turnRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
    minHeight: 50,
    position: "relative",
  },
  closeContainer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  timerContainer: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
});
