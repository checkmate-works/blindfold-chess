import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";

import { PracticeSetupScreen } from "../../../../components";
import { SettingsForm } from "../../../../features/route-planner/components";
import { useRoutePlannerSettings } from "../../../../features/route-planner/hooks";

export default function RoutePlannerSetup() {
  const { t } = useTranslation();
  const router = useRouter();
  const { settings, isLoaded, updateSettings, togglePiece } =
    useRoutePlannerSettings();

  const handleStart = () => {
    router.push({
      pathname: "/(tabs)/practice/route-planner/session",
      params: {
        problemCount: settings.problemCount.toString(),
        pieces: settings.selectedPieces.join(""),
      },
    });
  };

  return (
    <PracticeSetupScreen
      isLoaded={isLoaded}
      startLabel={t("routePlanner.setup.start")}
      onStart={handleStart}
    >
      <SettingsForm
        problemCount={settings.problemCount}
        selectedPieces={settings.selectedPieces}
        onUpdateProblemCount={(problemCount) =>
          updateSettings({ problemCount })
        }
        onTogglePiece={togglePiece}
      />
    </PracticeSetupScreen>
  );
}
