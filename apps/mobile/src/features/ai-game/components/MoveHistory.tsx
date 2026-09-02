import { useRef, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { formatMovesToPgn } from "@blindfold-chess/features/chess-core/pgn-format";
import type { AlgebraicNotation } from "@blindfold-chess/types";
import {
  useTheme,
  fontSize,
  fontWeight,
  spacing,
  borderRadius,
} from "../../../theme";

type MoveHistoryProps = {
  moves: AlgebraicNotation[];
};

export function MoveHistory({ moves }: MoveHistoryProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Auto-scroll to bottom on new move
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [moves.length]);

  if (moves.length === 0) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          {t("aiGame.session.noMoves")}
        </Text>
      </View>
    );
  }

  // Group moves in pairs (1. e4 e5, 2. Nf3 Nc6, ...).
  //
  // The AI game always begins from the standard position — `useGameSession`
  // holds no starting FEN and never hands one to the engine — hence White
  // first at move 1. Those two facts are arguments here rather than arithmetic
  // baked into the loop, so the day the session gains custom starts this call
  // is the whole change; pairing by hand is how the web build ended up
  // labelling a game resumed at move 24 as "1.".
  const movePairs = formatMovesToPgn(moves, false, 1);

  const lastMoveIndex = moves.length - 1;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <ScrollView ref={scrollViewRef} style={styles.scrollView}>
        {movePairs.map((pair) => {
          const whiteIsLast = pair.whiteMoveIndex === lastMoveIndex;
          const blackIsLast = pair.blackMoveIndex === lastMoveIndex;

          return (
            <View key={pair.moveNumber} style={styles.moveRow}>
              <Text
                style={[styles.moveNumber, { color: colors.mutedForeground }]}
              >
                {pair.moveNumber}.
              </Text>
              <Text
                style={[
                  styles.moveText,
                  {
                    color: colors.foreground,
                    backgroundColor: whiteIsLast
                      ? colors.accent
                      : "transparent",
                  },
                  whiteIsLast && styles.highlightedMove,
                ]}
              >
                {pair.whiteMove}
              </Text>
              {pair.blackMove && (
                <Text
                  style={[
                    styles.moveText,
                    {
                      color: colors.foreground,
                      backgroundColor: blackIsLast
                        ? colors.accent
                        : "transparent",
                    },
                    blackIsLast && styles.highlightedMove,
                  ]}
                >
                  {pair.blackMove}
                </Text>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.sm,
    maxHeight: 200,
  },
  scrollView: {
    flex: 1,
  },
  emptyText: {
    fontSize: fontSize.sm,
    textAlign: "center",
    paddingVertical: spacing.md,
  },
  moveRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.xs / 2,
    gap: spacing.sm,
  },
  moveNumber: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    width: 30,
    textAlign: "right",
  },
  moveText: {
    fontSize: fontSize.sm,
    fontFamily: "monospace",
    minWidth: 50,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
  },
  highlightedMove: {
    borderRadius: borderRadius.sm,
  },
});
