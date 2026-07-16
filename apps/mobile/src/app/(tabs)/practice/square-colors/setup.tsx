import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";

import { PracticeSetupScreen } from "../../../../components";
import { SettingsForm } from "../../../../features/square-colors/components";
import { useSquareColorsSettings } from "../../../../features/square-colors/hooks";

export default function SquareColorsSetup() {
  const { t } = useTranslation();
  const router = useRouter();
  const { settings, isLoaded, updateSettings } = useSquareColorsSettings();

  const handleStart = () => {
    router.push({
      pathname: "/(tabs)/practice/square-colors/session",
      params: {
        timeLimit: settings.timeLimit.toString(),
      },
    });
  };

  return (
    <PracticeSetupScreen
      isLoaded={isLoaded}
      startLabel={t("squareColors.setup.startQuiz")}
      onStart={handleStart}
    >
      <SettingsForm
        timeLimit={settings.timeLimit}
        onUpdateTimeLimit={(timeLimit) => updateSettings({ timeLimit })}
      />
    </PracticeSetupScreen>
  );
}
