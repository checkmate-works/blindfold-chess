import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";

import { PracticeSetupScreen } from "../../../../components";
import { SettingsForm } from "../../../../features/board-symmetry/components";
import { useBoardSymmetrySettings } from "../../../../features/board-symmetry/hooks";

export default function BoardSymmetrySetup() {
  const { t } = useTranslation();
  const router = useRouter();
  const { settings, isLoaded, updateSettings } = useBoardSymmetrySettings();

  const handleStart = () => {
    router.push({
      pathname: "/(tabs)/practice/board-symmetry/session",
      params: {
        timeLimit: settings.timeLimit.toString(),
      },
    });
  };

  return (
    <PracticeSetupScreen
      isLoaded={isLoaded}
      startLabel={t("boardSymmetry.setup.startQuiz")}
      onStart={handleStart}
    >
      <SettingsForm
        timeLimit={settings.timeLimit}
        onUpdateTimeLimit={(timeLimit) => updateSettings({ timeLimit })}
      />
    </PracticeSetupScreen>
  );
}
