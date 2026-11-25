import Ionicons from "@expo/vector-icons/Ionicons";
import { Alert, Pressable, StyleSheet, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";

import {
  borderRadius,
  fontSize,
  monoFont,
  spacing,
  useTheme,
} from "../../../theme";

type PgnFieldProps = {
  value: string;
  onChange: (value: string) => void;
  /** The text reads as a recall: a green check in the corner. */
  valid: boolean;
  /** The text is there but unreadable: a red border. */
  invalid: boolean;
};

/**
 * The web's `PgnInput`: a 160pt monospace box with the "valid" check and a
 * clear button in its top-right corner. Clearing asks first, since pasted
 * text cannot be got back. The web's Tab-to-complete hint is a keyboard
 * feature and is left out.
 */
export function PgnField({ value, onChange, valid, invalid }: PgnFieldProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const confirmClear = () =>
    Alert.alert(
      t("recall.pgnInput.clearConfirmTitle"),
      t("recall.pgnInput.clearConfirmMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("recall.pgnInput.clearConfirmButton"),
          style: "destructive",
          onPress: () => onChange(""),
        },
      ],
    );

  return (
    <View>
      <TextInput
        value={value}
        onChangeText={onChange}
        multiline
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        placeholder={t("recall.pgnInput.placeholder")}
        placeholderTextColor={colors.mutedForeground}
        style={[
          styles.input,
          {
            color: colors.foreground,
            borderColor: invalid ? colors.destructive : colors.border,
          },
        ]}
        testID="recall-pgn"
      />
      {value.length > 0 && (
        <View style={styles.corner}>
          {valid && (
            <View
              style={[styles.check, { backgroundColor: colors.success }]}
              testID="recall-pgn-valid"
            >
              <Ionicons name="checkmark" size={16} color="#ffffff" />
            </View>
          )}
          <Pressable
            onPress={confirmClear}
            accessibilityRole="button"
            accessibilityLabel={t("recall.pgnInput.clear")}
            hitSlop={8}
            style={styles.clear}
            testID="recall-pgn-clear"
          >
            <Ionicons name="close" size={16} color={colors.mutedForeground} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // The web's `h-40 px-4 py-3 font-mono text-base rounded-md`; the right
  // padding keeps the text clear of the corner icons.
  input: {
    height: 160,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: spacing.md,
    paddingTop: 12,
    paddingBottom: 12,
    paddingRight: 72,
    fontFamily: monoFont,
    fontSize: fontSize.md,
    textAlignVertical: "top",
  },
  corner: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  clear: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
