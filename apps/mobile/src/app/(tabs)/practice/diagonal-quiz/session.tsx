import { useEffect, useCallback, useRef } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { Check, X } from "lucide-react-native";
import { getCornerInfo } from "@blindfold-chess/features/diagonal-quiz";
import { useDiagonalQuizSession } from "@blindfold-chess/features/diagonal-quiz";

import {
  QuestionCard,
  DiagonalInputFields,
  FileRankButtons,
} from "../../../../features/diagonal-quiz/components";
import { QuizTimer } from "../../../../features/coordinate-quiz/components";
import {
  useDiagonalInput,
  type ActiveField,
} from "../../../../features/diagonal-quiz/hooks";
import { useTheme, fontSize, fontWeight, spacing } from "../../../../theme";
import type { DiagonalQuizResult } from "@blindfold-chess/features/diagonal-quiz";

export default function DiagonalQuizSession() {
  const router = useRouter();
  const { colors, feedbackColors } = useTheme();
  const params = useLocalSearchParams<{
    timeLimit: string;
  }>();

  const duration = parseInt(params.timeLimit || "60", 10);

  const handleComplete = useCallback(
    (result: DiagonalQuizResult) => {
      router.replace({
        pathname: "/(tabs)/practice/diagonal-quiz/result",
        params: {
          correctAnswers: result.correctAnswers.toString(),
          incorrectAnswers: result.incorrectAnswers.toString(),
          totalQuestions: result.totalQuestions.toString(),
          accuracy: result.accuracy.toString(),
          timeTaken: result.timeTaken.toString(),
          averageTime: result.averageTime.toString(),
        },
      });
    },
    [router],
  );

  const {
    currentSquare,
    countdown,
    timeRemaining,
    correctCount,
    incorrectCount,
    lastAnswer,
    handleAnswer,
  } = useDiagonalQuizSession({
    timeLimit: duration,
    onComplete: handleComplete,
    onAnswerEffect: (correct) =>
      Haptics.notificationAsync(
        correct
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error,
      ),
  });

  const isDisabled = countdown !== null;

  const { singleDiagonal, singleAntiDiagonal } = currentSquare
    ? getCornerInfo(currentSquare)
    : { singleDiagonal: false, singleAntiDiagonal: false };

  const onBothComplete = useCallback(
    (diagonal: string, antiDiagonal: string) => {
      if (isDisabled) return;
      handleAnswer(diagonal, antiDiagonal);
    },
    [isDisabled, handleAnswer],
  );

  const {
    diagonalStartText,
    diagonalEndText,
    antiDiagonalStartText,
    antiDiagonalEndText,
    activeField,
    setActiveField,
    isDiagonalComplete,
    isAntiDiagonalComplete,
    expectingFile,
    expectingRank,
    isInputtingStart,
    isInputtingEnd,
    handleFilePress,
    handleRankPress,
    handleBackspace,
    handleClear,
    reset: resetInput,
  } = useDiagonalInput({
    onBothComplete,
    disabled: isDisabled,
    allowSingleSquareDiagonal: singleDiagonal,
    allowSingleSquareAntiDiagonal: singleAntiDiagonal,
  });

  // Reset input when question changes
  const prevSquareRef = useRef(currentSquare);
  useEffect(() => {
    if (prevSquareRef.current !== currentSquare) {
      prevSquareRef.current = currentSquare;
      resetInput();
    }
  }, [currentSquare, resetInput]);

  const handleFieldPress = (field: ActiveField) => {
    if (isDisabled) return;
    setActiveField(field);
  };

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

      {/* Main content */}
      {countdown === null && (
        <>
          {/* Timer */}
          <View style={styles.timerRow}>
            <View style={styles.spacer} />
            <QuizTimer
              timeRemaining={timeRemaining}
              progress={timeRemaining / duration}
              size={50}
            />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Question */}
            {currentSquare && (
              <QuestionCard
                square={currentSquare}
                isCorrect={lastAnswer?.correct ?? null}
                lastAnswer={lastAnswer}
              />
            )}

            {/* Input Fields */}
            <View style={styles.inputSection}>
              <DiagonalInputFields
                diagonalStartText={diagonalStartText}
                diagonalEndText={diagonalEndText}
                antiDiagonalStartText={antiDiagonalStartText}
                antiDiagonalEndText={antiDiagonalEndText}
                activeField={activeField}
                isDiagonalComplete={isDiagonalComplete}
                isAntiDiagonalComplete={isAntiDiagonalComplete}
                isInputtingStart={isInputtingStart}
                isInputtingEnd={isInputtingEnd}
                singleDiagonal={singleDiagonal}
                singleAntiDiagonal={singleAntiDiagonal}
                disabled={isDisabled}
                onFieldPress={handleFieldPress}
              />
            </View>

            {/* File/Rank Buttons */}
            <View style={styles.buttonsSection}>
              <FileRankButtons
                expectingFile={expectingFile}
                expectingRank={expectingRank}
                disabled={isDisabled}
                onFilePress={handleFilePress}
                onRankPress={handleRankPress}
                onBackspace={handleBackspace}
                onClear={handleClear}
              />
            </View>
          </ScrollView>

          {/* Score */}
          <View style={styles.footer}>
            <View style={styles.scoreItem}>
              <View style={[styles.iconContainer, styles.correctIconBg]}>
                <Check size={16} color={feedbackColors.success} />
              </View>
              <Text style={[styles.scoreValue, { color: colors.foreground }]}>
                {correctCount}
              </Text>
            </View>

            <View style={styles.scoreItem}>
              <View style={[styles.iconContainer, styles.wrongIconBg]}>
                <X size={16} color={feedbackColors.error} />
              </View>
              <Text style={[styles.scoreValue, { color: colors.foreground }]}>
                {incorrectCount}
              </Text>
            </View>
          </View>
        </>
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
    fontWeight: fontWeight.bold,
  },
  timerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  spacer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  inputSection: {
    marginTop: spacing.lg,
  },
  buttonsSection: {
    marginTop: spacing.lg,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.xxl,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  scoreItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconContainer: {
    padding: spacing.xs,
    borderRadius: 999,
  },
  correctIconBg: {
    backgroundColor: "rgba(34, 197, 94, 0.1)",
  },
  wrongIconBg: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  scoreValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    fontVariant: ["tabular-nums"],
  },
});
