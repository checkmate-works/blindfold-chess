import { Text, StyleSheet, TouchableOpacity } from "react-native";
import {
  useTheme,
  fontSize,
  fontWeight,
  spacing,
  borderRadius,
} from "../theme";

type SelectableChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  /**
   * Glyph rendered above the label. Its presence switches the chip to the
   * taller two-line layout the piece pickers use — it is content, not a mode.
   */
  icon?: string;
};

/**
 * A tappable pill that reads as on or off.
 *
 * @description
 * Every settings screen picks from a small fixed set — durations, problem
 * counts, board orientation, feedback speed, pieces — and each had written
 * the same `TouchableOpacity` by hand: border and background swapping to
 * `primary` when selected, label swapping to `primaryForeground`. Seven
 * copies, one of which had already been pulled into a local
 * `renderOptionButton` helper in `coordinate-quiz`.
 *
 * The selected style lives here so a theme change reaches every picker at
 * once, and so a new setting is a `.map()` rather than thirty lines of
 * `StyleSheet`.
 */
export function SelectableChip({
  label,
  selected,
  onPress,
  icon,
}: SelectableChipProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.chip,
        icon !== undefined && styles.iconChip,
        {
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? colors.primary : colors.card,
        },
      ]}
    >
      {icon !== undefined && <Text style={styles.icon}>{icon}</Text>}
      <Text
        style={[
          icon !== undefined ? styles.iconChipLabel : styles.label,
          {
            color: selected ? colors.primaryForeground : colors.foreground,
          },
          icon === undefined && {
            fontWeight: selected ? fontWeight.medium : fontWeight.normal,
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  iconChip: {
    alignItems: "center",
    minWidth: 56,
  },
  label: {
    fontSize: fontSize.sm,
  },
  icon: {
    fontSize: 24,
    marginBottom: 2,
  },
  iconChipLabel: {
    fontSize: fontSize.xs,
  },
});
