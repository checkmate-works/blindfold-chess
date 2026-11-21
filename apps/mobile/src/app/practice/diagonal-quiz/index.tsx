import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";

import { PracticeSetupScreen } from "../../../components";
import { ChallengeRulesNote } from "../../../features/challenge/ChallengeRulesNote";

/** The challenge (fixed rules) or untimed training. */
export default function DiagonalQuizSetup() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <PracticeSetupScreen
      isLoaded
      startLabel={t("diagonalQuiz.setup.startQuiz")}
      onStart={() => router.push("/practice/diagonal-quiz/session")}
      onStartTraining={() => router.push("/practice/diagonal-quiz/training")}
    >
      <ChallengeRulesNote />
    </PracticeSetupScreen>
  );
}
