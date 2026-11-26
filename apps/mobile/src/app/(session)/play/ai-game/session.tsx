import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, View, Text, StyleSheet, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Crypto from "expo-crypto";
import { isValidSkillLevel } from "@blindfold-chess/features/ai-game";
import type { GamePreferences } from "@blindfold-chess/features/game-preferences";
import { findLastAiMoveNotation } from "@blindfold-chess/features/game-play";
import { computeGameStats } from "@blindfold-chess/features/game-record";
import { useAiReplyChip } from "@blindfold-chess/features/game-play/client";
import { SIDES, type Side } from "@blindfold-chess/types";

import { StockfishWebView } from "../../../../features/ai-game/engine";
import {
  InlineBoard,
  ButtonInput,
  MoveHistory,
  GameInfo,
  Spinner,
} from "../../../../features/ai-game/components";
import {
  useAiVersus,
  useGameSession,
} from "../../../../features/ai-game/hooks";
import type { SkillLevel } from "../../../../features/ai-game/lib/types";
import { decodeGamePrefsParam } from "../../../../features/ai-game/lib/game-prefs-param";
import { decodeStartParams } from "../../../../features/ai-game/lib/start-params";
import { saveGame } from "../../../../features/game-history/game-history";
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

/**
 * The AI game. It plays under the preference snapshot its setup screen took
 * (`gamePrefs`), laid over the global preferences for everything below, so
 * the board and the input read this game's values without knowing it. A
 * session opened without the param (the onboarding's first game) plays under
 * the global ones.
 */
export default function AiGameSession() {
  const { gamePrefs } = useLocalSearchParams<{ gamePrefs?: string }>();
  // Decoded once: later changes are this game's own and live in the state.
  const [overrides, setOverrides] = useState<Partial<GamePreferences>>(() =>
    decodeGamePrefsParam(gamePrefs),
  );
  const updateOverrides = useCallback(
    (updates: Partial<GamePreferences>) =>
      setOverrides((current) => ({ ...current, ...updates })),
    [],
  );

  return (
    <GamePreferencesOverride overrides={overrides} onUpdate={updateOverrides}>
      <AiGameBoard />
    </GamePreferencesOverride>
  );
}

function AiGameBoard() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const { preferences, updatePreferences } = useGamePreferences();
  // The board starts from the player's side and can be turned round.
  const [flipped, setFlipped] = useState<boolean | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const params = useLocalSearchParams<{
    playerColor: string;
    skillLevel: string;
    fen?: string;
    moves?: string;
  }>();

  const playerColor = parseEnumParam<Side>(params.playerColor, SIDES, "white");
  const parsedSkillLevel = Number(params.skillLevel);
  const skillLevel: SkillLevel = isValidSkillLevel(parsedSkillLevel)
    ? parsedSkillLevel
    : 5;

  // Decoded once: the session replays these as its initial state, and a
  // re-decode on every render would hand useGameSession a new array each time.
  const [start] = useState(() =>
    decodeStartParams({ fen: params.fen, moves: params.moves }),
  );

  const ai = useAiVersus(skillLevel);

  const game = useGameSession({
    playerColor,
    skillLevel,
    getAiMove: ai.getAiMove,
    isAiLoading: ai.isLoading,
    resetAi: ai.reset,
    startingFen: start.startingFen,
    initialMoves: start.moves,
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

  // Keep the finished game in the device's history (the Play tab lists it,
  // and it can be replayed in recall). Once per session.
  const saved = useRef(false);
  // The saved game's id, so the result screen can open its page.
  // A UUID because the Exp grant is keyed by it.
  const [gameId] = useState(() => Crypto.randomUUID());

  // Navigate to result when game is over
  useEffect(() => {
    if (game.gameStatus !== "in_progress" && game.playerResult) {
      // Capture the narrowed value: the `!` it replaces was real — narrowing
      // is lost across the property access inside the setTimeout closure.
      const playerResult = game.playerResult;
      const stats = computeGameStats(game.operationLogs);
      if (!saved.current) {
        saved.current = true;
        void saveGame({
          id: gameId,
          finishedAt: new Date().toISOString(),
          playerColor: game.playerColor,
          skillLevel: game.skillLevel,
          result: playerResult,
          moves: [...game.moves],
          startingFen: start.startingFen,
        });
      }
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
    start.startingFen,
    gameId,
    router,
  ]);

  return (
    <Screen edges={["top", "bottom"]}>
      {/* Hidden WebView for Stockfish engine */}
      <StockfishWebView
        key={ai.webViewKey}
        ref={ai.webViewRef}
        onMessage={ai.handleMessage}
        onReady={ai.handleWebViewReady}
        onError={ai.handleWebViewError}
      />

      <SessionTopBar>
        <View style={styles.topActions}>
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
        <GameInfo
          isPlayerTurn={game.isPlayerTurn}
          isAiThinking={game.isAiThinking}
          gameStatus={game.gameStatus}
          resigned={game.resigned}
          aiMoveFailed={game.aiMoveFailed}
          skillLevel={skillLevel}
          moveCount={game.moves.length}
        />

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

        {/* Move History */}
        <MoveHistory moves={game.moves} startingFen={start.startingFen} />

        {/* Input area */}
        {game.gameStatus === "in_progress" &&
          (game.isPlayerTurn ? (
            <ButtonInput
              fen={game.currentFen}
              onSubmit={game.submitMove}
              fitWidth
              disabled={ai.isLoading || game.isAiThinking}
            />
          ) : game.aiMoveFailed ? (
            <View style={styles.retryContainer}>
              <Text style={[styles.errorText, { color: colors.destructive }]}>
                {t("aiGame.session.aiMoveFailed")}
              </Text>
              <Button
                title={t("aiGame.session.retry")}
                icon="refresh"
                onPress={game.retryAiMove}
              />
            </View>
          ) : (
            <View style={styles.aiThinkingContainer}>
              <Text
                style={[
                  styles.aiThinkingText,
                  { color: colors.mutedForeground },
                ]}
              >
                {t("aiGame.session.aiThinking")}
              </Text>
              <Spinner color={colors.primary} />
            </View>
          ))}

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
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  errorText: {
    fontSize: fontSize.sm,
    textAlign: "center",
  },
  topActions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  retryContainer: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.lg,
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
  aiThinkingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  aiThinkingText: {
    fontSize: fontSize.md,
  },
});
