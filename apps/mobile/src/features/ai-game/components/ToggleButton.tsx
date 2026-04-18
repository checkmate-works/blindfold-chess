import { Text, StyleSheet, TouchableOpacity } from "react-native";
import {
  fontSize,
  fontWeight,
  spacing,
  borderRadius,
  touchTarget,
} from "../../../theme";
import type { useTheme } from "../../../theme";

export type ToggleButtonProps = {
  label: string;
  isSelected: boolean;
  onPress: () => void;
  disabled?: boolean;
  colors: ReturnType<typeof useTheme>["colors"];
  wide?: boolean;
  small?: boolean;
};

export function ToggleButton({
  label,
  isSelected,
  onPress,
  disabled,
  colors,
  wide,
  small,
}: ToggleButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.toggleButton,
        small && styles.toggleButtonSmall,
        wide && styles.toggleButtonWide,
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
