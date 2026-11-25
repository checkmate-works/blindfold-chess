import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme, fontSize, fontWeight, spacing } from "../../../theme";

type SourceSwitchProps<T extends string> = {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

/**
 * The web's problem-source toggle: a `bg-secondary` track (`rounded-lg`,
 * `p-1`) with one `rounded-md` segment per choice, the chosen one raised on
 * the card colour. Two choices only, so it stays a single row at any width.
 */
export function SourceSwitch<T extends string>({
  options,
  value,
  onChange,
}: SourceSwitchProps<T>) {
  const { colors } = useTheme();

  return (
    <View
      style={[styles.track, { backgroundColor: colors.secondary }]}
      accessibilityRole="tablist"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            testID={`source-${option.value}`}
            style={[
              styles.segment,
              selected && { backgroundColor: colors.card },
            ]}
          >
            <Text
              style={[
                styles.label,
                {
                  color: selected ? colors.foreground : colors.mutedForeground,
                },
              ]}
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
  track: {
    flexDirection: "row",
    borderRadius: 8,
    padding: spacing.xs,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 6,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
});
