import { ScrollView, StyleSheet, View } from "react-native";

import { spacing } from "../theme";
import { SelectableChip } from "./SelectableChip";

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
 * A row of single-choice chips that narrows the list under it.
 *
 * @description
 * Exactly one chip is on at a time, so "show everything" is a chip of its
 * own (put it first) rather than the state of no chip being on. The chips
 * keep their natural width and the row scrolls sideways once they no
 * longer fit the screen, so a long label never wraps or squeezes its
 * neighbours. Each chip is a `SelectableChip`, so a filter looks like the
 * pickers on the settings screens.
 */
export function FilterChips({
  options,
  selected,
  onSelect,
  accessibilityLabel,
  testID,
}: FilterChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      {options.map((option) => (
        <View
          key={option.value}
          testID={testID ? `${testID}-${option.value}` : undefined}
        >
          <SelectableChip
            label={option.label}
            selected={option.value === selected}
            onPress={() => onSelect(option.value)}
          />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
});
