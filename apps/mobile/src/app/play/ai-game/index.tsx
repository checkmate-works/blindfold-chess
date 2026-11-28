import { useState } from "react";
import { View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useLocalSearchParams, useRouter } from "expo-router";
import { validateFen } from "@blindfold-chess/features/chess-core";
import { isBlackToMoveFromFen } from "@blindfold-chess/features/chess-core/fen";
import type { Side } from "@blindfold-chess/types";
import {
  type PerGamePreferences,
  pickPerGamePreferences,
} from "@blindfold-chess/features/game-preferences";

import { ListSection, PracticeSetupScreen } from "../../../components";
import { FenBoard } from "../../../features/fen/components";
import {
  GameSettingsSection,
  SettingsForm,
} from "../../../features/ai-game/components";
import { useGameSettings } from "../../../features/ai-game/hooks";
import { SavedGameSnackbar } from "../../../features/game-history/SavedGameSnackbar";
import { encodeGamePrefsParam } from "../../../features/ai-game/lib/game-prefs-param";
import { useGamePreferences } from "../../../lib/game-preferences";
import { spacing } from "../../../theme";

/**
 * What lies between the screen's edge and the starting-position board, on
 * both sides together: the scroll content's padding, the panel's 1px
 * border and the block's own padding.
 */
const START_BOARD_INSET = (spacing.lg + 1 + spacing.md) * 2;

/**
 * Setting up a game against the engine: the player's colour, the engine's
 * strength, and how blind the game is played.
 *
 * A game starts from the standard position, except one opened from a
 * guide's link card with `fen` (the web's `/games/new/position?fen=`): it
 * starts from that position, shown first, and the player takes the side to
 * move unless they pick the other. That colour is this game's only and is
 * not written to the saved settings. Setting up a position by hand, an
 * opening or a PGN stays on the web.
 */
export default function AiGameSetup() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ fen?: string }>();
  const startingFen =
    params.fen && validateFen(params.fen) ? params.fen : undefined;
  const { settings, isLoaded, updateSettings } = useGameSettings();
  const [positionColor, setPositionColor] = useState<Side | null>(() =>
    startingFen
      ? isBlackToMoveFromFen(startingFen)
        ? "black"
        : "white"
      : null,
  );
  const playerColor = positionColor ?? settings.playerColor;
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
        playerColor,
        skillLevel: settings.skillLevel.toString(),
        gamePrefs: encodeGamePrefsParam(gamePrefs),
        ...(startingFen ? { startingFen } : {}),
      },
    });
  };

  return (
    <PracticeSetupScreen
      isLoaded={isLoaded && preferencesLoaded}
      startLabel={t("aiGame.setup.startGame")}
      onStart={handleStart}
      overlay={<SavedGameSnackbar />}
    >
      <View style={styles.container}>
        {startingFen && (
          <ListSection title={t("aiGame.setup.startingPosition")}>
            <View style={styles.startBoard} testID="starting-position">
              <FenBoard
                fen={startingFen}
                flipped={playerColor === "black"}
                maxSize={280}
                horizontalInset={START_BOARD_INSET}
              />
            </View>
          </ListSection>
        )}
        <SettingsForm
          playerColor={playerColor}
          skillLevel={settings.skillLevel}
          onUpdatePlayerColor={(color) =>
            startingFen
              ? setPositionColor(color)
              : updateSettings({ playerColor: color })
          }
          onUpdateSkillLevel={(skillLevel) => updateSettings({ skillLevel })}
        />
        <GameSettingsSection
          preferences={gamePrefs}
          playerColor={playerColor}
          startingFen={startingFen}
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
  startBoard: {
    padding: spacing.md,
    alignItems: "center",
  },
});
