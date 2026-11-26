import { useState } from "react";
import { View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import {
  type PerGamePreferences,
  pickPerGamePreferences,
} from "@blindfold-chess/features/game-preferences";

import { PracticeSetupScreen } from "../../../components";
import {
  GameSettingsSection,
  SettingsForm,
} from "../../../features/ai-game/components";
import { useGameSettings } from "../../../features/ai-game/hooks";
import { encodeGamePrefsParam } from "../../../features/ai-game/lib/game-prefs-param";
import { useGamePreferences } from "../../../lib/game-preferences";
import { spacing } from "../../../theme";

/**
 * Setting up a game against the engine: the player's colour, the engine's
 * strength, and how blind the game is played. A game in the app always
 * starts from the standard position; starting from a custom position, an
 * opening or a PGN stays on the web.
 */
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

  const handleStart = () => {
    router.push({
      pathname: "/play/ai-game/session",
      params: {
        playerColor: settings.playerColor,
        skillLevel: settings.skillLevel.toString(),
        gamePrefs: encodeGamePrefsParam(gamePrefs),
      },
    });
  };

  return (
    <PracticeSetupScreen
      isLoaded={isLoaded && preferencesLoaded}
      startLabel={t("aiGame.setup.startGame")}
      onStart={handleStart}
    >
      <View style={styles.container}>
        <SettingsForm
          playerColor={settings.playerColor}
          skillLevel={settings.skillLevel}
          onUpdatePlayerColor={(playerColor) => updateSettings({ playerColor })}
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
