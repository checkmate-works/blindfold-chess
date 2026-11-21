import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useLocalSearchParams } from "expo-router";
import {
  evaluateAttempt,
  generateProblem,
  getShortestPathOrEmpty,
} from "@blindfold-chess/features/route-planner";
import { useRoutePlannerInput } from "@blindfold-chess/features/route-planner/client";
import type { Square } from "@blindfold-chess/types";

import { Button, PracticeTrainingScreen } from "../../../../components";
import {
  ProblemCard,
  ProblemResultCard,
  SquareInput,
} from "../../../../features/route-planner/components";
import { ROUTE_PLANNER_PIECES } from "../../../../features/route-planner/lib/types";
import type { RoutePlannerPieceType } from "../../../../features/route-planner/lib/types";
import { answerHaptics } from "../../../../lib/answer-haptics";
import { useCloseSession } from "../../../../navigation/use-close-session";
import { spacing } from "../../../../theme";

type Outcome = {
  success: boolean;
  shortestPath: Square[];
  message: string;
};

/**
 * Untimed route planner (the web's `/route-planner/training`): one problem
 * after another with the selected pieces, until the player ends it. Each
 * answer shows the shortest route before moving on, as in the session.
 */
export default function RoutePlannerTraining() {
  const { t } = useTranslation();
  const { close } = useCloseSession("/practice/route-planner");
  const params = useLocalSearchParams<{ pieces: string }>();
  const piecesParam = params.pieces ?? "";
  const pieces = useMemo(() => {
    const selected = piecesParam
      .split("")
      .filter((p): p is RoutePlannerPieceType =>
        ROUTE_PLANNER_PIECES.includes(p as RoutePlannerPieceType),
      );
    return selected.length > 0 ? selected : [...ROUTE_PLANNER_PIECES];
  }, [piecesParam]);

  const [problem, setProblem] = useState(() => generateProblem(pieces));
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);

  const {
    moves,
    selectedFile,
    handleFilePress,
    handleRankPress,
    handleUndo,
    replaceMoves,
    reset,
  } = useRoutePlannerInput({ disabled: outcome !== null });

  const record = useCallback((next: Outcome) => {
    setOutcome(next);
    answerHaptics(next.success);
    if (next.success) setCorrectCount((n) => n + 1);
    else setIncorrectCount((n) => n + 1);
  }, []);

  const handleSubmit = () => {
    const attempt = evaluateAttempt(
      problem.piece,
      problem.start,
      moves,
      problem.end,
    );
    replaceMoves(attempt.finalMoves);
    record({
      success: attempt.success,
      shortestPath: attempt.shortestPath,
      message: attempt.message,
    });
  };

  const handleSkip = () => {
    record({
      success: false,
      shortestPath: getShortestPathOrEmpty(
        problem.piece,
        problem.start,
        problem.end,
      ),
      message: "skipped",
    });
  };

  const handleNext = () => {
    setProblem(generateProblem(pieces));
    setOutcome(null);
    reset();
  };

  return (
    <PracticeTrainingScreen
      isReady
      correctCount={correctCount}
      incorrectCount={incorrectCount}
      onSkip={outcome ? undefined : handleSkip}
      onEnd={close}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {outcome ? (
          <>
            <ProblemResultCard
              success={outcome.success}
              message={outcome.message}
              shortestPath={outcome.shortestPath}
              piece={problem.piece}
              start={problem.start}
              end={problem.end}
            />
            <Button
              title={t("routePlanner.session.nextProblem")}
              onPress={handleNext}
              size="lg"
              fullWidth
            />
          </>
        ) : (
          <>
            <ProblemCard
              problem={problem}
              moves={moves}
              currentIndex={0}
              totalCount={1}
            />
            <SquareInput
              selectedFile={selectedFile}
              disabled={false}
              onFilePress={handleFilePress}
              onRankPress={handleRankPress}
            />
            <View style={styles.actionRow}>
              <Button
                title={t("routePlanner.session.undo")}
                onPress={handleUndo}
                variant="outline"
                disabled={moves.length === 0}
                style={styles.action}
              />
              <Button
                title={t("routePlanner.session.submit")}
                onPress={handleSubmit}
                disabled={moves.length === 0}
                style={styles.action}
              />
            </View>
          </>
        )}
      </ScrollView>
    </PracticeTrainingScreen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  action: {
    flex: 1,
  },
});
