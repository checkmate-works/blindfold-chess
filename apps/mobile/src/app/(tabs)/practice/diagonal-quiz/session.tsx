import { useCallback } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useDiagonalQuiz } from "@blindfold-chess/features/diagonal-quiz/client";

import {
  PracticeSessionScreen,
  practiceSessionStyles,
} from "../../../../components";
import {
  QuestionCard,
  DiagonalInputFields,
  FileRankButtons,
} from "../../../../features/diagonal-quiz/components";
import type { ActiveField } from "../../../../features/diagonal-quiz/hooks";
import { spacing } from "../../../../theme";
import type { DiagonalQuizResult } from "@blindfold-chess/features/diagonal-quiz";

export default function DiagonalQuizSession() {
  const router = useRouter();
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
    <PracticeSessionScreen
      countdown={countdown}
      timeRemaining={timeRemaining}
      progress={timeRemaining / duration}
      correctCount={correctCount}
      incorrectCount={incorrectCount}
      // Tighter footer spacing than the other quizzes: the file/rank button
      // grid above already carries its own bottom padding.
      footerStyle={styles.footer}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={practiceSessionStyles.bottomSection}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {currentSquare && (
          <QuestionCard
            square={currentSquare}
            isCorrect={lastAnswer?.correct ?? null}
            lastAnswer={lastAnswer}
          />
        )}

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
    </PracticeSessionScreen>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  inputSection: {
    marginTop: spacing.lg,
  },
  buttonsSection: {
    marginTop: spacing.lg,
  },
  footer: {
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
});
