import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import type { RemoteChallengePort } from "@blindfold-chess/features/challenge-attempt";
import type { DiagonalQuizResult } from "@blindfold-chess/features/diagonal-quiz";
import { useDiagonalQuiz } from "@blindfold-chess/features/diagonal-quiz/client";
import {
  CHALLENGE_TIME_LIMIT,
  MISTAKE_LIMIT,
} from "@blindfold-chess/features/practice-registry";
import type { Square } from "@blindfold-chess/types";

import { PracticeSessionScreen } from "../../../../components";
import { ChallengeAttemptGate } from "../../../../features/challenge/ChallengeAttemptGate";
import { QuestionPanel } from "../../../../features/diagonal-quiz/components";
import { answerHaptics } from "../../../../lib/answer-haptics";
import { serializePracticeStatsParams } from "../../../../lib/practice-result-params";
import { spacing } from "../../../../theme";

const SETTINGS = {};

/**
 * The diagonal-quiz challenge (the web's `/diagonal-quiz/challenge`):
 * 60 seconds, ends at the mistake limit; recorded when signed in.
 */
export default function DiagonalQuizChallenge() {
  return (
    <ChallengeAttemptGate<Square> menuType="diagonal_quiz" settings={SETTINGS}>
      {(attempt) => (
        <DiagonalQuizSession
          attemptId={attempt.attemptId}
          remote={attempt.remote}
        />
      )}
    </ChallengeAttemptGate>
  );
}

function DiagonalQuizSession({
  attemptId,
  remote,
}: {
  attemptId: string | null;
  remote: RemoteChallengePort<Square> | undefined;
}) {
  const router = useRouter();
  const [result, setResult] = useState<DiagonalQuizResult | null>(null);

  const { session, input, singleDiagonal, singleAntiDiagonal } =
    useDiagonalQuiz({
      timeLimit: CHALLENGE_TIME_LIMIT,
      mistakeAllowance: MISTAKE_LIMIT,
      remote,
      disablePause: true,
      onComplete: setResult,
      onAnswerEffect: answerHaptics,
    });

  const {
    currentSquare,
    countdown,
    timeRemaining,
    correctCount,
    incorrectCount,
    showFeedback,
    awaitingServer,
    isFinished,
    isPaused,
    lastAnswer,
  } = session;

  const goToResult = useCallback(
    (completed: DiagonalQuizResult) => {
      router.replace({
        pathname: "/practice/diagonal-quiz/result",
        params: {
          ...serializePracticeStatsParams(completed),
          ...(attemptId ? { attemptId } : {}),
        },
      });
    },
    [router, attemptId],
  );

  useEffect(() => {
    if (result) goToResult(result);
  }, [result, goToResult]);

  const inputDisabled =
    isFinished ||
    countdown !== null ||
    isPaused ||
    showFeedback ||
    awaitingServer;

  // Each diagonal is graded on its own, as the web does: a half-right
  // answer shows one green field and one red.
  const shown = showFeedback ? lastAnswer : null;

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
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <QuestionPanel
          square={currentSquare}
          input={input}
          singleDiagonal={singleDiagonal}
          singleAntiDiagonal={singleAntiDiagonal}
          disabled={inputDisabled}
          diagonalResult={
            shown ? (shown.isDiagonalCorrect ? "correct" : "incorrect") : null
          }
          antiDiagonalResult={
            shown
              ? shown.isAntiDiagonalCorrect
                ? "correct"
                : "incorrect"
              : null
          }
          countdown={countdown}
        />
      </ScrollView>
    </PracticeSessionScreen>
  );
}

/**
 * Stacked from the top as the web's session is, the score right under the
 * keypad (its mt-8). The panel only scrolls on a screen too short for it;
 * it does not stretch, so the score never drops to the bottom edge.
 */
const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  body: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
});
