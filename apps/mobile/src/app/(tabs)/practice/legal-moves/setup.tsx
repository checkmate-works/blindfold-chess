import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";

import { PracticeSetupScreen } from "../../../../components";
import { SettingsForm } from "../../../../features/legal-moves/components";
import { useLegalMovesSettings } from "../../../../features/legal-moves/hooks";

export default function LegalMovesSetup() {
  const { t } = useTranslation();
  const router = useRouter();
  const { settings, isLoaded, updateSettings, togglePiece } =
    useLegalMovesSettings();

  const handleStart = () => {
    router.push({
      pathname: "/(tabs)/practice/legal-moves/session",
      params: {
        duration: settings.timeLimit.toString(),
        pieces: settings.selectedPieces.join(","),
      },
    });
  };

  return (
    <PracticeSetupScreen
      isLoaded={isLoaded}
      startLabel={t("legalMoves.setup.start")}
      onStart={handleStart}
    >
      <SettingsForm
        timeLimit={settings.timeLimit}
        selectedPieces={settings.selectedPieces}
        onUpdateTimeLimit={(timeLimit) => updateSettings({ timeLimit })}
        onTogglePiece={togglePiece}
      />
    </PracticeSetupScreen>
  );
}
