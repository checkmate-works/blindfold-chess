import { useRef, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
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

  // Group moves in pairs (1. e4 e5, 2. Nf3 Nc6, ...)
  const movePairs: { number: number; white: string; black?: string }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push({
      number: Math.floor(i / 2) + 1,
      white: moves[i],
      black: moves[i + 1],
    });
  }

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
          const whiteIndex = (pair.number - 1) * 2;
          const blackIndex = whiteIndex + 1;

          return (
            <View key={pair.number} style={styles.moveRow}>
              <Text
                style={[styles.moveNumber, { color: colors.mutedForeground }]}
              >
                {pair.number}.
              </Text>
              <Text
                style={[
                  styles.moveText,
                  {
                    color: colors.foreground,
                    backgroundColor:
                      whiteIndex === lastMoveIndex
                        ? colors.accent
                        : "transparent",
                  },
                  whiteIndex === lastMoveIndex && styles.highlightedMove,
                ]}
              >
                {pair.white}
              </Text>
              {pair.black && (
                <Text
                  style={[
                    styles.moveText,
                    {
                      color: colors.foreground,
                      backgroundColor:
                        blackIndex === lastMoveIndex
                          ? colors.accent
                          : "transparent",
                    },
                    blackIndex === lastMoveIndex && styles.highlightedMove,
                  ]}
                >
                  {pair.black}
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
