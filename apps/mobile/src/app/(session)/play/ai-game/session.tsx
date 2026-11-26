import { useEffect, useRef, useState } from "react";
import { Alert, View, Text, StyleSheet, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { useLocalSearchParams, useRouter } from "expo-router";
import { isValidSkillLevel } from "@blindfold-chess/features/ai-game";
import { findLastAiMoveNotation } from "@blindfold-chess/features/game-play";
import { useAiReplyChip } from "@blindfold-chess/features/game-play/client";
import { SIDES, type Side } from "@blindfold-chess/types";

import { StockfishWebView } from "../../../../features/ai-game/engine";
import {
  BoardPeek,
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
import { decodeStartParams } from "../../../../features/ai-game/lib/start-params";
import { saveGame } from "../../../../features/game-history/game-history";
import { useGamePreferences } from "../../../../lib/game-preferences";
import { parseEnumParam } from "../../../../lib/route-params";
import { Button, Screen } from "../../../../components";
import { SessionTopBar } from "../../../../navigation/SessionTopBar";
import { useTheme, fontSize, fontWeight, spacing } from "../../../../theme";

export default function AiGameSession() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const { preferences } = useGamePreferences();
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

  // The AI's reply is announced in the status line for as long as the player
  // chose, and only while the board is out of sight: with the board always on
  // screen the move is already visible there.
  const aiReply = useAiReplyChip({
    isAiThinking: game.isAiThinking,
    aiMoveSignal: game.aiMoveSignal,
    durationMs: preferences.aiReplyDuration,
  });
  const announcedAiMove =
    preferences.boardVisibility !== "always" &&
    aiReply.active &&
    !aiReply.thinking
      ? findLastAiMoveNotation(game.moves, playerColor, start.startingFen)
      : null;

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

  // Navigate to result when game is over
  useEffect(() => {
    if (game.gameStatus !== "in_progress" && game.playerResult) {
      // Capture the narrowed value: the `!` it replaces was real — narrowing
      // is lost across the property access inside the setTimeout closure.
      const playerResult = game.playerResult;
      if (!saved.current) {
        saved.current = true;
        void saveGame({
          id: String(Date.now()),
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
    start.startingFen,
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

      <SessionTopBar />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Game Info */}
        <GameInfo
          isPlayerTurn={game.isPlayerTurn}
          isAiThinking={game.isAiThinking}
          gameStatus={game.gameStatus}
          resigned={game.resigned}
          aiMoveFailed={game.aiMoveFailed}
          announcedAiMove={announcedAiMove}
          skillLevel={skillLevel}
          moveCount={game.moves.length}
        />

        {/* Board, as the player's boardVisibility preference surfaces it */}
        <BoardPeek
          fen={game.currentFen}
          moves={game.moves}
          startingFen={start.startingFen}
          playerColor={playerColor}
          onPeek={aiReply.dismiss}
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
