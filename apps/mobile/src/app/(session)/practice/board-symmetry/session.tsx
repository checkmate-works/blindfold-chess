import { useCallback, useEffect, useInsertionEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import type { RemoteChallengePort } from "@blindfold-chess/features/challenge-attempt";
import {
  CHALLENGE_TIME_LIMIT,
  MISTAKE_LIMIT,
} from "@blindfold-chess/features/practice-registry";
import type { BoardSymmetryProblem } from "@blindfold-chess/features/board-symmetry";
import { useBoardSymmetrySession } from "@blindfold-chess/features/board-symmetry/client";

import type { BoardSymmetryResult } from "@blindfold-chess/features/board-symmetry";

import { PracticeSessionScreen } from "../../../../components";
import { QuestionPanel } from "../../../../features/board-symmetry/components";
import { ChallengeAttemptGate } from "../../../../features/challenge/ChallengeAttemptGate";
import { attemptResultParams } from "../../../../features/challenge/attempt-result-params";
import { answerHaptics } from "../../../../lib/answer-haptics";
import { serializePracticeStatsParams } from "../../../../lib/practice-result-params";
import { spacing } from "../../../../theme";

const SETTINGS = {};

/**
 * The board-symmetry challenge (the web's `/board-symmetry/challenge`):
 * 60 seconds, ends at the mistake limit; recorded when signed in.
 */
export default function BoardSymmetryChallenge() {
  return (
    <ChallengeAttemptGate<BoardSymmetryProblem>
      menuType="board_symmetry"
      settings={SETTINGS}
    >
      {(attempt) => (
        <BoardSymmetrySession
          attemptId={attempt.attemptId}
          remote={attempt.remote}
        />
      )}
    </ChallengeAttemptGate>
  );
}

function BoardSymmetrySession({
  attemptId,
  remote,
}: {
  attemptId: string | null;
  remote: RemoteChallengePort<BoardSymmetryProblem> | undefined;
}) {
  const router = useRouter();
  const duration = CHALLENGE_TIME_LIMIT;

  // Whether the run lost the server, for `handleComplete`: the session
  // calls it from its completion effect, and every insertion effect of
  // that render (below) has run by then.
  const remoteFailedRef = useRef(false);

  const handleComplete = useCallback(
    (result: BoardSymmetryResult) => {
      router.replace({
        pathname: "/practice/board-symmetry/result",
        params: {
          ...serializePracticeStatsParams(result),
          ...attemptResultParams(attemptId, remoteFailedRef.current),
        },
      });
    },
    [router, attemptId],
  );

  const {
    currentProblem,
    countdown,
    timeRemaining,
    correctCount,
    incorrectCount,
    showFeedback,
    awaitingServer,
    lastAnswerCorrect,
    selectedFile,
    selectedRank,
    correctSolution,
    handleFileToggle,
    handleRankToggle,
    handleAnswer,
    remoteFailed,
  } = useBoardSymmetrySession({
    timeLimit: duration,
    mistakeAllowance: MISTAKE_LIMIT,
    remote,
    disablePause: true,
    onComplete: handleComplete,
    onAnswerEffect: answerHaptics,
  });
  useInsertionEffect(() => {
    remoteFailedRef.current = remoteFailed;
  });

  const isCorrect = showFeedback ? lastAnswerCorrect : null;

  // Auto-submit when both file and rank are selected
  useEffect(() => {
    if (
      selectedFile &&
      selectedRank &&
      !showFeedback &&
      !awaitingServer &&
      countdown === null
    ) {
      handleAnswer(selectedFile, selectedRank);
    }
  }, [
    selectedFile,
    selectedRank,
    showFeedback,
    awaitingServer,
    countdown,
    handleAnswer,
  ]);

  return (
    <PracticeSessionScreen
      countdown={countdown}
      timeRemaining={timeRemaining}
      progress={timeRemaining / duration}
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
          problem={currentProblem}
          selectedFile={selectedFile}
          selectedRank={selectedRank}
          verdict={isCorrect}
          correctSolution={correctSolution}
          onFileToggle={handleFileToggle}
          onRankToggle={handleRankToggle}
          disabled={
            countdown !== null ||
            showFeedback ||
            awaitingServer ||
            !currentProblem
          }
          countdown={countdown}
        />
      </View>
    </PracticeSessionScreen>
  );
}

/**
 * Stacked from the top as the web's session is: 16 under the hearts and
 * clock (the web's mb-4 under its status header), 32 above the score (its
 * mt-8). Centring the question would leave the pad far below it.
 */
const styles = StyleSheet.create({
  body: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
});
