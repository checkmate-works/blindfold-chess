import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";

import { PracticeSetupScreen } from "../../../components";
import { ChallengeRulesNote } from "../../../features/challenge/ChallengeRulesNote";

/** Square colours: the challenge (fixed rules) or untimed training. */
export default function SquareColorsSetup() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <PracticeSetupScreen
      isLoaded
      startLabel={t("squareColors.setup.startQuiz")}
      onStart={() => router.push("/practice/square-colors/session")}
      onStartTraining={() => router.push("/practice/square-colors/training")}
    >
      <ChallengeRulesNote />
    </PracticeSetupScreen>
  );
}
