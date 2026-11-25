import { Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { ChessPieceIcon } from "@blindfold-chess/icons";
import type { PieceType } from "@blindfold-chess/types";

import { fontSize, fontWeight, spacing, useTheme } from "../theme";

/**
 * The web's `w-10 sm:w-12`, rounded to the 44pt minimum touch target: the
 * six buttons and their gaps still fit one row on the narrowest phone.
 */
const BUTTON_SIZE = 44;
const PIECE_SIZE = 24;

type PieceSelectorProps<T extends string> = {
  label: string;
  /** In display order; the web lists K Q R B N, then random. */
  options: readonly T[];
  value: T;
  onChange: (option: T) => void;
  /** The piece an option draws; null for "any piece", drawn as "?". */
  pieceOf: (option: T) => PieceType | null;
  /** The option's name, under the row for the chosen one. */
  formatOption: (option: T) => string;
};

/**
 * Picks the piece to drill, as the web's `PieceSelector` does: one row of
 * square buttons with the white piece on each (and "?" for random), the
 * chosen one filled with the primary colour, and its name under the row.
 * Like `BoardOrientationSelector` it adds a selection haptic.
 */
export function PieceSelector<T extends string>({
  label,
  options,
  value,
  onChange,
  pieceOf,
  formatOption,
}: PieceSelectorProps<T>) {
  const { colors } = useTheme();

  const select = (option: T) => {
    if (option === value) return;
    void Haptics.selectionAsync();
    onChange(option);
  };

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      <View style={styles.options} accessibilityRole="radiogroup">
        {options.map((option) => {
          const selected = option === value;
          const piece = pieceOf(option);
          return (
            <Pressable
              key={option}
              onPress={() => select(option)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={formatOption(option)}
              testID={`piece-${option}`}
              style={[
                styles.option,
                selected
                  ? {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    }
                  : {
                      // The panel's own colour, as the web's sit on its page.
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
              ]}
            >
              {piece ? (
                <ChessPieceIcon type={piece} color="w" size={PIECE_SIZE} />
              ) : (
                <Text
                  style={[
                    styles.random,
                    {
                      color: selected
                        ? colors.primaryForeground
                        : colors.foreground,
                    },
                  ]}
                >
                  ?
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.chosen, { color: colors.mutedForeground }]}>
        {formatOption(value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  options: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
  },
  // The web's `rounded-md border`.
  option: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  random: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  // The web's `mt-2 text-xs text-muted-foreground`; the field's gap is 16.
  chosen: {
    marginTop: -spacing.sm,
    fontSize: fontSize.xs,
    textAlign: "center",
  },
});
