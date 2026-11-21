import { useCallback, useMemo } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { RemoteChallengePort } from "@blindfold-chess/features/challenge-attempt";
import {
  LEGAL_MOVES_PIECE_SELECTIONS,
  legalMovesPiecesForSelection,
  type LegalMovesPieceSelection,
  type LegalMovesResult,
  type MoveQuestion,
} from "@blindfold-chess/features/legal-moves";
import { useLegalMovesSession } from "@blindfold-chess/features/legal-moves/client";
import {
  CHALLENGE_TIME_LIMIT,
  MISTAKE_LIMIT,
} from "@blindfold-chess/features/practice-registry";

import {
  PracticeSessionScreen,
  practiceSessionStyles,
} from "../../../../components";
import { ChallengeAttemptGate } from "../../../../features/challenge/ChallengeAttemptGate";
import {
  LegalIllegalButtons,
  QuestionCard,
} from "../../../../features/legal-moves/components";
import { answerHaptics } from "../../../../lib/answer-haptics";
import { serializePracticeStatsParams } from "../../../../lib/practice-result-params";
import { parseEnumParam } from "../../../../lib/route-params";

/**
 * The legal-moves challenge (the web's `/legal-moves/challenge`) for one
 * piece selection; recorded when signed in.
 */
export default function LegalMovesChallenge() {
  const params = useLocalSearchParams<{ piece: string }>();
  const selectedPiece = parseEnumParam<LegalMovesPieceSelection>(
    params.piece,
    LEGAL_MOVES_PIECE_SELECTIONS,
    "random",
  );
  const settings = useMemo(() => ({ selectedPiece }), [selectedPiece]);
  return (
    <ChallengeAttemptGate<MoveQuestion>
      menuType="legal_moves"
      settings={settings}
    >
      {(attempt) => (
        <LegalMovesChallengeSession
          selectedPiece={selectedPiece}
          attemptId={attempt.attemptId}
          remote={attempt.remote}
        />
      )}
    </ChallengeAttemptGate>
  );
}

function LegalMovesChallengeSession({
  selectedPiece,
  attemptId,
  remote,
}: {
  selectedPiece: LegalMovesPieceSelection;
  attemptId: string | null;
  remote: RemoteChallengePort<MoveQuestion> | undefined;
}) {
  const router = useRouter();
  // The same pieces the server generates the attempt's questions from.
  const selectedPieces = useMemo(
    () => legalMovesPiecesForSelection(selectedPiece),
    [selectedPiece],
  );

  const handleComplete = useCallback(
    (result: LegalMovesResult) => {
      router.replace({
        pathname: "/practice/legal-moves/result",
        params: {
          ...serializePracticeStatsParams(result),
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
  } = useLegalMovesSession({
    timeLimit: CHALLENGE_TIME_LIMIT,
    selectedPieces,
    mistakeAllowance: MISTAKE_LIMIT,
    remote,
    disablePause: true,
    onComplete: handleComplete,
    onAnswerEffect: answerHaptics,
  });

  const feedback: "correct" | "incorrect" | null = showFeedback
    ? lastAnswerCorrect
      ? "correct"
      : "incorrect"
    : null;

  return (
    <PracticeSessionScreen
      countdown={countdown}
      timeRemaining={timeRemaining}
      progress={timeRemaining / CHALLENGE_TIME_LIMIT}
      correctCount={correctCount}
      incorrectCount={incorrectCount}
    >
      <View style={practiceSessionStyles.questionContainer}>
        {currentQuestion && (
          <QuestionCard question={currentQuestion} feedback={feedback} />
        )}
      </View>

      <View style={practiceSessionStyles.bottomSection}>
        <LegalIllegalButtons
          onAnswer={handleAnswer}
          disabled={showFeedback || awaitingServer || !currentQuestion}
        />
      </View>
    </PracticeSessionScreen>
  );
}
