import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { getLastMoveDetails } from "@blindfold-chess/features/chess-core";
import type { AlgebraicNotation, Side } from "@blindfold-chess/types";

import { useGamePreferences } from "../../../lib/game-preferences";
import {
  useTheme,
  fontSize,
  fontWeight,
  spacing,
  borderRadius,
} from "../../../theme";
import { BoardViewModal } from "./BoardViewModal";
import { ChessBoard } from "./ChessBoard";

type BoardPeekProps = {
  fen: string;
  /** The game's moves in SAN, used to find the last move's squares. */
  moves: AlgebraicNotation[];
  playerColor: Side;
  /**
   * The position the moves start from, for a game set up from a FEN or PGN.
   * Omitted means the standard start; if the moves do not replay from the
   * position assumed, the last move is simply not highlighted.
   */
  startingFen?: string;
};

/**
 * Where the AI game's board surfaces, decided by the player's
 * `boardVisibility` preference: `'always'` draws the board inline, `'peek'`
 * shows a button that opens it in a modal, `'never'` shows nothing.
 */
export function BoardPeek({
  fen,
  moves,
  playerColor,
  startingFen,
}: BoardPeekProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { preferences } = useGamePreferences();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const lastMove = useMemo(() => {
    try {
      return getLastMoveDetails(moves, startingFen);
    } catch {
      // An unreadable starting FEN: draw the board without the highlight
      // rather than take the session screen down.
      return null;
    }
  }, [moves, startingFen]);

  switch (preferences.boardVisibility) {
    case "never":
      return null;
    case "always":
      return (
        <ChessBoard
          fen={fen}
          flipped={playerColor === "black"}
          playerColor={playerColor}
          lastMove={lastMove}
        />
      );
    case "peek":
      return (
        <>
          <Pressable
            style={[
              styles.showBoardButton,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => setIsModalVisible(true)}
          >
            <Text
              style={[styles.showBoardButtonText, { color: colors.foreground }]}
            >
              {t("aiGame.session.showBoard")}
            </Text>
          </Pressable>
          <BoardViewModal
            visible={isModalVisible}
            onClose={() => setIsModalVisible(false)}
            fen={fen}
            playerColor={playerColor}
            lastMove={lastMove}
          />
        </>
      );
  }
}

const styles = StyleSheet.create({
  showBoardButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  showBoardButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
});
