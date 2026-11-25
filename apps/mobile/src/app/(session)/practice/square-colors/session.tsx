import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import type { RemoteChallengePort } from "@blindfold-chess/features/challenge-attempt";
import {
  CHALLENGE_TIME_LIMIT,
  MISTAKE_LIMIT,
} from "@blindfold-chess/features/practice-registry";
import type { SquareColorsResult } from "@blindfold-chess/features/square-colors";
import { useSquareColorsSession } from "@blindfold-chess/features/square-colors/client";
import type { Square } from "@blindfold-chess/types";

import { PracticeSessionScreen } from "../../../../components";
import { ChallengeAttemptGate } from "../../../../features/challenge/ChallengeAttemptGate";
import { QuestionPanel } from "../../../../features/square-colors/components";
import { answerHaptics } from "../../../../lib/answer-haptics";
import { useGamePreferences } from "../../../../lib/game-preferences";
import { serializePracticeStatsParams } from "../../../../lib/practice-result-params";
import { spacing } from "../../../../theme";
import type { SquareColor } from "../../../../features/square-colors/lib/types";

const SETTINGS = {};

/**
 * The square-colours challenge (the web's `/square-colors/challenge`): 60
 * seconds, ends at the mistake limit; recorded through the server when the
 * player is signed in.
 */
export default function SquareColorsChallenge() {
  return (
    <ChallengeAttemptGate<Square> menuType="square_colors" settings={SETTINGS}>
      {(attempt) => (
        <SquareColorsChallengeSession
          attemptId={attempt.attemptId}
          remote={attempt.remote}
        />
      )}
    </ChallengeAttemptGate>
  );
}

function SquareColorsChallengeSession({
  attemptId,
  remote,
}: {
  attemptId: string | null;
  remote: RemoteChallengePort<Square> | undefined;
}) {
  const router = useRouter();
  const { preferences } = useGamePreferences();

  const handleComplete = useCallback(
    (result: SquareColorsResult) => {
      router.replace({
        pathname: "/practice/square-colors/result",
        params: {
          ...serializePracticeStatsParams(result),
          ...(attemptId ? { attemptId } : {}),
        },
      });
    },
    [router, attemptId],
  );

  const {
    currentSquare,
    countdown,
    timeRemaining,
    correctCount,
    incorrectCount,
    showFeedback,
    awaitingServer,
    lastAnswerCorrect,
    handleAnswer,
  } = useSquareColorsSession({
    timeLimit: CHALLENGE_TIME_LIMIT,
    mistakeAllowance: MISTAKE_LIMIT,
    remote,
    disablePause: true,
    onComplete: handleComplete,
    onAnswerEffect: answerHaptics,
  });

  // The pressed button keeps its verdict ring until the next square,
  // including any wait for the server; a press meanwhile is ignored by the
  // session and must not move it. Only read while `showFeedback`.
  const [answeredColor, setAnsweredColor] = useState<SquareColor | null>(null);
  const inputDisabled = countdown !== null || showFeedback || awaitingServer;

  const onAnswer = useCallback(
    (color: SquareColor) => {
      if (inputDisabled) return;
      setAnsweredColor(color);
      handleAnswer(color);
    },
    [handleAnswer, inputDisabled],
  );

  const verdict = showFeedback ? lastAnswerCorrect : null;

  return (
    <PracticeSessionScreen
      countdown={countdown}
      timeRemaining={timeRemaining}
      progress={timeRemaining / CHALLENGE_TIME_LIMIT}
      correctCount={correctCount}
      incorrectCount={incorrectCount}
      lives={{
        remaining: Math.max(MISTAKE_LIMIT - incorrectCount, 0),
        max: MISTAKE_LIMIT,
      }}
      headerShown
      countdownInBody
    >
      <View style={styles.body}>
        <QuestionPanel
          square={currentSquare}
          verdict={verdict}
          answeredColor={answeredColor}
          onAnswer={onAnswer}
          disabled={inputDisabled}
          boardTheme={preferences.boardTheme}
          countdown={countdown}
        />
      </View>
    </PracticeSessionScreen>
  );
}

/**
 * Stacked from the top as the web's session is: 24 under the hearts and
 * clock (the web's mb-6), 32 above the score (its mt-8). Centring the
 * square would open a gap between it and the buttons on a tall phone.
 */
const styles = StyleSheet.create({
  body: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
});
