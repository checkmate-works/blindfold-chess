import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/use-auth";
import {
  useTheme,
  borderRadius,
  fontSize,
  spacing,
} from "../../theme";

/**
 * Whether a challenge on this setup screen will be recorded (part of the
 * web's `StandardChallengeRules`). The rules themselves — the time limit and
 * mistake limit shared by every challenge — sit in the setup footer's hint,
 * right above the Challenge button, so they are not repeated here.
 */
export function ChallengeRulesNote() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const auth = useAuth();
  return (
    <View
      style={[
        styles.box,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.note, { color: colors.mutedForeground }]}>
        {auth.status === "signedIn"
          ? t("challenge.willRecord")
          : t("challenge.signInToRecord")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  note: {
    fontSize: fontSize.sm,
  },
});
