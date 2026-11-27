import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, View, Text, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Crypto from "expo-crypto";
import { isValidSkillLevel } from "@blindfold-chess/features/ai-game";
import {
  type GamePreferences,
  pickPerGamePreferences,
} from "@blindfold-chess/features/game-preferences";
import { findLastAiMoveNotation } from "@blindfold-chess/features/game-play";
import {
  computeGameStats,
  type MoveOperationLog,
} from "@blindfold-chess/features/game-record";
import { useAiReplyChip } from "@blindfold-chess/features/game-play/client";
import {
  SIDES,
  type AlgebraicNotation,
  type Side,
} from "@blindfold-chess/types";

import { StockfishWebView } from "../../../../features/ai-game/engine";
import {
  InlineBoard,
  ButtonInput,
  MoveHistory,
  GameInfo,
} from "../../../../features/ai-game/components";
import {
  useAiVersus,
  useGameSession,
} from "../../../../features/ai-game/hooks";
import type { SkillLevel } from "../../../../features/ai-game/lib/types";
import {
  decodeGamePrefsParam,
  pickValidPerGamePreferences,
} from "../../../../features/ai-game/lib/game-prefs-param";
import {
  isInProgress,
  loadSavedGame,
  saveGame,
} from "../../../../features/game-history/game-history";
import { useCloseSession } from "../../../../navigation/use-close-session";
import {
  GamePreferencesOverride,
  useGamePreferences,
} from "../../../../lib/game-preferences";
import { parseEnumParam } from "../../../../lib/route-params";
import {
  BottomSheet,
  Button,
  ListSection,
  Screen,
} from "../../../../components";
import { perGameSettingRows } from "../../../../features/settings/per-game-setting-rows";
import { HeaderIconButton } from "../../../../navigation/HeaderIconButton";
import { SessionTopBar } from "../../../../navigation/SessionTopBar";
import { useTheme, fontSize, fontWeight, spacing } from "../../../../theme";

/** Everything a session starts from: a new game's choices or a saved game. */
type GameSetup = {
  /** The saved game's id. A UUID, because the Exp grant is keyed by it. */
  gameId: string;
  playerColor: Side;
  skillLevel: SkillLevel;
  startingFen?: string;
  moves: AlgebraicNotation[];
  operationLogs: MoveOperationLog[];
  /** This game's preferences, laid over the global ones. */
  gamePrefs: Partial<GamePreferences>;
};

function skillLevelOf(value: number): SkillLevel {
  return isValidSkillLevel(value) ? value : 5;
}

/**
 * The AI game, new or resumed.
 *
 * A new game comes with its setup's choices as route params (`playerColor`,
 * `skillLevel`, `gamePrefs`; the onboarding's first game sends no
 * `gamePrefs` and plays under the global preferences). A game picked up
 * from the history comes as `resume`, the saved game's id, and everything
 * else is read from the device, so the game continues from the position,
 * the operation record and the settings it was left with.
 */
export default function AiGameSession() {
  const params = useLocalSearchParams<{
    playerColor?: string;
    skillLevel?: string;
    gamePrefs?: string;
    resume?: string;
  }>();
  const { close } = useCloseSession("/play");

  // Built once: a new game's id must not change between renders.
  const [setup, setSetup] = useState<GameSetup | null>(() =>
    params.resume
      ? null
      : {
          gameId: Crypto.randomUUID(),
          playerColor: parseEnumParam<Side>(params.playerColor, SIDES, "white"),
          skillLevel: skillLevelOf(Number(params.skillLevel)),
          moves: [],
          operationLogs: [],
          gamePrefs: decodeGamePrefsParam(params.gamePrefs),
        },
  );

  const resumeId = params.resume;
  useEffect(() => {
    if (!resumeId) return;
    let active = true;
    void loadSavedGame(resumeId).then((saved) => {
      if (!active) return;
      // Deleted meanwhile, or already finished: there is nothing to play.
      if (!saved || !isInProgress(saved)) {
        close();
        return;
      }
      setSetup({
        gameId: saved.id,
        playerColor: saved.playerColor,
        skillLevel: skillLevelOf(saved.skillLevel),
        startingFen: saved.startingFen,
        moves: saved.moves as AlgebraicNotation[],
        operationLogs: saved.operationLogs ?? [],
        gamePrefs: pickValidPerGamePreferences(saved.gamePrefs),
      });
    });
    return () => {
      active = false;
    };
  }, [resumeId, close]);

  if (!setup) return <Screen>{null}</Screen>;
  return <AiGameWithPreferences setup={setup} />;
}

/**
 * Lays the game's own preferences over the global ones for everything
 * below, so the board and the input read this game's values without knowing
 * it. Changes made mid-game land here, not in the stored preferences.
 */
function AiGameWithPreferences({ setup }: { setup: GameSetup }) {
  const [overrides, setOverrides] = useState(setup.gamePrefs);
  const updateOverrides = useCallback(
    (updates: Partial<GamePreferences>) =>
      setOverrides((current) => ({ ...current, ...updates })),
    [],
  );

  return (
    <GamePreferencesOverride overrides={overrides} onUpdate={updateOverrides}>
      <AiGameBoard setup={setup} />
    </GamePreferencesOverride>
  );
}

function AiGameBoard({ setup }: { setup: GameSetup }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const { preferences, updatePreferences } = useGamePreferences();
  // The board starts from the player's side and can be turned round.
  const [flipped, setFlipped] = useState<boolean | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [movesOpen, setMovesOpen] = useState(false);
  // The top inset is padded from the provider's value rather than left to
  // `Screen`'s `SafeAreaView`: in a header-less screen of the full-screen
  // session modal the view's own top inset comes out as 0 on iOS, which put
  // the top row under the status bar. `PracticeSessionScreen` does the same.
  const insets = useSafeAreaInsets();
  const { gameId, playerColor, skillLevel } = setup;
  const start = setup;

  const ai = useAiVersus(skillLevel);

  const game = useGameSession({
    playerColor,
    skillLevel,
    getAiMove: ai.getAiMove,
    isAiLoading: ai.isLoading,
    resetAi: ai.reset,
    startingFen: start.startingFen,
    initialMoves: start.moves,
    initialOperationLogs: start.operationLogs,
  });

  // The AI's reply is announced where the board would be, for as long as the
  // player chose, and only while the board is out of sight: on an open board
  // the move is already visible.
  const aiReply = useAiReplyChip({
    isAiThinking: game.isAiThinking,
    aiMoveSignal: game.aiMoveSignal,
    durationMs: preferences.aiReplyDuration,
  });
  const announcedAiMove =
    aiReply.active && !aiReply.thinking
      ? findLastAiMoveNotation(game.moves, playerColor, start.startingFen)
      : null;

  // A peek opens the board until the next move, then the mask returns.
  const [revealed, setRevealed] = useState(false);
  const moveCount = game.moves.length;
  useEffect(() => {
    setRevealed(false);
  }, [moveCount]);
  const { recordPeek } = game;
  const dismissAiReply = aiReply.dismiss;
  const revealBoard = useCallback(() => {
    setRevealed(true);
    recordPeek();
    dismissAiReply();
  }, [recordPeek, dismissAiReply]);

  const confirmUndo = () => {
    Alert.alert(
      t("aiGame.session.confirmUndoTitle"),
      t("aiGame.session.confirmUndoMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("aiGame.session.confirmUndo"), onPress: game.undo },
      ],
    );
  };

  const confirmResign = () => {
    Alert.alert(
      t("aiGame.session.confirmResignTitle"),
      t("aiGame.session.confirmResignMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("aiGame.session.confirmResign"),
          style: "destructive",
          onPress: game.resign,
        },
      ],
    );
  };

  // The game is written to the device after every move, so leaving the
  // screen (or losing the app) never loses it: the history lists it as in
  // progress and opens it again here. A game with no move yet is not worth a
  // row, so saving starts with the first one.
  const perGamePrefs = useMemo(
    () => pickPerGamePreferences(preferences),
    [preferences],
  );
  const hasBeenSaved = useRef(start.moves.length > 0);
  useEffect(() => {
    if (game.moves.length === 0 && !hasBeenSaved.current) return;
    hasBeenSaved.current = true;
    void saveGame({
      id: gameId,
      finishedAt: new Date().toISOString(),
      playerColor,
      skillLevel,
      ...(game.playerResult ? { result: game.playerResult } : {}),
      moves: [...game.moves],
      startingFen: start.startingFen,
      operationLogs: game.operationLogs,
      gamePrefs: perGamePrefs,
    });
  }, [
    game.moves,
    game.playerResult,
    game.operationLogs,
    perGamePrefs,
    gameId,
    playerColor,
    skillLevel,
    start.startingFen,
  ]);

  // Navigate to result when game is over
  useEffect(() => {
    if (game.gameStatus !== "in_progress" && game.playerResult) {
      // Capture the narrowed value: the `!` it replaces was real — narrowing
      // is lost across the property access inside the setTimeout closure.
      const playerResult = game.playerResult;
      const stats = computeGameStats(game.operationLogs);
      const timer = setTimeout(() => {
        router.replace({
          pathname: "/play/ai-game/result",
          params: {
            result: playerResult,
            playerColor: game.playerColor,
            skillLevel: game.skillLevel.toString(),
            moveCount: game.moves.length.toString(),
            gameId,
            playerMoveCount: stats.totalMoves.toString(),
            aidedMoveCount: stats.aidedMoves.toString(),
          },
        });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [
    game.gameStatus,
    game.playerResult,
    game.playerColor,
    game.skillLevel,
    game.moves,
    game.moves.length,
    game.operationLogs,
    gameId,
    router,
  ]);

  return (
    <Screen
      edges={["bottom", "left", "right"]}
      style={{ paddingTop: insets.top }}
    >
      {/* Hidden WebView for Stockfish engine */}
      <StockfishWebView
        key={ai.webViewKey}
        ref={ai.webViewRef}
        onMessage={ai.handleMessage}
        onReady={ai.handleWebViewReady}
        onError={ai.handleWebViewError}
      />

      {/* Leaving asks nothing: the game is saved and can be resumed. */}
      <SessionTopBar confirm={false}>
        <View style={styles.topRow}>
          <GameInfo
            isPlayerTurn={game.isPlayerTurn}
            isAiThinking={game.isAiThinking}
            gameStatus={game.gameStatus}
            resigned={game.resigned}
            aiMoveFailed={game.aiMoveFailed}
            skillLevel={skillLevel}
          />
          <HeaderIconButton
            icon="list"
            accessibilityLabel={t("aiGame.session.moves")}
            onPress={() => setMovesOpen(true)}
          />
          {preferences.boardVisibility !== "never" && (
            <HeaderIconButton
              icon="swap-vertical"
              accessibilityLabel={t("aiGame.session.flipBoard")}
              onPress={() =>
                setFlipped((current) => !(current ?? playerColor === "black"))
              }
            />
          )}
          <HeaderIconButton
            icon="settings-outline"
            accessibilityLabel={t("common.gameSettings")}
            onPress={() => setSettingsOpen(true)}
          />
        </View>
      </SessionTopBar>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <InlineBoard
          fen={game.currentFen}
          moves={game.moves}
          startingFen={start.startingFen}
          playerColor={playerColor}
          flipped={flipped ?? playerColor === "black"}
          revealed={revealed}
          onReveal={revealBoard}
          onHide={() => setRevealed(false)}
          thinking={aiReply.thinking}
          announcedAiMove={announcedAiMove}
        />

        {game.error?.kind === "invalid-move" && (
          <Text style={[styles.errorText, { color: colors.destructive }]}>
            {t("aiGame.session.invalidMoveWithInput", {
              move: game.error.input,
            })}
          </Text>
        )}

        {/* The keypad stays in place through the AI's turn, only disabled,
            as on the web: taking it away while the AI thinks moved the
            buttons below it up and back down on every move. That the AI is
            working is said on the board and in the top row instead. */}
        {game.gameStatus === "in_progress" && (
          <ButtonInput
            fen={game.currentFen}
            onSubmit={game.submitMove}
            disabled={ai.isLoading || !game.isPlayerTurn || game.isAiThinking}
          />
        )}

        {/* The failure itself reads in the top row; this adds the way out. */}
        {game.gameStatus === "in_progress" && game.aiMoveFailed && (
          <Button
            title={t("aiGame.session.retry")}
            icon="refresh"
            onPress={game.retryAiMove}
          />
        )}

        {game.gameStatus === "in_progress" && (
          <View style={styles.actionRow}>
            <Button
              title={t("aiGame.session.undo")}
              icon="arrow-undo"
              variant="outline"
              size="sm"
              disabled={!game.canUndo}
              onPress={confirmUndo}
              style={styles.action}
            />
            <Button
              title={t("aiGame.session.resign")}
              icon="flag"
              variant="outline"
              size="sm"
              disabled={!game.canResign}
              onPress={confirmResign}
              style={styles.action}
            />
          </View>
        )}

        {/* Game over message */}
        {game.gameStatus !== "in_progress" && game.playerResult && (
          <View style={styles.gameOverContainer}>
            <Text style={[styles.gameOverText, { color: colors.foreground }]}>
              {game.playerResult === "win"
                ? t("aiGame.result.win")
                : game.playerResult === "loss"
                  ? t("aiGame.result.loss")
                  : t("aiGame.result.draw")}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* The moves stay off the screen while playing: a list always in view
          is the game written out, which blindfold play takes away. */}
      <BottomSheet
        visible={movesOpen}
        onClose={() => setMovesOpen(false)}
        title={t("aiGame.session.moves")}
      >
        <MoveHistory moves={game.moves} startingFen={start.startingFen} />
      </BottomSheet>
      {/* This game's settings, changed mid-game: they are the session's own
          copy, so the global preferences stay as they were. */}
      <BottomSheet
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title={t("common.gameSettings")}
      >
        <ListSection>
          {perGameSettingRows({
            t,
            preferences,
            onChange: updatePreferences,
          })}
        </ListSection>
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  // Tight on purpose: the board and the keypad have to fit
  // on a phone screen together, so the player never scrolls to enter a move.
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  errorText: {
    fontSize: fontSize.sm,
    textAlign: "center",
  },
  // The status sits between the × and the board controls. The row takes
  // the top bar's whole trailing slot so the status can centre in it.
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    gap: spacing.md,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  action: {
    flex: 1,
  },
  gameOverContainer: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  gameOverText: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
  },
});
