import { useRouter } from "expo-router";

import { PracticeSetupScreen } from "../../../components";
import { ChallengeRulesNote } from "../../../features/challenge/ChallengeRulesNote";
import { SettingsForm } from "../../../features/route-planner/components";
import { useRoutePlannerSettings } from "../../../features/route-planner/hooks";

/** Route planner: pick the piece, then the challenge or untimed training. */
export default function RoutePlannerSetup() {
  const router = useRouter();
  const { settings, isLoaded, updateSettings } = useRoutePlannerSettings();

  return (
    <PracticeSetupScreen
      isLoaded={isLoaded}
      onStart={() =>
        router.push({
          pathname: "/practice/route-planner/session",
          params: { piece: settings.selectedPiece },
        })
      }
      onStartTraining={() =>
        router.push({
          pathname: "/practice/route-planner/training",
          params: { piece: settings.selectedPiece },
        })
      }
    >
      <SettingsForm
        selectedPiece={settings.selectedPiece}
        onChange={(selectedPiece) => updateSettings({ selectedPiece })}
      />
      <ChallengeRulesNote />
    </PracticeSetupScreen>
  );
}
