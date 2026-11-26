import { Text, StyleSheet, Pressable } from "react-native";
import {
  useTheme,
  fontSize,
  fontWeight,
  borderRadius,
  controlSize,
  controlLabel,
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

/** Single-choice control with stable label weight and fill-only press feedback. */
export function SelectableChip({
  label,
  selected,
  onPress,
  icon,
}: SelectableChipProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => [
        styles.chip,
        icon !== undefined && styles.iconChip,
        {
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected
            ? pressed
              ? colors.primaryPressed
              : colors.primary
            : pressed
              ? colors.muted
              : colors.card,
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
            fontWeight: fontWeight.semibold,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    ...controlSize.sm,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: borderRadius.button,
    borderWidth: 1,
  },
  iconChip: {
    alignItems: "center",
    minWidth: 56,
  },
  label: {
    ...controlLabel,
    textAlign: "center",
  },
  icon: {
    fontSize: 24,
    marginBottom: 2,
  },
  iconChipLabel: {
    fontSize: fontSize.xs,
  },
});
