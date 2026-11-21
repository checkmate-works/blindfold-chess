import { forwardRef } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import type { TextInputProps } from "react-native";

import {
  useTheme,
  borderRadius,
  fontSize,
  fontWeight,
  spacing,
} from "../theme";

type Props = TextInputProps & {
  label: string;
  /** Shown under the field; red when `error`. */
  hint?: string;
  error?: boolean;
};

/** A labelled text input for forms (sign-in, username, …). */
export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, hint, error = false, style, ...input },
  ref,
) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      <TextInput
        ref={ref}
        placeholderTextColor={colors.mutedForeground}
        style={[
          styles.input,
          {
            color: colors.foreground,
            backgroundColor: colors.card,
            borderColor: error ? colors.destructive : colors.border,
          },
          style,
        ]}
        {...input}
      />
      {hint ? (
        <Text
          style={[
            styles.hint,
            { color: error ? colors.destructive : colors.mutedForeground },
          ]}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs + 2,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontSize: fontSize.md,
  },
  hint: {
    fontSize: fontSize.xs + 1,
    lineHeight: 18,
  },
});
