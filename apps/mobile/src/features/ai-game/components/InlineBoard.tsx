import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { getLastMoveDetails } from "@blindfold-chess/features/chess-core";
import type { MoveSquares } from "@blindfold-chess/features/board-display";
import type { AlgebraicNotation, Side } from "@blindfold-chess/types";

import { useGamePreferences } from "../../../lib/game-preferences";
import {
  useTheme,
  fontSize,
  fontWeight,
  spacing,
  borderRadius,
} from "../../../theme";
import { ChessBoard, useChessBoardSize } from "./ChessBoard";
import { Spinner } from "./Spinner";

type InlineBoardProps = {
  fen: string;
  /** The game's moves in SAN, used to find the last move's squares. */
  moves: AlgebraicNotation[];
  playerColor: Side;
  /** Draw the board from Black's side. */
  flipped: boolean;
  /** The position the moves start from; the standard start when omitted. */
  startingFen?: string;
  /** In `'peek'` mode: whether the player has the board open right now. */
  revealed: boolean;
  onReveal: () => void;
  /** The AI is computing its reply. */
  thinking: boolean;
  /**
   * The AI's last move while it is being announced ("1... e5"), null
   * otherwise. Shown where the board would be, so a player who cannot see
   * the board still learns the reply without looking elsewhere.
   */
  announcedAiMove: string | null;
  /**
   * Board input, passed only while the player may move. The board takes it
   * only while it is uncovered (`'always'`, or a peek that is open), so a
   * masked board can never play a move.
   */
  onMove?: (san: string) => void;
  onIllegalMove?: (attempt: string, squares: MoveSquares) => void;
  onDragActiveChange?: (active: boolean) => void;
};

/**
 * The AI game's board, always in its place at the top of the screen as on
 * the web, and covered according to the game's `boardVisibility`:
 *
 * - `'always'`: the board.
 * - `'peek'`: the board under a mask. Tapping the mask opens it (the screen
 *   counts that as a peek) and the screen closes it again once the
 *   player's next move is accepted. There is no button to close it sooner,
 *   as on the web, so the screen keeps its layout.
 * - `'never'`: no board at all, but a panel of the board's size in its
 *   place that carries the AI's reply. A phone fits the whole game on one
 *   screen, so there is room to spare, and keeping the board's footprint
 *   means switching the visibility mid-game (the gear in the top row) does
 *   not move the error line and the keypad under the player's finger.
 *
 * While the AI thinks, an open `'always'` board is covered by a light scrim
 * with a "thinking" chip, so the turn shows where the player is looking.
 *
 * The mask is laid over a board that is still drawn, so the two are the same
 * size without measuring; the mask is opaque, so nothing shows through.
 */
export function InlineBoard({
  fen,
  moves,
  playerColor,
  flipped,
  startingFen,
  revealed,
  onReveal,
  thinking,
  announcedAiMove,
  onMove,
  onIllegalMove,
  onDragActiveChange,
}: InlineBoardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { preferences } = useGamePreferences();
  const boardSize = useChessBoardSize();

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
      <View style={styles.container}>
        <View
          accessibilityLiveRegion="polite"
          style={[
            styles.placeholder,
            {
              width: boardSize,
              height: boardSize,
              backgroundColor: colors.card,
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
          {reply ? null : (
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              {t("aiGame.session.boardHidden")}
            </Text>
          )}
        </View>
      </View>
    );
  }

  const masked = preferences.boardVisibility === "peek" && !revealed;

  return (
    <View style={styles.container}>
      <View>
        <ChessBoard
          fen={fen}
          flipped={flipped}
          playerColor={playerColor}
          lastMove={lastMove}
          onMove={masked ? undefined : onMove}
          onIllegalMove={masked ? undefined : onIllegalMove}
          onDragActiveChange={onDragActiveChange}
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
        {/* On a board that is always open the mask and its reply are never
            drawn, so the AI's turn reads here instead, as on the web: a
            light scrim that keeps the position readable and a spinning chip
            that tells a working engine from a stuck one. It takes no
            touches and is laid over the board, so nothing moves. */}
        {thinking && preferences.boardVisibility === "always" ? (
          <View
            pointerEvents="none"
            accessibilityLiveRegion="polite"
            style={styles.thinkingOverlay}
          >
            <View
              style={[
                StyleSheet.absoluteFill,
                styles.scrim,
                { backgroundColor: colors.page },
              ]}
            />
            <View
              style={[
                styles.thinkingChip,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.panelBorder,
                },
              ]}
            >
              <Spinner color={colors.primary} />
              <Text
                numberOfLines={1}
                style={[styles.thinkingText, { color: colors.foreground }]}
              >
                {t("aiGame.session.aiThinking")}
              </Text>
            </View>
          </View>
        ) : null}
      </View>
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
  thinkingOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: borderRadius.sm,
    overflow: "hidden",
  },
  scrim: {
    opacity: 0.4,
  },
  thinkingChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    maxWidth: "90%",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.full,
  },
  thinkingText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
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
