import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import type { ViewStyle } from "react-native";

import {
  type AlgebraicNotationOptionState,
  type AlgebraicNotationQuestion,
  getOptionState,
} from "@blindfold-chess/features/algebraic-notation";

import {
  useTheme,
  fontSize,
  fontWeight,
  spacing,
  borderRadius,
  touchTarget,
} from "../../../theme";

type AnswerOptionsProps = {
  question: AlgebraicNotationQuestion;
  selectedAnswer: string;
  answered: boolean;
  onSelect: (option: string) => void;
};

export function AnswerOptions({
  question,
  selectedAnswer,
  answered,
  onSelect,
}: AnswerOptionsProps) {
  const { colors, feedbackColors } = useTheme();

  const stateStyles: Record<AlgebraicNotationOptionState, ViewStyle> = {
    idle: { backgroundColor: colors.secondary, borderColor: colors.border },
    selectedCorrect: {
      backgroundColor: colors.secondary,
      borderColor: feedbackColors.success,
      borderWidth: 2,
    },
    selectedIncorrect: {
      backgroundColor: colors.secondary,
      borderColor: feedbackColors.error,
      borderWidth: 2,
    },
    revealedCorrect: {
      backgroundColor: colors.secondary,
      borderColor: feedbackColors.success,
    },
    dimmed: {
      backgroundColor: colors.secondary,
      borderColor: colors.border,
      opacity: 0.6,
    },
  };

  return (
    <View style={styles.container}>
      {question.options.map((option) => {
        const state = getOptionState(
          question,
          option,
          selectedAnswer,
          answered,
        );
        return (
          <TouchableOpacity
            key={option}
            onPress={() => onSelect(option)}
            disabled={answered}
            activeOpacity={0.7}
            style={[styles.option, stateStyles[state]]}
          >
            <Text style={[styles.optionText, { color: colors.foreground }]}>
              {option}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  option: {
    minHeight: touchTarget.minSize,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  optionText: {
    fontFamily: "Menlo",
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
  },
});
