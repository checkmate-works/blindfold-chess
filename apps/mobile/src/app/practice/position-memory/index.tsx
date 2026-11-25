import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import {
  POSITION_MEMORY_FENS,
  parseCustomFenLines,
  validateCustomFenInput,
} from "@blindfold-chess/features/fen-practice";

import { PracticeSetupScreen, SelectRow } from "../../../components";
import { FenSettingsForm } from "../../../features/fen/components";
import { POSITION_MEMORY_ARTICLES } from "../../../features/fen/lib/related-articles";
import { serializeFenSessionParams } from "../../../features/fen/lib/route-params";
import { RequiredKnowledgeSection } from "../../../features/learn/RequiredKnowledgeSection";
import {
  MEMORIZE_TIME_OPTIONS,
  usePositionMemorySettings,
} from "../../../features/position-memory/settings";

/**
 * Position memory setup. The web's page lists community positions, which the
 * app does not show (it shows no other user); what the app runs is the web's
 * multi-problem session over the built-in positions or the player's own
 * FENs. So the form is the FEN drill's (problem source, count, shuffle) with
 * the web's memorization time first on the settings panel, then the
 * articles the web's result lists under "Required Knowledge".
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
      <FenSettingsForm
        settings={settings}
        onUpdate={updateSettings}
        availableCount={fens.length}
        customFenError={customFenError}
        hidePresetList
        settingsTitle={t("positionMemory.setup.settings")}
        leadingSettingRow={
          <SelectRow
            label={t("positionMemory.setup.memorizeTime")}
            options={MEMORIZE_TIME_OPTIONS}
            value={
              MEMORIZE_TIME_OPTIONS.find(
                (s) => s === settings.memorizeSeconds,
              ) ?? null
            }
            onChange={(memorizeSeconds) => updateSettings({ memorizeSeconds })}
            formatOption={(s) =>
              t("positionMemory.setup.seconds", { count: s })
            }
            testID="memorize-time"
          />
        }
      />
      <RequiredKnowledgeSection slugs={POSITION_MEMORY_ARTICLES} />
    </PracticeSetupScreen>
  );
}
