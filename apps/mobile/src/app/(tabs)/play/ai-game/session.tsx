import { useEffect } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { Side } from "@blindfold-chess/types";

import { StockfishWebView } from "../../../../features/ai-game/engine";
import {
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
import { useTheme, fontSize, fontWeight, spacing } from "../../../../theme";

export default function AiGameSession() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{
    playerColor: string;
    skillLevel: string;
  }>();

  const playerColor = (params.playerColor || "white") as Side;
  const skillLevel = (
    params.skillLevel ? parseInt(params.skillLevel, 10) : 5
  ) as SkillLevel;

  const ai = useAiVersus(skillLevel);

  const game = useGameSession({
    playerColor,
    skillLevel,
    getAiMove: ai.getAiMove,
    isAiLoading: ai.isLoading,
  });

  // Navigate to result when game is over
  useEffect(() => {
    if (game.gameStatus !== "in_progress" && game.playerResult) {
      const timer = setTimeout(() => {
        router.replace({
          pathname: "/(tabs)/play/ai-game/result",
          params: {
            result: game.playerResult!,
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
    game.moves.length,
    router,
  ]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "bottom"]}
    >
      {/* Hidden WebView for Stockfish engine */}
      <StockfishWebView
        ref={ai.webViewRef}
        onMessage={ai.handleMessage}
        onReady={ai.handleWebViewReady}
        onError={ai.handleWebViewError}
      />

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
          skillLevel={skillLevel}
          moveCount={game.moves.length}
        />

        {/* Error message */}
        {game.error && (
          <Text style={[styles.errorText, { color: colors.destructive }]}>
            {game.error}
          </Text>
        )}

        {/* Move History */}
        <MoveHistory moves={game.moves} />

        {/* Input area */}
        {game.gameStatus === "in_progress" &&
          (game.isPlayerTurn ? (
            <ButtonInput
              fen={game.currentFen}
              onSubmit={game.submitMove}
              disabled={ai.isLoading || game.isAiThinking}
            />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
