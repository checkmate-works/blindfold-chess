import { Text, StyleSheet, Pressable } from "react-native";
import {
  spacing,
  borderRadius,
  touchTarget,
  controlSize,
  controlLabel,
  useTheme,
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
  const { colors: appColors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected, disabled }}
      testID={testID}
      style={({ pressed }) => [
        styles.toggleButton,
        small && styles.toggleButtonSmall,
        wide && styles.toggleButtonWide,
        fill && styles.toggleButtonFill,
        {
          backgroundColor: isSelected
            ? pressed
              ? appColors.primaryPressed
              : colors.primary
            : pressed
              ? colors.muted
              : colors.card,
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
            fontWeight: controlLabel.fontWeight,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toggleButton: {
    minWidth: touchTarget.minSize,
    ...controlSize.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.button,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleButtonSmall: {
    minWidth: touchTarget.minSize,
    paddingHorizontal: spacing.xs,
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
    ...controlLabel,
    textAlign: "center",
  },
  toggleTextSmall: {
    fontSize: controlLabel.fontSize,
  },
});
