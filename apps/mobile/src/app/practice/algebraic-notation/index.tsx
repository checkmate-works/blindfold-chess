import { Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";

import { PracticeSetupScreen } from "../../../components";
import { RequiredKnowledgeSection } from "../../../features/learn/RequiredKnowledgeSection";
import { useTheme, fontSize, spacing } from "../../../theme";

/**
 * The web's free-play setup: one line on the exercise and the article it
 * builds on, with Start in the footer. The question set is fixed and
 * untimed, so there is nothing to set, no demo (the web shows none) and no
 * sign-in row (nothing is recorded).
 */
export default function AlgebraicNotationSetup() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <PracticeSetupScreen
      isLoaded
      onStart={() => router.push("/practice/algebraic-notation/session")}
    >
      <Text style={[styles.description, { color: colors.mutedForeground }]}>
        {t("algebraicNotation.setup.description")}
      </Text>
      <RequiredKnowledgeSection slugs={["algebraic-notation"]} />
    </PracticeSetupScreen>
  );
}

const styles = StyleSheet.create({
  // The web's muted paragraph at body size, aligned with the section
  // captions' inset below it.
  description: {
    fontSize: fontSize.md,
    lineHeight: 22,
    paddingHorizontal: spacing.md,
  },
});
