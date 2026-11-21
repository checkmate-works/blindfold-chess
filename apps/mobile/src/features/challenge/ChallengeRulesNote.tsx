import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/use-auth";
import {
  useTheme,
  borderRadius,
  fontSize,
  fontWeight,
  spacing,
} from "../../theme";

/**
 * The challenge rules on a setup screen (the web's `StandardChallengeRules`):
 * the fixed time limit and mistake limit shared by every challenge, and
 * whether this run will be recorded.
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
      <Text style={[styles.title, { color: colors.foreground }]}>
        {t("challenge.rules")}
      </Text>
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
    gap: spacing.xs,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  note: {
    fontSize: fontSize.sm,
  },
});
