import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { HowToPlaySection, PracticeSetupScreen } from "../../../components";
import { HowToPlayDemo } from "../../../features/board-symmetry/components";
import { ChallengeRulesNote } from "../../../features/challenge/ChallengeRulesNote";
import { RequiredKnowledgeSection } from "../../../features/learn/RequiredKnowledgeSection";

/**
 * Board symmetry: how to play, the article it builds on, and the sign-in
 * row; the challenge has fixed rules, so there are no settings. The three
 * symmetries themselves are explained in the help sheet (the web's
 * tutorial), behind the header's ?.
 */
export default function BoardSymmetrySetup() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <PracticeSetupScreen
      isLoaded
      onStart={() => router.push("/practice/board-symmetry/session")}
      onStartTraining={() => router.push("/practice/board-symmetry/training")}
    >
      <HowToPlaySection
        title={t("moduleHelp.boardSymmetry.howToPlay.title")}
        description={t("moduleHelp.boardSymmetry.howToPlay.body")}
      >
        <HowToPlayDemo />
      </HowToPlaySection>
      <RequiredKnowledgeSection slugs={["board-symmetry"]} />
      <ChallengeRulesNote />
    </PracticeSetupScreen>
  );
}
