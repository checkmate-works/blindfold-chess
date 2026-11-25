import { Pressable, StyleSheet, Text, View } from "react-native";
import type { StyleProp, TextStyle, ViewStyle } from "react-native";

import { fontSize, fontWeight, spacing, useTheme } from "../theme";

/** One of the two answers: what it reads and how it is painted. */
export type AnswerPairOption<T> = {
  value: T;
  label: string;
  /** A sign before the label (legal moves' ○ / ×). */
  mark?: string;
  backgroundColor: string;
  /** The label's and the mark's colour. */
  textColor: string;
  /** The border while the button is not the one answered. */
  borderColor: string;
  testID?: string;
};

type AnswerPairProps<T> = {
  options: readonly [AnswerPairOption<T>, AnswerPairOption<T>];
  /** Omitted → a picture of the buttons (a setup demo): nothing to press. */
  onAnswer?: (value: T) => void;
  disabled?: boolean;
  /**
   * The answer just given and its verdict: that button takes a green or red
   * ring and keeps full strength while the other dims, until the next
   * question clears it.
   */
  selected?: { value: T; correct: boolean } | null;
  /** The row: width, the gap between the two. */
  style?: StyleProp<ViewStyle>;
  /** Each button's shape and padding. */
  buttonStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  markStyle?: StyleProp<TextStyle>;
};

/**
 * A two-way answer, side by side: square colours' light / dark, legal
 * moves' legal / illegal. The modules decide the paint and the shape; the
 * pair owns how an answer reads, so every two-way quiz answers alike: the
 * pressed button shrinks a little (the web's `active:scale-95`), the given
 * answer keeps a verdict ring at full strength while the other dims, and
 * the corners are the web's `rounded-md`.
 */
export function AnswerPair<T>({
  options,
  onAnswer,
  disabled = false,
  selected = null,
  style,
  buttonStyle,
  labelStyle,
  markStyle,
}: AnswerPairProps<T>) {
  const { feedbackColors } = useTheme();

  return (
    <View style={[styles.row, style]}>
      {options.map((option) => {
        const isSelected = selected !== null && selected.value === option.value;
        const ring =
          selected?.correct === true
            ? feedbackColors.success
            : feedbackColors.error;
        return (
          <Pressable
            key={String(option.value)}
            onPress={onAnswer ? () => onAnswer(option.value) : undefined}
            disabled={disabled || !onAnswer}
            accessibilityRole={onAnswer ? "button" : undefined}
            accessibilityLabel={option.label}
            testID={option.testID}
            style={({ pressed }) => [
              styles.button,
              buttonStyle,
              {
                backgroundColor: option.backgroundColor,
                borderColor: option.borderColor,
                opacity: disabled && !isSelected ? 0.5 : 1,
              },
              pressed && styles.pressed,
            ]}
          >
            {isSelected && (
              <View
                pointerEvents="none"
                style={[styles.ring, { borderColor: ring }]}
              />
            )}
            {option.mark !== undefined && (
              <Text
                style={[styles.mark, { color: option.textColor }, markStyle]}
              >
                {option.mark}
              </Text>
            )}
            <Text
              style={[styles.label, { color: option.textColor }, labelStyle]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.md,
    width: "100%",
    alignSelf: "center",
  },
  button: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
    // The web's `rounded-md`.
    borderRadius: 6,
    borderWidth: 1,
  },
  /**
   * The verdict ring, laid over the button's own 1pt border rather than
   * thickening it: a thicker border would grow a padded button and push
   * everything under the pair down for as long as the verdict shows.
   */
  ring: {
    position: "absolute",
    top: -1,
    left: -1,
    right: -1,
    bottom: -1,
    borderRadius: 6,
    borderWidth: 3,
  },
  pressed: {
    transform: [{ scale: 0.95 }],
  },
  // The web's `text-lg font-bold`; legal moves sets its own weight.
  label: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  // The web's `text-2xl`, in the button's `font-medium`.
  mark: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.medium,
  },
});
