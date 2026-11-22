import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import {
  POSITION_MEMORY_FENS,
  parseCustomFenLines,
  validateCustomFenInput,
} from "@blindfold-chess/features/fen-practice";

import { OptionsField, PracticeSetupScreen } from "../../../components";
import { FenSettingsForm } from "../../../features/fen/components";
import { serializeFenSessionParams } from "../../../features/fen/lib/route-params";
import {
  MEMORIZE_TIME_OPTIONS,
  usePositionMemorySettings,
} from "../../../features/position-memory/settings";

/**
 * Position memory setup (the web's `/practice/position-memory`, without the
 * community positions, which live on the server): memorising time, then the
 * same problem source, count and shuffle as the FEN drill.
 */
export default function PositionMemorySetup() {
  const { t } = useTranslation();
  const router = useRouter();
  const { settings, isLoaded, updateSettings } = usePositionMemorySettings();

  const customFenError = settings.useCustomFen
    ? validateCustomFenInput(settings.customFenInput)
    : null;
  const fens = settings.useCustomFen
    ? parseCustomFenLines(settings.customFenInput)
    : [...POSITION_MEMORY_FENS];
  const cannotStart =
    settings.useCustomFen && (customFenError !== null || fens.length === 0);

  const handleStart = () => {
    if (cannotStart) return;
    router.push({
      pathname: "/practice/position-memory/session",
      params: {
        ...serializeFenSessionParams({
          fens,
          problemCount: settings.problemCount,
          shuffle: settings.shuffleProblems,
        }),
        seconds: String(settings.memorizeSeconds),
      },
    });
  };

  return (
    <PracticeSetupScreen
      isLoaded={isLoaded}
      onStart={handleStart}
      startDisabled={cannotStart}
    >
      <OptionsField
        label={t("positionMemory.setup.memorizeTime")}
        options={MEMORIZE_TIME_OPTIONS}
        value={
          settings.memorizeSeconds as (typeof MEMORIZE_TIME_OPTIONS)[number]
        }
        onChange={(memorizeSeconds) => updateSettings({ memorizeSeconds })}
        formatOption={(s) => t("positionMemory.setup.seconds", { count: s })}
      />
      <FenSettingsForm
        settings={settings}
        onUpdate={updateSettings}
        availableCount={fens.length}
        customFenError={customFenError}
        hidePresetList
      />
    </PracticeSetupScreen>
  );
}
