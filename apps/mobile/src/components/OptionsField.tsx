import { View, Text, StyleSheet } from "react-native";
import { useTheme, fontSize, fontWeight, spacing } from "../theme";
import { SelectableChip } from "./SelectableChip";

type OptionsFieldProps<T> = {
  label: string;
  options: readonly T[];
  /** The chosen option, compared by `===`. */
  value: T;
  onChange: (value: T) => void;
  /** How each option reads to the user. */
  formatOption: (option: T) => string;
};

/**
 * A labelled row of `SelectableChip`s — one settings question and its answers.
 *
 * @description
 * The layout every practice settings form repeats: a medium-weight label with
 * a wrapping chip row under it. `TimeLimitSettingsForm` is now this component
 * with the durations filled in, and the modules that need more than a time
 * limit (problem count, board orientation, feedback speed) compose additional
 * instances instead of re-declaring the same `StyleSheet`.
 */
export function OptionsField<T>({
  label,
  options,
  value,
  onChange,
  formatOption,
}: OptionsFieldProps<T>) {
  const { colors } = useTheme();

  return (
    <View style={styles.section}>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      <View style={styles.optionsRow}>
        {options.map((option) => (
          <SelectableChip
            key={String(option)}
            label={formatOption(option)}
            selected={option === value}
            onPress={() => onChange(option)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
});
