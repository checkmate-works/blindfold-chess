import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";

import { PracticeSetupScreen } from "../../../../components";
import { SettingsForm } from "../../../../features/ai-game/components";
import { useGameSettings } from "../../../../features/ai-game/hooks";

export default function AiGameSetup() {
  const { t } = useTranslation();
  const router = useRouter();
  const { settings, isLoaded, updateSettings } = useGameSettings();

  const handleStart = () => {
    router.push({
      pathname: "/(tabs)/play/ai-game/session",
      params: {
        playerColor: settings.playerColor,
        skillLevel: settings.skillLevel.toString(),
      },
    });
  };

  return (
    <PracticeSetupScreen
      isLoaded={isLoaded}
      startLabel={t("aiGame.setup.startGame")}
      onStart={handleStart}
    >
      <SettingsForm
        playerColor={settings.playerColor}
        skillLevel={settings.skillLevel}
        onUpdatePlayerColor={(playerColor) => updateSettings({ playerColor })}
        onUpdateSkillLevel={(skillLevel) => updateSettings({ skillLevel })}
      />
    </PracticeSetupScreen>
  );
}
