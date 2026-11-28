import { useCallback, useInsertionEffect, useMemo, useRef } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { RemoteChallengePort } from "@blindfold-chess/features/challenge-attempt";
import {
  CHALLENGE_TIME_LIMIT,
  MISTAKE_LIMIT,
} from "@blindfold-chess/features/practice-registry";
import {
  ROUTE_PLANNER_CHALLENGE_PIECES,
  type RoutePlannerAttempt,
  type RoutePlannerChallengePiece,
  type RoutePlannerProblem,
  type RoutePlannerResult,
} from "@blindfold-chess/features/route-planner";
import { useRoutePlannerSession } from "@blindfold-chess/features/route-planner/client";

import { PracticeSessionScreen } from "../../../../components";
import { ChallengeAttemptGate } from "../../../../features/challenge/ChallengeAttemptGate";
import { attemptResultParams } from "../../../../features/challenge/attempt-result-params";
import { ProblemPanel } from "../../../../features/route-planner/components";
import { buildRoutePlannerResultParams } from "../../../../features/route-planner/lib/result-params";
import { answerHaptics } from "../../../../lib/answer-haptics";
import { parseEnumParam } from "../../../../lib/route-params";
import { spacing } from "../../../../theme";

const PIECES = Object.keys(
  ROUTE_PLANNER_CHALLENGE_PIECES,
) as RoutePlannerChallengePiece[];

/**
 * The route-planner challenge (the web's `/route-planner/challenge`): routes
 * for one piece for 60 seconds, ending at the mistake limit; recorded when
 * signed in. There is no skip, as on the web.
 */
export default function RoutePlannerChallenge() {
  const params = useLocalSearchParams<{ piece: string }>();
  const selectedPiece = parseEnumParam<RoutePlannerChallengePiece>(
    params.piece,
    PIECES,
    "knight",
  );
  const settings = useMemo(() => ({ selectedPiece }), [selectedPiece]);
  return (
    <ChallengeAttemptGate<RoutePlannerProblem>
      menuType="route_planner"
      settings={settings}
    >
      {(attempt) => (
        <RoutePlannerChallengeRun
          selectedPiece={selectedPiece}
          attemptId={attempt.attemptId}
          remote={attempt.remote}
        />
      )}
    </ChallengeAttemptGate>
  );
}

function RoutePlannerChallengeRun({
  selectedPiece,
  attemptId,
  remote,
}: {
  selectedPiece: RoutePlannerChallengePiece;
  attemptId: string | null;
  remote: RemoteChallengePort<RoutePlannerProblem> | undefined;
}) {
  const router = useRouter();
  // The same piece the server generates the attempt's problems for.
  const pieces = useMemo(
    () => [ROUTE_PLANNER_CHALLENGE_PIECES[selectedPiece]],
    [selectedPiece],
  );

  // The run as of its last render, for `handleComplete`: the session calls
  // it from its completion effect, and every insertion effect of that
  // render (below) has run by then.
  const run = useRef<{
    timeElapsed: number;
    timedOutProblem: RoutePlannerProblem | null;
    remoteFailed: boolean;
  }>({ timeElapsed: 0, timedOutProblem: null, remoteFailed: false });

  const handleComplete = useCallback(
    (result: RoutePlannerResult) => {
      router.replace({
        pathname: "/practice/route-planner/result",
        params: {
          ...buildRoutePlannerResultParams(result, {
            timeElapsed: run.current.timeElapsed,
            timedOutProblem: run.current.timedOutProblem,
            timeLimit: CHALLENGE_TIME_LIMIT,
          }),
          ...attemptResultParams(attemptId, run.current.remoteFailed),
        },
      });
    },
    [router, attemptId],
  );

  const {
    currentProblem,
    countdown,
    timeElapsed,
    timeRemaining,
    finishReason,
    correctCount,
    incorrectCount,
    showFeedback,
    awaitingServer,
    lastAnswerCorrect,
    handleAnswer,
    remoteFailed,
  } = useRoutePlannerSession({
    selectedPieces: pieces,
    timeLimit: CHALLENGE_TIME_LIMIT,
    mistakeAllowance: MISTAKE_LIMIT,
    remote,
    disablePause: true,
    onComplete: handleComplete,
    onAnswerEffect: answerHaptics,
  });

  // Only the clock leaves a problem on screen unanswered (it stops during
  // the verdict), and the result lists it with its answer, as the web's.
  useInsertionEffect(() => {
    run.current = {
      timeElapsed,
      timedOutProblem: finishReason === "timeUp" ? currentProblem : null,
      remoteFailed,
    };
  });

  const disabled = showFeedback || awaitingServer || countdown !== null;

  const onSubmit = useCallback(
    (attempt: RoutePlannerAttempt) => {
      handleAnswer(attempt.success, attempt.finalMoves);
    },
    [handleAnswer],
  );

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
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <ProblemPanel
          // A new problem mounts a new panel, so its route starts empty.
          key={
            currentProblem
              ? `${currentProblem.piece}:${currentProblem.start}:${currentProblem.end}`
              : "none"
          }
          problem={currentProblem}
          verdict={showFeedback ? lastAnswerCorrect : null}
          disabled={disabled}
          countdown={countdown}
          onSubmit={onSubmit}
        />
      </ScrollView>
    </PracticeSessionScreen>
  );
}

/**
 * Stacked from the top as the web's session is: 24 under the hearts and
 * clock (its `space-y-6`), 32 above the score (its `mt-8`). The scroll
 * view takes only the panel's height, so the score sits right under it,
 * and scrolls only on a phone too short for the whole panel.
 */
const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
});
