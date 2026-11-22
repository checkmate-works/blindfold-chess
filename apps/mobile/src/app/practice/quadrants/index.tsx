import { useRouter } from "expo-router";

import { PracticeSetupScreen } from "../../../components";
import { SettingsForm } from "../../../features/quadrants/components";
import { useQuadrantsSettings } from "../../../features/quadrants/hooks";

export default function QuadrantsSetup() {
  const router = useRouter();
  const { settings, isLoaded, updateSettings } = useQuadrantsSettings();

  const handleStart = () => {
    router.push({
      pathname: "/practice/quadrants/session",
      params: { orientation: settings.orientation },
    });
  };

  return (
    <PracticeSetupScreen
      isLoaded={isLoaded}
      onStart={handleStart}
      onStartTraining={() =>
        router.push({
          pathname: "/practice/quadrants/training",
          params: { orientation: settings.orientation },
        })
      }
    >
      <SettingsForm settings={settings} onUpdateSettings={updateSettings} />
    </PracticeSetupScreen>
  );
}
