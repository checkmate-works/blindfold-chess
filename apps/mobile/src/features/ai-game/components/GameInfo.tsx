import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { getEloForSkillLevel } from "@blindfold-chess/features/ai-game";
import { useTheme, fontSize, fontWeight, spacing } from "../../../theme";
import type { GameStatus, SkillLevel } from "../lib/types";
import { Spinner } from "./Spinner";

type GameInfoProps = {
  isPlayerTurn: boolean;
  isAiThinking: boolean;
  gameStatus: GameStatus;
  /** The game ended by the player's resignation, not on the board. */
  resigned?: boolean;
  /** The last AI move failed and is waiting for Retry. */
  aiMoveFailed?: boolean;
  skillLevel: SkillLevel;
};

/**
 * Whose turn it is (or how the game ended) over the opponent's level, sized
 * to sit in the session's top row between the × and the board controls. It
 * is two short lines rather than a panel of its own: with the board, the
 * move list and the keypad below, every row of height decides whether the
 * keypad still fits on the screen.
 */
export function GameInfo({
  isPlayerTurn,
  isAiThinking,
  gameStatus,
  resigned = false,
  aiMoveFailed = false,
  skillLevel,
}: GameInfoProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const getStatusText = () => {
    if (resigned) return t("aiGame.session.resigned");
    if (gameStatus === "checkmate") return t("aiGame.session.checkmate");
    if (gameStatus === "stalemate") return t("aiGame.session.stalemate");
    if (gameStatus === "draw") return t("aiGame.session.draw");
    if (isAiThinking) return t("aiGame.session.aiThinking");
    if (aiMoveFailed) return t("aiGame.session.aiMoveFailed");
    if (isPlayerTurn) return t("aiGame.session.yourTurn");
    return t("aiGame.session.aiThinking");
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusRow}>
        <Text
          numberOfLines={1}
          style={[styles.statusText, { color: colors.foreground }]}
        >
          {getStatusText()}
        </Text>
        {isAiThinking && <Spinner color={colors.primary} />}
      </View>
      <Text
        numberOfLines={1}
        style={[styles.levelText, { color: colors.mutedForeground }]}
      >
        {t("aiGame.setup.levelWithElo", {
          level: skillLevel,
          elo: getEloForSkillLevel(skillLevel),
        })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  statusText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  levelText: {
    fontSize: fontSize.xs,
  },
});
