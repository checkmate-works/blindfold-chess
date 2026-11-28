import { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { useTheme, fontSize, fontWeight, spacing } from "../theme";
import { BottomSheet } from "./BottomSheet";
import { ListRow, ListSection } from "./List";

type SelectRowProps<T> = {
  label: string;
  options: readonly T[];
  /** The chosen option, compared by `===`; null selects nothing. */
  value: T | null;
  onChange: (value: T) => void;
  formatOption: (option: T) => string;
  /**
   * What the row shows as its current value, when that should differ from
   * the option's text in the sheet: a short form of a long option, or a word
   * for "none of the options" (the row shows nothing for a null `value`
   * otherwise). A long value squeezes the row's title.
   */
  valueLabel?: string;
  /** Optional note shown above the options in the sheet. */
  description?: string;
  /**
   * A line under the row's label, for what the current value means when
   * the value alone (a level number) says little.
   */
  subtitle?: string;
  /** A line under each option in the sheet, saying what it does. */
  describeOption?: (option: T) => string;
  /** The sheet's options get `${optionTestID}-${option}`. */
  optionTestID?: string;
  testID?: string;
};

/**
 * A settings row showing a choice's current value; tapping it opens a
 * bottom sheet listing the options with a check on the chosen one, and
 * picking one closes the sheet. The pattern of the iOS Settings app's
 * detail lists and Android's single-choice dialogs, as a half-modal sheet.
 */
export function SelectRow<T>({
  label,
  options,
  value,
  onChange,
  formatOption,
  valueLabel,
  description,
  subtitle,
  describeOption,
  optionTestID,
  testID,
}: SelectRowProps<T>) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <>
      <ListRow
        title={label}
        subtitle={subtitle}
        value={valueLabel ?? (value === null ? undefined : formatOption(value))}
        onPress={() => setOpen(true)}
        testID={testID}
      />
      <BottomSheet visible={open} onClose={() => setOpen(false)} title={label}>
        {description ? (
          <Text style={[styles.description, { color: colors.mutedForeground }]}>
            {description}
          </Text>
        ) : null}
        <ListSection>
          {options.map((option) => (
            <ListRow
              key={String(option)}
              title={formatOption(option)}
              subtitle={describeOption?.(option)}
              accessory={option === value ? "check" : "none"}
              onPress={() => {
                onChange(option);
                setOpen(false);
              }}
              testID={
                optionTestID ? `${optionTestID}-${String(option)}` : undefined
              }
            />
          ))}
        </ListSection>
      </BottomSheet>
    </>
  );
}

type SwitchRowProps = {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  testID?: string;
};

/** A settings row with the platform's on/off switch at the trailing edge. */
export function SwitchRow({
  label,
  description,
  value,
  onChange,
  testID,
}: SwitchRowProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessible
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ checked: value }}
      style={({ pressed }) => [
        styles.switchRow,
        pressed && { backgroundColor: colors.muted },
      ]}
      testID={testID}
    >
      <View style={styles.switchTexts}>
        <Text style={[styles.switchLabel, { color: colors.foreground }]}>
          {label}
        </Text>
        {description ? (
          <Text
            style={[
              styles.switchDescription,
              { color: colors.mutedForeground },
            ]}
          >
            {description}
          </Text>
        ) : null}
      </View>
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Switch
          accessible={false}
          value={value}
          onValueChange={onChange}
          trackColor={{ true: colors.primary, false: colors.muted }}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  description: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    minHeight: 52,
    gap: spacing.md,
  },
  switchTexts: {
    flex: 1,
    gap: 2,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: fontWeight.medium,
  },
  switchDescription: {
    fontSize: 13,
    lineHeight: 19,
  },
});
