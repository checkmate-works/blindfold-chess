import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import {
  useTheme,
  fontSize,
  fontWeight,
  spacing,
  borderRadius,
} from "../../../theme";

export type CheckboxPillProps = {
  label: string;
  isChecked: boolean;
  onPress: () => void;
  disabled?: boolean;
  colors: ReturnType<typeof useTheme>["colors"];
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
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        style={[
          styles.checkboxPill,
          {
            backgroundColor: isChecked ? colors.primary + "1A" : "transparent",
            borderColor: isChecked ? colors.primary : "transparent",
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
      </TouchableOpacity>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
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
    fontFamily: "monospace",
    fontWeight: fontWeight.bold,
    fontSize: fontSize.lg,
  },
});
