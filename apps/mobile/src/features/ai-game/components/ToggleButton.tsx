import { Text, StyleSheet, TouchableOpacity } from "react-native";
import {
  fontSize,
  fontWeight,
  spacing,
  borderRadius,
  touchTarget,
} from "../../../theme";
import type { ThemeColors } from "../../../theme";

export type ToggleButtonProps = {
  label: string;
  isSelected: boolean;
  onPress: () => void;
  disabled?: boolean;
  colors: ThemeColors;
  wide?: boolean;
  small?: boolean;
  /** Takes an equal share of its row's width (no minimum width). */
  fill?: boolean;
  testID?: string;
};

export function ToggleButton({
  label,
  isSelected,
  onPress,
  disabled,
  colors,
  wide,
  small,
  fill,
  testID,
}: ToggleButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected, disabled }}
      testID={testID}
      style={[
        styles.toggleButton,
        small && styles.toggleButtonSmall,
        wide && styles.toggleButtonWide,
        fill && styles.toggleButtonFill,
        {
          backgroundColor: isSelected ? colors.primary : colors.card,
          borderColor: isSelected ? colors.primary : colors.border,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.toggleText,
          small && styles.toggleTextSmall,
          {
            color: isSelected ? colors.primaryForeground : colors.foreground,
            fontWeight: isSelected ? fontWeight.bold : fontWeight.normal,
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  toggleButton: {
    minWidth: touchTarget.minSize,
    minHeight: touchTarget.minSize,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleButtonSmall: {
    minWidth: 36,
    minHeight: 36,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  toggleButtonFill: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 0,
  },
  toggleButtonWide: {
    paddingHorizontal: spacing.lg,
  },
  toggleText: {
    fontSize: fontSize.md,
  },
  toggleTextSmall: {
    fontSize: fontSize.sm,
  },
});
