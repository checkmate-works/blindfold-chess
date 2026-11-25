import { View, Text, StyleSheet, Pressable } from "react-native";
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
  touchTarget,
  monoFont,
  withAlpha,
} from "../../../theme";

type AnswerOptionsProps = {
  question: AlgebraicNotationQuestion;
  selectedAnswer: string;
  answered: boolean;
  onSelect: (option: string) => void;
};

/** The web's `p-3`; a 2pt verdict border takes its extra point from here. */
const PADDING = 12;

/**
 * The answer choices, one full-width row each, as the web's: SAN in mono
 * at 18pt on the secondary fill. Once answered, the pick gets a 2pt border
 * and a 10% tint in green or red, the right answer (after a wrong pick) a
 * faint green border and 5% tint, and the rest stay as they were. The
 * padding gives up what the border adds, so the rows never shift.
 */
export function AnswerOptions({
  question,
  selectedAnswer,
  answered,
  onSelect,
}: AnswerOptionsProps) {
  const { colors, feedbackColors } = useTheme();
  const success = feedbackColors.success;
  const error = feedbackColors.error;

  const stateStyles: Record<AlgebraicNotationOptionState, ViewStyle> = {
    idle: { backgroundColor: colors.secondary, borderColor: colors.border },
    selectedCorrect: {
      backgroundColor: withAlpha(success, 0.1),
      borderColor: success,
      borderWidth: 2,
      padding: PADDING - 1,
    },
    selectedIncorrect: {
      backgroundColor: withAlpha(error, 0.1),
      borderColor: error,
      borderWidth: 2,
      padding: PADDING - 1,
    },
    revealedCorrect: {
      backgroundColor: withAlpha(success, 0.05),
      borderColor: withAlpha(success, 0.5),
    },
    dimmed: { backgroundColor: colors.secondary, borderColor: colors.border },
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
          <Pressable
            key={option}
            onPress={() => onSelect(option)}
            disabled={answered}
            accessibilityRole="button"
            accessibilityState={{
              disabled: answered,
              selected: option === selectedAnswer,
            }}
            style={({ pressed }) => [
              styles.option,
              stateStyles[state],
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.optionText, { color: colors.foreground }]}>
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // `space-y-3`.
  container: {
    gap: spacing.md - spacing.xs,
  },
  // `p-3 rounded-md`, 1pt border.
  option: {
    minHeight: touchTarget.minSize,
    justifyContent: "center",
    padding: PADDING,
    borderRadius: 6,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.8,
  },
  // `font-mono text-lg font-medium`.
  optionText: {
    fontFamily: monoFont,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
  },
});
