import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { getEloForSkillLevel } from "@blindfold-chess/features/ai-game";
import {
  useTheme,
  fontSize,
  fontWeight,
  spacing,
  borderRadius,
} from "../../../theme";
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
  /**
   * The AI's last move (e.g. "1... e5") while it is being announced, null
   * otherwise. It takes the place of "Your Turn" for as long as the player's
   * AI-reply-duration preference says.
   */
  announcedAiMove?: string | null;
  skillLevel: SkillLevel;
  moveCount: number;
};

export function GameInfo({
  isPlayerTurn,
  isAiThinking,
  gameStatus,
  resigned = false,
  aiMoveFailed = false,
  announcedAiMove = null,
  skillLevel,
  moveCount,
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
    if (announcedAiMove) {
      return t("aiGame.session.aiPlayed", { move: announcedAiMove });
    }
    if (isPlayerTurn) return t("aiGame.session.yourTurn");
    return t("aiGame.session.aiThinking");
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.statusRow}>
        <Text style={[styles.statusText, { color: colors.foreground }]}>
          {getStatusText()}
        </Text>
        {isAiThinking && <Spinner color={colors.primary} />}
      </View>
      <View style={styles.infoRow}>
        <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
          {t("aiGame.setup.levelWithElo", {
            level: skillLevel,
            elo: getEloForSkillLevel(skillLevel),
          })}
        </Text>
        <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
          {t("aiGame.session.moves")}: {moveCount}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  statusText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    textAlign: "center",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoText: {
    fontSize: fontSize.sm,
  },
});
