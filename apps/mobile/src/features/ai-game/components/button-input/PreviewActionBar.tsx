import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

import {
  fontSize,
  fontWeight,
  spacing,
  borderRadius,
  touchTarget,
  type ThemeColors,
} from "../../../../theme";

/**
 * The bottom bar of the button input: the live move preview with its Clear
 * affordance, and the Submit button (mirrors the web layout).
 */
export function PreviewActionBar({
  previewText,
  placeholder,
  hasSelections,
  onClear,
  clearLabel,
  isSubmittable,
  onSubmit,
  submitLabel,
  disabled,
  colors,
}: {
  previewText: string;
  placeholder: string;
  hasSelections: boolean;
  onClear: () => void;
  clearLabel: string;
  isSubmittable: boolean;
  onSubmit: () => void;
  submitLabel: string;
  disabled?: boolean;
  colors: ThemeColors;
}) {
  const canSubmit = isSubmittable && !disabled;
  return (
    <View style={styles.actionRow}>
      <View
        style={[
          styles.previewBar,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
      >
        <Text
          style={[
            styles.previewText,
            {
              color: previewText ? colors.foreground : colors.mutedForeground,
            },
          ]}
        >
          {previewText || placeholder}
        </Text>
        {hasSelections && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={onClear}
            disabled={disabled}
          >
            <Text
              style={[
                styles.clearButtonText,
                { color: colors.mutedForeground },
              ]}
            >
              {clearLabel}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity
        style={[
          styles.submitButton,
          {
            backgroundColor: canSubmit ? colors.primary : colors.muted,
            borderColor: canSubmit ? colors.primary : colors.border,
          },
        ]}
        onPress={onSubmit}
        disabled={!canSubmit}
      >
        <Text
          style={[
            styles.submitButtonText,
            {
              color: canSubmit
                ? colors.primaryForeground
                : colors.mutedForeground,
            },
          ]}
        >
          {submitLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  previewBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minHeight: touchTarget.minSize + spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  previewText: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    fontFamily: "monospace",
  },
  clearButton: {
    padding: spacing.sm,
  },
  clearButtonText: {
    fontSize: fontSize.sm,
  },
  submitButton: {
    minWidth: touchTarget.minSize + spacing.sm,
    minHeight: touchTarget.minSize + spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  submitButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
});
