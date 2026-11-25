import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { HowToPlaySection, PracticeSetupScreen } from "../../../components";
import { ChallengeRulesNote } from "../../../features/challenge/ChallengeRulesNote";
import { HowToPlayDemo } from "../../../features/diagonal-quiz/components";

/**
 * Diagonal quiz: how to play and the sign-in row, then the challenge (fixed
 * rules, so no game settings) or untimed training. The web page lists no
 * articles, so neither does this; the ? in the header keeps the web
 * tutorial's two pages on what a diagonal and an anti-diagonal are.
 */
export default function DiagonalQuizSetup() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <PracticeSetupScreen
      isLoaded
      onStart={() => router.push("/practice/diagonal-quiz/session")}
      onStartTraining={() => router.push("/practice/diagonal-quiz/training")}
    >
      <HowToPlaySection
        title={t("moduleHelp.diagonalQuiz.howToPlay.title")}
        description={t("moduleHelp.diagonalQuiz.howToPlay.body")}
      >
        <HowToPlayDemo />
      </HowToPlaySection>
      <ChallengeRulesNote />
    </PracticeSetupScreen>
  );
}
