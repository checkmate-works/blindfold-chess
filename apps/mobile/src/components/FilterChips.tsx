import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { borderRadius, fontWeight, spacing, useTheme } from "../theme";

export type FilterChipOption = {
  readonly value: string;
  readonly label: string;
};

type FilterChipsProps = {
  readonly options: readonly FilterChipOption[];
  /** The `value` of the chip that is on. */
  readonly selected: string;
  readonly onSelect: (value: string) => void;
  /** Read out for the row as a whole ("Filter by rank"). */
  readonly accessibilityLabel: string;
  /** On the row; each chip is `<testID>-<value>`. */
  readonly testID?: string;
};

/**
 * How far each chip's touch area reaches past its drawn edge, above and
 * below. The chip is drawn 36pt tall, the size phone apps give a filter
 * chip; the slop makes the target 44pt. A horizontal `ScrollView` takes no
 * touches outside its own frame, so the row is padded by the same amount
 * and a negative margin keeps the spacing to its neighbours unchanged.
 */
const CHIP_SLOP = 4;
const CHIP_HIT_SLOP = { top: CHIP_SLOP, bottom: CHIP_SLOP } as const;

/**
 * A row of single-choice chips that narrows the list under it.
 *
 * @description
 * The phone-app filter chip: separate pill-shaped chips in one row that
 * runs to the screen's edges and scrolls sideways once it no longer fits,
 * so a long label never wraps or squeezes its neighbours. Exactly one chip
 * is on at a time, so "show everything" is a chip of its own (put it first)
 * rather than the state of no chip being on.
 *
 * The chip on is filled in `primary`; the others are a faint `background`
 * fill with a hairline and grey type, so the row reads as a set of
 * filters rather than as buttons. These are not `SelectableChip`s: those
 * are the settings screens' pickers, a full 44pt rounded rectangle on the
 * card colour, which looked like a second row of actions above the list.
 *
 * The row carries its own side inset (`spacing.md`): put it in a wrapper
 * that cancels the screen's side padding, and the first chip lines up with
 * the content below at rest while the row still scrolls under the edges.
 */
export function FilterChips({
  options,
  selected,
  onSelect,
  accessibilityLabel,
  testID,
}: FilterChipsProps) {
  const { colors } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={styles.scroll}
      contentContainerStyle={styles.content}
    >
      <View style={styles.row} accessibilityRole="radiogroup">
        {options.map((option) => {
          const on = option.value === selected;
          return (
            <Pressable
              key={option.value}
              testID={testID ? `${testID}-${option.value}` : undefined}
              onPress={() => onSelect(option.value)}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ checked: on }}
              hitSlop={CHIP_HIT_SLOP}
              style={({ pressed }) => [
                styles.chip,
                {
                  borderColor: on ? colors.primary : colors.panelBorder,
                  backgroundColor: on
                    ? pressed
                      ? colors.primaryPressed
                      : colors.primary
                    : pressed
                      ? colors.muted
                      : colors.background,
                },
              ]}
            >
              <Text
                style={[
                  styles.label,
                  {
                    color: on
                      ? colors.primaryForeground
                      : colors.mutedForeground,
                  },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
    marginVertical: -CHIP_SLOP,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingVertical: CHIP_SLOP,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  chip: {
    minHeight: 36,
    justifyContent: "center",
    borderRadius: borderRadius.full,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  label: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeight.bold,
  },
});
