import { useCallback, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import type { Side } from "@blindfold-chess/types";
import {
  type PerGamePreferences,
  pickPerGamePreferences,
} from "@blindfold-chess/features/game-preferences";

import { PracticeSetupScreen } from "../../../components";
import {
  GameSettingsSection,
  SettingsForm,
  StartPositionForm,
} from "../../../features/ai-game/components";
import {
  useGameSettings,
  useStartPositionInput,
} from "../../../features/ai-game/hooks";
import { encodeGamePrefsParam } from "../../../features/ai-game/lib/game-prefs-param";
import { encodeStartParams } from "../../../features/ai-game/lib/start-params";
import { useGamePreferences } from "../../../lib/game-preferences";
import { spacing } from "../../../theme";

export default function AiGameSetup() {
  const { t } = useTranslation();
  const router = useRouter();
  const { settings, isLoaded, updateSettings } = useGameSettings();
  const { preferences, isLoaded: preferencesLoaded } = useGamePreferences();

  // This game's preferences: the global ones, with whatever is changed on
  // this screen laid over them. The changes belong to the game being set up
  // and are not written back, so trying a harder rung for one game does not
  // move the player's defaults.
  const [gamePrefsEdits, setGamePrefsEdits] = useState<
    Partial<PerGamePreferences>
  >({});
  const gamePrefs = pickPerGamePreferences({
    ...preferences,
    ...gamePrefsEdits,
  });

  const derivePlayerColor = useCallback(
    (playerColor: Side) => updateSettings({ playerColor }),
    [updateSettings],
  );
  const start = useStartPositionInput({
    onDerivePlayerColor: derivePlayerColor,
  });

  const handleStart = () => {
    if (!start.resolution.ok) return;
    router.push({
      pathname: "/play/ai-game/session",
      params: {
        playerColor: settings.playerColor,
        skillLevel: settings.skillLevel.toString(),
        gamePrefs: encodeGamePrefsParam(gamePrefs),
        ...encodeStartParams(start.resolution.value),
      },
    });
  };

  return (
    <PracticeSetupScreen
      isLoaded={isLoaded && preferencesLoaded}
      startLabel={t("aiGame.setup.startGame")}
      onStart={handleStart}
      startDisabled={!start.resolution.ok}
    >
      <View style={styles.container}>
        <StartPositionForm
          mode={start.mode}
          onChangeMode={start.setMode}
          fenText={start.fenText}
          onChangeFenText={start.changeFenText}
          sideToMove={start.sideToMove}
          onChangeSideToMove={start.setSideToMove}
          pgnText={start.pgnText}
          onChangePgnText={start.changePgnText}
          resolution={start.resolution}
        />
        <SettingsForm
          playerColor={settings.playerColor}
          skillLevel={settings.skillLevel}
          playerColorHint={
            start.showDerivedFromPgnHint
              ? t("aiGame.setup.derivedFromPgn")
              : undefined
          }
          onUpdatePlayerColor={(playerColor) => {
            start.markColorManuallySet();
            updateSettings({ playerColor });
          }}
          onUpdateSkillLevel={(skillLevel) => updateSettings({ skillLevel })}
        />
        <GameSettingsSection
          preferences={gamePrefs}
          playerColor={settings.playerColor}
          onChange={(updates) =>
            setGamePrefsEdits((edits) => ({ ...edits, ...updates }))
          }
        />
      </View>
    </PracticeSetupScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
});
