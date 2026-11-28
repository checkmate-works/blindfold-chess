import { forwardRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import type { TextInputInstance, TextInputProps } from "react-native";

import {
  useTheme,
  borderRadius,
  fontWeight,
  spacing,
  touchTarget,
} from "../theme";

type Props = TextInputProps & {
  label: string;
  /** Shown under the field; red when `error`. */
  hint?: string;
  error?: boolean;
};

/**
 * A labelled text input for forms (sign-in, username, …).
 *
 * @description
 * Sizes: label 15pt weight 600; the field is padded 11 vertical / 12
 * horizontal with 16pt text and an 8pt corner; the hint is 13pt.
 *
 * The field's border is `colors.border` — a step darker than the
 * `panelBorder` around panels, so a field still reads as something to type
 * into when it sits on a white panel. While focused the border turns
 * `colors.primary`; `error` wins over focus and keeps it `destructive`, so
 * the mistake stays visible while it is being fixed. The caller's own
 * `onFocus` / `onBlur` still run, and the ref is forwarded to the
 * `TextInput`.
 */
export const TextField = forwardRef<TextInputInstance, Props>(
  function TextField(
    { label, hint, error = false, style, onFocus, onBlur, ...input },
    ref,
  ) {
    const { colors } = useTheme();
    const [focused, setFocused] = useState(false);
    const borderColor = error
      ? colors.destructive
      : focused
        ? colors.primary
        : colors.border;
    return (
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.foreground }]}>
          {label}
        </Text>
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityHint={hint}
          underlineColorAndroid="transparent"
          placeholderTextColor={colors.mutedForeground}
          style={[
            styles.input,
            {
              color: colors.foreground,
              backgroundColor: colors.card,
              borderColor,
            },
            style,
          ]}
          {...input}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
        />
        {hint ? (
          <Text
            accessibilityLiveRegion={error ? "polite" : "none"}
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
  },
);

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs + 2,
  },
  label: {
    fontSize: 15,
    fontWeight: fontWeight.semibold,
  },
  input: {
    minHeight: touchTarget.actionSize,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 16,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
  },
});
