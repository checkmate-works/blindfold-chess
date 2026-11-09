import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { resolveStartingSquare } from "@blindfold-chess/features/knight-tour";

import { PracticeSetupScreen } from "../../../../components";
import { SettingsForm } from "../../../../features/knight-tour/components";
import { useKnightTourSettings } from "../../../../features/knight-tour/hooks";

export default function KnightTourSetup() {
  const { t } = useTranslation();
  const router = useRouter();
  const { settings, isLoaded, updateSettings } = useKnightTourSettings();

  const handleStart = () => {
    router.push({
      pathname: "/(tabs)/practice/knight-tour/session",
      params: {
        startingSquare: resolveStartingSquare(settings.startingSquare),
        blindfold: settings.blindfoldMode ? "1" : "0",
      },
    });
  };

  return (
    <PracticeSetupScreen
      isLoaded={isLoaded}
      startLabel={t("knightTour.setup.start")}
      onStart={handleStart}
    >
      <SettingsForm settings={settings} onUpdate={updateSettings} />
    </PracticeSetupScreen>
  );
}
