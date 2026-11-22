import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";

import { PracticeSetupScreen } from "../../../components";
import { ChallengeRulesNote } from "../../../features/challenge/ChallengeRulesNote";
import { SettingsForm } from "../../../features/legal-moves/components";
import { useLegalMovesSettings } from "../../../features/legal-moves/hooks";

/** Legal moves: pick the piece, then the challenge or untimed training. */
export default function LegalMovesSetup() {
  const { t } = useTranslation();
  const router = useRouter();
  const { settings, isLoaded, updateSettings } = useLegalMovesSettings();
  const params = { piece: settings.selectedPiece };

  return (
    <PracticeSetupScreen
      isLoaded={isLoaded}
      startLabel={t("legalMoves.setup.start")}
      onStart={() =>
        router.push({ pathname: "/practice/legal-moves/session", params })
      }
      onStartTraining={() =>
        router.push({ pathname: "/practice/legal-moves/training", params })
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
