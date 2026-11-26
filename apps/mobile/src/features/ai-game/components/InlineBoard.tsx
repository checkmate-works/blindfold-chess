import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { getLastMoveDetails } from "@blindfold-chess/features/chess-core";
import type { AlgebraicNotation, Side } from "@blindfold-chess/types";

import { Button } from "../../../components";
import { useGamePreferences } from "../../../lib/game-preferences";
import {
  useTheme,
  fontSize,
  fontWeight,
  spacing,
  borderRadius,
} from "../../../theme";
import { ChessBoard } from "./ChessBoard";
import { Spinner } from "./Spinner";

type InlineBoardProps = {
  fen: string;
  /** The game's moves in SAN, used to find the last move's squares. */
  moves: AlgebraicNotation[];
  playerColor: Side;
  /** The position the moves start from; the standard start when omitted. */
  startingFen?: string;
  /** In `'peek'` mode: whether the player has the board open right now. */
  revealed: boolean;
  onReveal: () => void;
  onHide: () => void;
  /** The AI is computing its reply. */
  thinking: boolean;
  /**
   * The AI's last move while it is being announced ("1... e5"), null
   * otherwise. Shown where the board would be, so a player who cannot see
   * the board still learns the reply without looking elsewhere.
   */
  announcedAiMove: string | null;
};

/**
 * The AI game's board, always in its place at the top of the screen as on
 * the web, and covered according to the game's `boardVisibility`:
 *
 * - `'always'`: the board.
 * - `'peek'`: the board under a mask. Tapping the mask opens it (the screen
 *   counts that as a peek) and the screen closes it again after the next
 *   move.
 * - `'never'`: no board at all, only a bar that carries the AI's reply.
 *
 * The mask is laid over a board that is still drawn, so the two are the same
 * size without measuring; the mask is opaque, so nothing shows through.
 */
export function InlineBoard({
  fen,
  moves,
  playerColor,
  startingFen,
  revealed,
  onReveal,
  onHide,
  thinking,
  announcedAiMove,
}: InlineBoardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { preferences } = useGamePreferences();

  const lastMove = useMemo(() => {
    try {
      return getLastMoveDetails(moves, startingFen);
    } catch {
      // An unreadable starting FEN: draw the board without the highlight
      // rather than take the session screen down.
      return null;
    }
  }, [moves, startingFen]);

  const reply = thinking ? (
    <View style={styles.reply}>
      <Spinner color={colors.primary} />
      <Text style={[styles.replyText, { color: colors.foreground }]}>
        {t("aiGame.session.aiThinking")}
      </Text>
    </View>
  ) : announcedAiMove ? (
    <Text style={[styles.replyText, { color: colors.foreground }]}>
      {t("aiGame.session.aiPlayed", { move: announcedAiMove })}
    </Text>
  ) : null;

  if (preferences.boardVisibility === "never") {
    return (
      <View
        style={[
          styles.bar,
          { backgroundColor: colors.card, borderColor: colors.panelBorder },
        ]}
      >
        {reply ?? (
          <View style={styles.reply}>
            <Ionicons
              name="eye-off-outline"
              size={18}
              color={colors.mutedForeground}
            />
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              {t("aiGame.session.boardHidden")}
            </Text>
          </View>
        )}
      </View>
    );
  }

  const masked = preferences.boardVisibility === "peek" && !revealed;

  return (
    <View style={styles.container}>
      <View>
        <ChessBoard
          fen={fen}
          flipped={playerColor === "black"}
          playerColor={playerColor}
          lastMove={lastMove}
        />
        {masked ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("aiGame.session.showBoard")}
            onPress={onReveal}
            style={({ pressed }) => [
              styles.mask,
              {
                backgroundColor: pressed ? colors.muted : colors.card,
                borderColor: colors.panelBorder,
              },
            ]}
          >
            {reply ?? (
              <Ionicons
                name="eye-off-outline"
                size={32}
                color={colors.mutedForeground}
              />
            )}
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              {reply
                ? t("aiGame.session.revealBoard")
                : `${t("aiGame.session.boardHidden")} · ${t("aiGame.session.revealBoard")}`}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {preferences.boardVisibility === "peek" && revealed ? (
        <Button
          title={t("aiGame.session.hideBoard")}
          icon="eye-off-outline"
          variant="ghost"
          size="sm"
          onPress={onHide}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: spacing.xs,
  },
  mask: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
  },
  bar: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.md,
  },
  reply: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  replyText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  hint: {
    fontSize: fontSize.sm,
  },
});
