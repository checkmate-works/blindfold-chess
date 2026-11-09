import { Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";

import { ALGEBRAIC_NOTATION_QUESTIONS } from "@blindfold-chess/features/algebraic-notation";

import { PracticeSetupScreen } from "../../../../components";
import { useTheme, fontSize, spacing } from "../../../../theme";

/**
 * The quiz has no settings: the question set is fixed and untimed, so the
 * setup screen only describes the exercise and starts it.
 */
export default function AlgebraicNotationSetup() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();

  const handleStart = () => {
    router.push("/(tabs)/practice/algebraic-notation/session");
  };

  return (
    <PracticeSetupScreen
      isLoaded
      startLabel={t("algebraicNotation.setup.start")}
      onStart={handleStart}
    >
      <Text style={[styles.description, { color: colors.foreground }]}>
        {t("algebraicNotation.setup.description")}
      </Text>
      <Text style={[styles.count, { color: colors.mutedForeground }]}>
        {t("algebraicNotation.setup.questionCount", {
          total: ALGEBRAIC_NOTATION_QUESTIONS.length,
        })}
      </Text>
    </PracticeSetupScreen>
  );
}

const styles = StyleSheet.create({
  description: {
    fontSize: fontSize.md,
    marginBottom: spacing.sm,
  },
  count: {
    fontSize: fontSize.sm,
  },
});
