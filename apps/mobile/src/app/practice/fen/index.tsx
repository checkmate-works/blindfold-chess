import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  PRESET_POSITIONS,
  parseCustomFenLines,
  validateCustomFenInput,
} from "@blindfold-chess/features/fen-practice";

import { PracticeSetupScreen } from "../../../components";
import { FenSettingsForm } from "../../../features/fen/components";
import { FEN_ARTICLES } from "../../../features/fen/lib/related-articles";
import { useFenSettings } from "../../../features/fen/hooks";
import { serializeFenSessionParams } from "../../../features/fen/lib/route-params";
import { RequiredKnowledgeSection } from "../../../features/learn/RequiredKnowledgeSection";

/**
 * FEN reconstruction, a free-play module: the web's setup form (problem
 * source, the built-in problems or the player's FENs, count and shuffle)
 * and its "Required Knowledge" article, then a single Start. No challenge,
 * so no training button and no sign-in row.
 */

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
      pathname: "/practice/fen/session",
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
      onStart={handleStart}
      startDisabled={cannotStart}
    >
      <FenSettingsForm
        settings={settings}
        onUpdate={updateSettings}
        availableCount={fens.length}
        customFenError={customFenError}
        settingsTitle={t("fen.setup.settings")}
      />
      <RequiredKnowledgeSection slugs={FEN_ARTICLES} />
    </PracticeSetupScreen>
  );
}
