import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { HowToPlaySection, PracticeSetupScreen } from "../../../components";
import { ChallengeRulesNote } from "../../../features/challenge/ChallengeRulesNote";
import { RequiredKnowledgeSection } from "../../../features/learn/RequiredKnowledgeSection";
import { HowToPlayDemo } from "../../../features/square-colors/components";

/**
 * Square colours: how to play, the article it builds on, and the sign-in
 * row; the challenge has fixed rules, so there are no settings.
 */
export default function SquareColorsSetup() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <PracticeSetupScreen
      isLoaded
      onStart={() => router.push("/practice/square-colors/session")}
      onStartTraining={() => router.push("/practice/square-colors/training")}
    >
      <HowToPlaySection
        title={t("moduleHelp.squareColors.howToPlay.title")}
        description={t("moduleHelp.squareColors.howToPlay.body")}
      >
        <HowToPlayDemo />
      </HowToPlaySection>
      <RequiredKnowledgeSection slug="square-colors" />
      <ChallengeRulesNote />
    </PracticeSetupScreen>
  );
}
