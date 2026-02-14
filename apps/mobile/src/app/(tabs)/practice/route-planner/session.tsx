import { useCallback } from "react";
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

import { Button } from "../../../../components";
import {
  ProblemCard,
  ProblemResultCard,
  SquareInput,
} from "../../../../features/route-planner/components";
import { useRoutePlannerSession } from "../../../../features/route-planner/hooks";
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
    problem,
    moves,
    selectedFile,
    result,
    isShowingResult,
    currentProblemIndex,
    startSession,
    handleFilePress,
    handleRankPress,
    handleUndo,
    handleSubmit,
    handleSkip,
    handleNextProblem,
  } = useRoutePlannerSession({
    problemCount,
    selectedPieces: allowedPieces,
    onComplete: handleComplete,
  });

  // Auto-start session on mount
  if (!problem) {
    startSession();
    return null;
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {!isShowingResult ? (
          <>
            <ProblemCard
              problem={problem}
              moves={moves}
              currentIndex={currentProblemIndex}
              totalCount={problemCount}
            />

            <View style={styles.inputSection}>
              <SquareInput
                selectedFile={selectedFile}
                disabled={isShowingResult}
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
            {result && (
              <ProblemResultCard
                success={result.success}
                message={result.message}
                shortestPath={result.shortestPath}
                piece={problem.piece}
                start={problem.start}
                end={problem.end}
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
