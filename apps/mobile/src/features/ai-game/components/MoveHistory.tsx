import { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  type ScrollViewInstance,
} from "react-native";
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
 * The game so far as one line of moves that scrolls sideways, the web's
 * strip above the board ("1. e4 e5 2. Nf3 ..."), kept at the latest move.
 * One line because the session has to fit the board and the keypad on a
 * phone screen with it; the full list is on the saved game's page.
 */
export function MoveHistory({ moves, startingFen }: MoveHistoryProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const scrollViewRef = useRef<ScrollViewInstance>(null);

  useEffect(() => {
    // Keep the latest move in view.
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [moves.length]);

  if (moves.length === 0) {
    return (
      <View
        style={[
          styles.container,
          styles.empty,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          {t("aiGame.session.noMoves")}
        </Text>
      </View>
    );
  }

  // Group moves in pairs (1. e4 e5, 2. Nf3 Nc6, ...), numbered from the
  // starting position: a game set up with Black to move at move 24 opens with
  // "24. ... <move>", not "1.". Numbering by hand from 1 is how the web build
  // once labelled such a resumed game as "1.".
  const movePairs = startingFen
    ? formatMovesToPgn(
        moves,
        isBlackToMoveFromFen(startingFen),
        fullmoveNumberFromFen(startingFen),
      )
    : formatMovesToPgn(moves, false, 1);

  const lastMoveIndex = moves.length - 1;

  const moveStyle = (isLast: boolean) => [
    styles.moveText,
    {
      color: colors.foreground,
      backgroundColor: isLast ? colors.accent : "transparent",
    },
  ];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
      >
        {movePairs.map((pair) => (
          <View key={pair.moveNumber} style={styles.pair}>
            <Text
              style={[styles.moveNumber, { color: colors.mutedForeground }]}
            >
              {pair.moveNumber}.
            </Text>
            <Text style={moveStyle(pair.whiteMoveIndex === lastMoveIndex)}>
              {pair.whiteMove}
            </Text>
            {pair.blackMove && (
              <Text style={moveStyle(pair.blackMoveIndex === lastMoveIndex)}>
                {pair.blackMove}
              </Text>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

/** The strip's height with or without moves, so the layout never jumps. */
const STRIP_HEIGHT = 36;

const styles = StyleSheet.create({
  container: {
    height: STRIP_HEIGHT,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    justifyContent: "center",
  },
  empty: {
    alignItems: "center",
  },
  emptyText: {
    fontSize: fontSize.sm,
  },
  strip: {
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    gap: spacing.md,
  },
  pair: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  moveNumber: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  moveText: {
    fontSize: fontSize.sm,
    fontFamily: monoFont,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
});
