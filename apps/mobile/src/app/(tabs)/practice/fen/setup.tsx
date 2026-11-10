import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import {
  PRESET_POSITIONS,
  parseCustomFenLines,
  validateCustomFenInput,
} from "@blindfold-chess/features/fen-practice";

import { PracticeSetupScreen } from "../../../../components";
import { FenSettingsForm } from "../../../../features/fen/components";
import { useFenSettings } from "../../../../features/fen/hooks";
import { serializeFenSessionParams } from "../../../../features/fen/lib/route-params";

export default function FenSetup() {
  const { t } = useTranslation();
  const router = useRouter();
  const { settings, isLoaded, updateSettings } = useFenSettings();

  const customFens = parseCustomFenLines(settings.customFenInput);
  const customFenError = settings.useCustomFen
    ? validateCustomFenInput(settings.customFenInput)
    : null;
  const fens = settings.useCustomFen
    ? customFens
    : PRESET_POSITIONS.map((p) => p.fen);
  const cannotStart =
    settings.useCustomFen && (customFenError !== null || fens.length === 0);

  const handleStart = () => {
    if (cannotStart) return;
    router.push({
      pathname: "/(tabs)/practice/fen/session",
      params: serializeFenSessionParams({
        fens,
        problemCount: settings.problemCount,
        shuffle: settings.shuffleProblems,
      }),
    });
  };

  return (
    <PracticeSetupScreen
      isLoaded={isLoaded}
      startLabel={t("fen.setup.start")}
      onStart={handleStart}
      startDisabled={cannotStart}
    >
      <FenSettingsForm
        settings={settings}
        onUpdate={updateSettings}
        availableCount={fens.length}
        customFenError={customFenError}
      />
    </PracticeSetupScreen>
  );
}
