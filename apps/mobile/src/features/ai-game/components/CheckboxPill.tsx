import { View, Text, StyleSheet, Pressable } from "react-native";
import {
  fontWeight,
  spacing,
  borderRadius,
  controlSize,
  controlLabel,
  withAlpha,
} from "../../../theme";
import type { ThemeColors } from "../../../theme";

export type CheckboxPillProps = {
  label: string;
  isChecked: boolean;
  onPress: () => void;
  disabled?: boolean;
  colors: ThemeColors;
};

export function CheckboxPill({
  label,
  isChecked,
  onPress,
  disabled,
  colors,
}: CheckboxPillProps) {
  return (
    <View style={styles.checkboxPillRow}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isChecked, disabled }}
        style={({ pressed }) => [
          styles.checkboxPill,
          {
            backgroundColor: pressed
              ? colors.muted
              : isChecked
                ? withAlpha(colors.primary, 0.1)
                : colors.card,
            borderColor: isChecked ? colors.primary : colors.border,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        <View
          style={[
            styles.checkbox,
            {
              borderColor: isChecked ? colors.primary : colors.border,
              backgroundColor: isChecked ? colors.primary : "transparent",
            },
          ]}
        >
          {isChecked && (
            <Text
              style={[styles.checkmark, { color: colors.primaryForeground }]}
            >
              {"\u2713"}
            </Text>
          )}
        </View>
        <Text
          style={[
            styles.checkboxPillLabel,
            {
              color: isChecked ? colors.primary : colors.foreground,
            },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  checkboxPillRow: {
    flexDirection: "row",
    justifyContent: "center",
  },
  checkboxPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    ...controlSize.sm,
    borderRadius: borderRadius.button,
    borderWidth: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmark: {
    fontSize: 14,
    fontWeight: fontWeight.bold,
    lineHeight: 18,
  },
  checkboxPillLabel: {
    ...controlLabel,
    flexShrink: 1,
  },
});
