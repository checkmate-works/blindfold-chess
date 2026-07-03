import { useCallback } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { Check, X } from "lucide-react-native";
import { useDiagonalQuiz } from "@blindfold-chess/features/diagonal-quiz/client";

import {
  QuestionCard,
  DiagonalInputFields,
  FileRankButtons,
} from "../../../../features/diagonal-quiz/components";
import { QuizTimer } from "../../../../features/coordinate-quiz/components";
import type { ActiveField } from "../../../../features/diagonal-quiz/hooks";
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

  // Session + input + corner-info + reset-on-advance are composed by the
  // shared useDiagonalQuiz hook; this screen is pure rendering.
  const { session, input, isDisabled, singleDiagonal, singleAntiDiagonal } =
    useDiagonalQuiz({
      timeLimit: duration,
      onComplete: handleComplete,
      onAnswerEffect: (correct) =>
        Haptics.notificationAsync(
          correct
            ? Haptics.NotificationFeedbackType.Success
            : Haptics.NotificationFeedbackType.Error,
        ),
    });

  const {
    currentSquare,
    countdown,
    timeRemaining,
    correctCount,
    incorrectCount,
    lastAnswer,
  } = session;
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
  } = input;

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
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: feedbackColors.successSoft },
                ]}
              >
                <Check size={16} color={feedbackColors.success} />
              </View>
              <Text style={[styles.scoreValue, { color: colors.foreground }]}>
                {correctCount}
              </Text>
            </View>

            <View style={styles.scoreItem}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: feedbackColors.errorSoft },
                ]}
              >
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
  scoreValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    fontVariant: ["tabular-nums"],
  },
});
