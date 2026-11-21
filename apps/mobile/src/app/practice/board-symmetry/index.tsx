import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";

import { PracticeSetupScreen } from "../../../components";
import { ChallengeRulesNote } from "../../../features/challenge/ChallengeRulesNote";

/** The challenge (fixed rules) or untimed training. */
export default function BoardSymmetrySetup() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <PracticeSetupScreen
      isLoaded
      startLabel={t("boardSymmetry.setup.startQuiz")}
      onStart={() => router.push("/practice/board-symmetry/session")}
      onStartTraining={() => router.push("/practice/board-symmetry/training")}
    >
      <ChallengeRulesNote />
    </PracticeSetupScreen>
  );
}
