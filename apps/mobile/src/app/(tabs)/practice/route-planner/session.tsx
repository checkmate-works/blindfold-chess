import { useCallback, useState } from "react";
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
import { useRoutePlannerSession } from "@blindfold-chess/features/route-planner/client";
import {
  findShortestPath,
  validateUserPath,
} from "@blindfold-chess/features/route-planner";
import type { Square } from "@blindfold-chess/types";

import { Button } from "../../../../components";
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
import { useTheme, fontSize, spacing } from "../../../../theme";

export default function RoutePlannerSessionScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{
    problemCount: string;
    pieces: string;
  }>();

  const problemCount = parseInt(params.problemCount || "5", 10);
  const piecesParam = params.pieces || "";
  const selectedPieces: RoutePlannerPieceType[] = piecesParam
    .split("")
    .filter((p): p is RoutePlannerPieceType =>
      ROUTE_PLANNER_PIECES.includes(p as RoutePlannerPieceType),
    );
  const allowedPieces =
    selectedPieces.length > 0 ? selectedPieces : [...ROUTE_PLANNER_PIECES];

  // Per-problem input state — platform-specific, lives in component
  const [moves, setMoves] = useState<Square[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
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

  const handleFilePress = useCallback(
    (file: string) => {
      if (isDisabled) return;
      setSelectedFile((prev) => (prev === file ? null : file));
    },
    [isDisabled],
  );

  const handleRankPress = useCallback(
    (rank: string) => {
      if (isDisabled || !selectedFile) return;
      const square = `${selectedFile}${rank}` as Square;
      setMoves((prev) => [...prev, square]);
      setSelectedFile(null);
    },
    [isDisabled, selectedFile],
  );

  const handleUndo = useCallback(() => {
    if (moves.length === 0 || isDisabled) return;
    setMoves((prev) => prev.slice(0, -1));
    setSelectedFile(null);
  }, [moves.length, isDisabled]);

  const handleSubmit = useCallback(() => {
    if (!currentProblem || isDisabled) return;

    const finalMoves = [...moves];
    if (
      finalMoves.length > 0 &&
      finalMoves[finalMoves.length - 1] !== currentProblem.end
    ) {
      finalMoves.push(currentProblem.end);
    } else if (finalMoves.length === 0) {
      finalMoves.push(currentProblem.end);
    }

    const validation = validateUserPath(
      currentProblem.piece,
      currentProblem.start,
      finalMoves,
      currentProblem.end,
    );
    const shortestPath =
      (findShortestPath(
        currentProblem.piece,
        currentProblem.start,
        currentProblem.end,
      ) as Square[] | null) ?? [];

    setMoves(finalMoves);
    setProblemResult({
      success: validation.valid,
      shortestPath,
      message: validation.valid ? "correct" : "incorrect",
    });
    setIsShowingResult(true);
    handleAnswer(validation.valid);
  }, [currentProblem, moves, isDisabled, handleAnswer]);

  const handleSkip = useCallback(() => {
    if (!currentProblem || isDisabled) return;
    const shortestPath =
      (findShortestPath(
        currentProblem.piece,
        currentProblem.start,
        currentProblem.end,
      ) as Square[] | null) ?? [];
    setProblemResult({
      success: false,
      shortestPath,
      message: "skipped",
    });
    setIsShowingResult(true);
    sessionHandleSkip();
  }, [currentProblem, isDisabled, sessionHandleSkip]);

  const handleNextProblem = useCallback(() => {
    setCurrentProblemIndex((prev) => prev + 1);
    setMoves([]);
    setSelectedFile(null);
    setProblemResult(null);
    setIsShowingResult(false);
  }, []);

  if (!currentProblem) {
    return null;
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Countdown overlay */}
      {countdown !== null && (
        <View style={styles.countdownContainer}>
          <Text style={[styles.countdownText, { color: colors.primary }]}>
            {countdown > 0 ? countdown : "START!"}
          </Text>
        </View>
      )}

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
  countdownContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  countdownText: {
    fontSize: 72,
    fontWeight: "bold",
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
