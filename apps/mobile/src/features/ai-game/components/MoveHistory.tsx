import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import {
  fullmoveNumberFromFen,
  isBlackToMoveFromFen,
} from "@blindfold-chess/features/chess-core/fen";
import { formatMovesToPgn } from "@blindfold-chess/features/chess-core/pgn-format";
import type { AlgebraicNotation } from "@blindfold-chess/types";
import {
  useTheme,
  fontSize,
  fontWeight,
  spacing,
  borderRadius,
  monoFont,
} from "../../../theme";

type MoveHistoryProps = {
  moves: AlgebraicNotation[];
  /** The game's starting position; the standard position when absent. */
  startingFen?: string;
};

/**
 * The game so far as a scoresheet: one row per move number, White's move
 * then Black's, the latest one marked.
 *
 * It is drawn only inside the session's moves sheet, never on the session
 * screen itself: a move list in view the whole time is a picture of the
 * game to read back, which is exactly what blindfold play takes away. The
 * player opens it on purpose, as they would peek at the board.
 */
export function MoveHistory({ moves, startingFen }: MoveHistoryProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  if (moves.length === 0) {
    return (
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
        {t("aiGame.session.noMoves")}
      </Text>
    );
  }

  // Numbered from the starting position: a game set up with Black to move
  // at move 24 opens with "24. ... <move>", not "1.".
  const movePairs = startingFen
    ? formatMovesToPgn(
        moves,
        isBlackToMoveFromFen(startingFen),
        fullmoveNumberFromFen(startingFen),
      )
    : formatMovesToPgn(moves, false, 1);

  const lastMoveIndex = moves.length - 1;

  const moveCell = (move: string | undefined, index: number | undefined) => (
    <View style={styles.moveCell}>
      <Text
        style={[
          styles.moveText,
          {
            color: colors.foreground,
            backgroundColor:
              index === lastMoveIndex ? colors.accent : "transparent",
          },
        ]}
      >
        {move ?? "…"}
      </Text>
    </View>
  );

  return (
    <View testID="move-history">
      {movePairs.map((pair, i) => (
        <View
          key={pair.moveNumber}
          style={[
            styles.row,
            i > 0 && {
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: colors.rowSeparator,
            },
          ]}
        >
          <Text style={[styles.moveNumber, { color: colors.mutedForeground }]}>
            {pair.moveNumber}.
          </Text>
          {moveCell(pair.whiteMove, pair.whiteMoveIndex)}
          {pair.blackMove ? (
            moveCell(pair.blackMove, pair.blackMoveIndex)
          ) : (
            <View style={styles.moveCell} />
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyText: {
    fontSize: fontSize.md,
    textAlign: "center",
    paddingVertical: spacing.lg,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  moveNumber: {
    width: 48,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    fontVariant: ["tabular-nums"],
  },
  moveCell: {
    flex: 1,
    alignItems: "flex-start",
  },
  moveText: {
    fontSize: fontSize.md,
    fontFamily: monoFont,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
});
