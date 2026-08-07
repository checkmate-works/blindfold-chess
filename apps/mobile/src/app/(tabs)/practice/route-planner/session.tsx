import { useCallback, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  useRoutePlannerInput,
  useRoutePlannerSession,
} from "@blindfold-chess/features/route-planner/client";
import {
  evaluateAttempt,
  getShortestPathOrEmpty,
} from "@blindfold-chess/features/route-planner";
import type { Square } from "@blindfold-chess/types";

import { Button, CountdownOverlay } from "../../../../components";
import {
  ProblemCard,
  ProblemResultCard,
  SquareInput,
} from "../../../../features/route-planner/components";
import { ROUTE_PLANNER_PIECES } from "../../../../features/route-planner/lib/types";
import type {
  RoutePlannerPieceType,
  RoutePlannerResult,
} from "../../../../features/route-planner/lib/types";
import { parseIntParam } from "../../../../lib/route-params";
import { useTheme, fontSize, spacing } from "../../../../theme";

export default function RoutePlannerSessionScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{
    problemCount: string;
    pieces: string;
  }>();

  const problemCount = parseIntParam(params.problemCount, {
    min: 1,
    fallback: 5,
  });
  const piecesParam = params.pieces || "";
  // Memoized: a fresh array identity every render would re-trigger any
  // downstream hook keyed on `selectedPieces`.
  const selectedPieces: RoutePlannerPieceType[] = useMemo(
    () =>
      piecesParam
        .split("")
        .filter((p): p is RoutePlannerPieceType =>
          ROUTE_PLANNER_PIECES.includes(p as RoutePlannerPieceType),
        ),
    [piecesParam],
  );
  const allowedPieces = useMemo(
    () =>
      selectedPieces.length > 0 ? selectedPieces : [...ROUTE_PLANNER_PIECES],
    [selectedPieces],
  );

  // Result-presentation state; the input state machine and the attempt
  // scoring live in @blindfold-chess/features/route-planner.
  const [isShowingResult, setIsShowingResult] = useState(false);
  const [problemResult, setProblemResult] = useState<{
    success: boolean;
    shortestPath: Square[];
    message: string;
  } | null>(null);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);

  const handleComplete = useCallback(
    (result: RoutePlannerResult) => {
      router.replace({
        pathname: "/(tabs)/practice/route-planner/result",
        params: {
          correctCount: result.correctCount.toString(),
          totalProblems: result.totalProblems.toString(),
          accuracy: result.accuracy.toString(),
        },
      });
    },
    [router],
  );

  const {
    currentProblem,
    countdown,
    handleAnswer,
    handleSkip: sessionHandleSkip,
  } = useRoutePlannerSession({
    selectedPieces: allowedPieces,
    timeLimit: problemCount * 60,
    problemCount,
    onComplete: handleComplete,
    onAnswerEffect: (correct) =>
      Haptics.notificationAsync(
        correct
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error,
      ),
    onSkipEffect: () =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  });

  const isDisabled = isShowingResult || countdown !== null;

  const {
    moves,
    selectedFile,
    handleFilePress,
    handleRankPress,
    handleUndo,
    replaceMoves,
    reset: resetInput,
  } = useRoutePlannerInput({ disabled: isDisabled });

  const handleSubmit = useCallback(() => {
    if (!currentProblem || isDisabled) return;

    const attempt = evaluateAttempt(
      currentProblem.piece,
      currentProblem.start,
      moves,
      currentProblem.end,
    );

    replaceMoves(attempt.finalMoves);
    setProblemResult({
      success: attempt.success,
      shortestPath: attempt.shortestPath,
      message: attempt.message,
    });
    setIsShowingResult(true);
    handleAnswer(attempt.success, attempt.finalMoves);
  }, [currentProblem, moves, isDisabled, handleAnswer, replaceMoves]);

  const handleSkip = useCallback(() => {
    if (!currentProblem || isDisabled) return;
    setProblemResult({
      success: false,
      shortestPath: getShortestPathOrEmpty(
        currentProblem.piece,
        currentProblem.start,
        currentProblem.end,
      ),
      message: "skipped",
    });
    setIsShowingResult(true);
    sessionHandleSkip();
  }, [currentProblem, isDisabled, sessionHandleSkip]);

  const handleNextProblem = useCallback(() => {
    setCurrentProblemIndex((prev) => prev + 1);
    resetInput();
    setProblemResult(null);
    setIsShowingResult(false);
  }, [resetInput]);

  if (!currentProblem) {
    return null;
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <CountdownOverlay countdown={countdown} />

      {countdown === null && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {!isShowingResult ? (
            <>
              <ProblemCard
                problem={currentProblem}
                moves={moves}
                currentIndex={currentProblemIndex}
                totalCount={problemCount}
              />

              <View style={styles.inputSection}>
                <SquareInput
                  selectedFile={selectedFile}
                  disabled={isDisabled}
                  onFilePress={handleFilePress}
                  onRankPress={handleRankPress}
                />
              </View>

              <View style={styles.actionsSection}>
                <View style={styles.actionRow}>
                  <Button
                    title={t("routePlanner.session.undo")}
                    onPress={handleUndo}
                    variant="outline"
                    size="md"
                    disabled={moves.length === 0}
                    style={styles.actionButton}
                  />
                  <Button
                    title={t("routePlanner.session.submit")}
                    onPress={handleSubmit}
                    size="md"
                    style={styles.actionButton}
                  />
                </View>
                <TouchableOpacity onPress={handleSkip}>
                  <Text
                    style={[styles.skipText, { color: colors.mutedForeground }]}
                  >
                    {t("routePlanner.session.skip")}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {problemResult && (
                <ProblemResultCard
                  success={problemResult.success}
                  message={problemResult.message}
                  shortestPath={problemResult.shortestPath}
                  piece={currentProblem.piece}
                  start={currentProblem.start}
                  end={currentProblem.end}
                />
              )}

              <View style={styles.nextSection}>
                <Button
                  title={
                    currentProblemIndex < problemCount - 1
                      ? t("routePlanner.session.nextProblem")
                      : t("routePlanner.session.finish")
                  }
                  onPress={handleNextProblem}
                  size="lg"
                  fullWidth
                />
              </View>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  inputSection: {
    marginTop: spacing.lg,
  },
  actionsSection: {
    marginTop: spacing.lg,
    alignItems: "center",
    gap: spacing.md,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    width: "100%",
  },
  actionButton: {
    flex: 1,
  },
  skipText: {
    fontSize: fontSize.sm,
    textDecorationLine: "underline",
  },
  nextSection: {
    marginTop: spacing.lg,
  },
});
