import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";

import { PracticeSetupScreen } from "../../../../components";
import { SettingsForm } from "../../../../features/quadrants/components";
import { useQuadrantsSettings } from "../../../../features/quadrants/hooks";
import {
  MISTAKE_LIMIT,
  CHALLENGE_TIME_LIMIT,
} from "@blindfold-chess/features/practice-registry";

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
        // The quadrant run plays by the web challenge's fixed rules — a
        // 60-second clock, over on the third mistake — so the form shows them
        // rather than offering them as settings, and the session reads the
        // same constants instead of taking them from route params.
        timeLimit={CHALLENGE_TIME_LIMIT}
        mistakeLimit={MISTAKE_LIMIT}
      />
    </PracticeSetupScreen>
  );
}
