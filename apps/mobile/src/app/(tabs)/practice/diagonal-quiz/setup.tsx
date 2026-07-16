import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";

import { PracticeSetupScreen } from "../../../../components";
import { SettingsForm } from "../../../../features/diagonal-quiz/components";
import { useDiagonalQuizSettings } from "../../../../features/diagonal-quiz/hooks";

export default function DiagonalQuizSetup() {
  const { t } = useTranslation();
  const router = useRouter();
  const { settings, isLoaded, updateSettings } = useDiagonalQuizSettings();

  const handleStart = () => {
    router.push({
      pathname: "/(tabs)/practice/diagonal-quiz/session",
      params: {
        timeLimit: settings.timeLimit.toString(),
      },
    });
  };

  return (
    <PracticeSetupScreen
      isLoaded={isLoaded}
      startLabel={t("diagonalQuiz.setup.startQuiz")}
      onStart={handleStart}
    >
      <SettingsForm
        timeLimit={settings.timeLimit}
        onUpdateTimeLimit={(timeLimit) => updateSettings({ timeLimit })}
      />
    </PracticeSetupScreen>
  );
}
