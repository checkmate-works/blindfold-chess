import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";

import { PracticeSetupScreen } from "../../../../components";
import { SettingsForm } from "../../../../features/quadrants/components";
import { useQuadrantsSettings } from "../../../../features/quadrants/hooks";
import {
  QUADRANTS_MISTAKE_LIMIT,
  QUADRANTS_TIME_LIMIT,
} from "../../../../features/quadrants/lib/constants";

export default function QuadrantsSetup() {
  const { t } = useTranslation();
  const router = useRouter();
  const { settings, isLoaded, updateSettings } = useQuadrantsSettings();

  const handleStart = () => {
    router.push({
      pathname: "/(tabs)/practice/quadrants/session",
      params: { orientation: settings.orientation },
    });
  };

  return (
    <PracticeSetupScreen
      isLoaded={isLoaded}
      startLabel={t("quadrants.setup.startQuiz")}
      onStart={handleStart}
    >
      <SettingsForm
        settings={settings}
        onUpdateSettings={updateSettings}
        timeLimit={QUADRANTS_TIME_LIMIT}
        mistakeLimit={QUADRANTS_MISTAKE_LIMIT}
      />
    </PracticeSetupScreen>
  );
}
