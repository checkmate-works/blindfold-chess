import { useCallback } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import type { RemoteChallengePort } from "@blindfold-chess/features/challenge-attempt";
import {
  CHALLENGE_TIME_LIMIT,
  MISTAKE_LIMIT,
} from "@blindfold-chess/features/practice-registry";
import type { SquareColorsResult } from "@blindfold-chess/features/square-colors";
import { useSquareColorsSession } from "@blindfold-chess/features/square-colors/client";
import type { Square } from "@blindfold-chess/types";

import {
  PracticeSessionScreen,
  practiceSessionStyles,
} from "../../../../components";
import { ChallengeAttemptGate } from "../../../../features/challenge/ChallengeAttemptGate";
import {
  ColorButtons,
  SquareQuestion,
} from "../../../../features/square-colors/components";
import { answerHaptics } from "../../../../lib/answer-haptics";
import { serializePracticeStatsParams } from "../../../../lib/practice-result-params";

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

  return (
    <PracticeSessionScreen
      countdown={countdown}
      timeRemaining={timeRemaining}
      progress={timeRemaining / CHALLENGE_TIME_LIMIT}
      correctCount={correctCount}
      incorrectCount={incorrectCount}
    >
      <View style={practiceSessionStyles.questionContainer}>
        {currentSquare && (
          <SquareQuestion
            square={currentSquare}
            isCorrect={showFeedback ? lastAnswerCorrect : null}
          />
        )}
      </View>

      <View style={practiceSessionStyles.bottomSection}>
        <ColorButtons
          onAnswer={handleAnswer}
          disabled={showFeedback || awaitingServer}
        />
      </View>
    </PracticeSessionScreen>
  );
}
