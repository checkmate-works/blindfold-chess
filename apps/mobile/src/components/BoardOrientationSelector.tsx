import { Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Check } from "lucide-react-native";
import { boardThemeColors } from "@blindfold-chess/ui";
import type { BoardOrientation } from "@blindfold-chess/types";

import { useGamePreferences } from "../lib/game-preferences";
import {
  useTheme,
  borderRadius,
  fontSize,
  fontWeight,
  spacing,
} from "../theme";

const ORIENTATIONS: readonly BoardOrientation[] = ["white", "black", "random"];

const SWATCH_SIZE = 64;
const BADGE_SIZE = 22;

type BoardOrientationSelectorProps = {
  label: string;
  value: BoardOrientation;
  onChange: (orientation: BoardOrientation) => void;
  /** How each option reads under its swatch. */
  formatOption: (orientation: BoardOrientation) => string;
};

/**
 * Board orientation as three swatches in the player's board theme — a light
 * square for White, a dark one for Black, half of each for Random — the
 * web's `BoardOrientationSelector`. The chosen swatch takes the primary
 * border and grows slightly while the others fade to 60%.
 *
 * Two touches the web has no use for: a check badge on the chosen swatch,
 * as iOS's Light / Dark appearance picker marks its choice, so the choice
 * does not rest on the border colour alone; and a selection haptic when
 * the choice changes.
 */
export function BoardOrientationSelector({
  label,
  value,
  onChange,
  formatOption,
}: BoardOrientationSelectorProps) {
  const { colors } = useTheme();
  const { preferences } = useGamePreferences();
  const board = boardThemeColors[preferences.boardTheme];

  const select = (orientation: BoardOrientation) => {
    if (orientation === value) return;
    void Haptics.selectionAsync();
    onChange(orientation);
  };

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      <View style={styles.options} accessibilityRole="radiogroup">
        {ORIENTATIONS.map((orientation) => {
          const selected = orientation === value;
          const optionLabel = formatOption(orientation);
          return (
            <Pressable
              key={orientation}
              onPress={() => select(orientation)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={optionLabel}
              testID={`orientation-${orientation}`}
              style={[
                styles.option,
                selected ? styles.selected : styles.unselected,
              ]}
            >
              <View>
                <View
                  style={[
                    styles.swatch,
                    {
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor:
                        orientation === "black" ? board.dark : board.light,
                    },
                  ]}
                >
                  {orientation === "random" && (
                    <View
                      style={[styles.half, { backgroundColor: board.dark }]}
                    />
                  )}
                </View>
                {selected && (
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: colors.primary,
                        borderColor: colors.card,
                      },
                    ]}
                  >
                    <Check
                      size={13}
                      color={colors.primaryForeground}
                      strokeWidth={3.5}
                    />
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.optionLabel,
                  {
                    color: selected
                      ? colors.foreground
                      : colors.mutedForeground,
                  },
                ]}
              >
                {optionLabel}
              </Text>
            </Pressable>
          );
        })}
      </View>
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
    gap: spacing.lg,
  },
  option: {
    alignItems: "center",
    gap: spacing.sm,
  },
  selected: {
    transform: [{ scale: 1.05 }],
  },
  unselected: {
    opacity: 0.6,
  },
  swatch: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    overflow: "hidden",
    alignItems: "flex-end",
  },
  half: {
    width: "50%",
    height: "100%",
  },
  badge: {
    position: "absolute",
    top: -BADGE_SIZE / 3,
    right: -BADGE_SIZE / 3,
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  optionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
});
