import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { getDiagonalSquares } from "@blindfold-chess/features/diagonal-quiz";
import { ChessPieceIcon } from "@blindfold-chess/icons";
import type { Square } from "@blindfold-chess/types";

import { StaticBoard } from "../../../components";
import { fontSize, useTheme, withAlpha } from "../../../theme";

/** The web board's `max-w-xs`. */
const DEFAULT_MAX_SIZE = 320;

/** The web's `bg-emerald-500/40` and `bg-sky-500/40`. */
const DIAGONAL_TINT = "rgba(16, 185, 129, 0.4)";
const ANTI_DIAGONAL_TINT = "rgba(14, 165, 233, 0.4)";

/**
 * The web's `DiagonalBoard`: the board in the player's theme with the asked
 * square's two lines tinted, the diagonal green and the anti-diagonal blue
 * (their crossing, the square itself, in the primary colour) and a white
 * bishop on the square, over a legend naming each colour. Up to `maxSize`
 * wide (the web's 320 by default), narrower when its container is.
 */
export function DiagonalBoard({
  square,
  maxSize = DEFAULT_MAX_SIZE,
}: {
  square: Square;
  maxSize?: number;
}) {
  const { colors } = useTheme();

  const squareTint = useMemo(() => {
    const { diagonal, antiDiagonal } = getDiagonalSquares(square);
    const onDiagonal = new Set<string>(diagonal);
    const onAntiDiagonal = new Set<string>(antiDiagonal);
    return (target: Square): string | null => {
      if (target === square) return withAlpha(colors.primary, 0.5);
      const d = onDiagonal.has(target);
      const a = onAntiDiagonal.has(target);
      if (d && a) return withAlpha(colors.primary, 0.3);
      if (d) return DIAGONAL_TINT;
      if (a) return ANTI_DIAGONAL_TINT;
      return null;
    };
  }, [square, colors.primary]);

  return (
    <View style={[styles.container, { maxWidth: maxSize }]}>
      <StaticBoard
        maxSize={maxSize}
        squareTint={squareTint}
        renderSquare={(target, squareSize) =>
          target === square && (
            <ChessPieceIcon type="b" color="w" size={squareSize * 0.8} />
          )
        }
      />

      <View style={styles.legend}>
        <LegendItem type="diagonal" tint={DIAGONAL_TINT} />
        <LegendItem type="antiDiagonal" tint={ANTI_DIAGONAL_TINT} />
      </View>
    </View>
  );
}

function LegendItem({
  type,
  tint,
}: {
  type: "diagonal" | "antiDiagonal";
  tint: string;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.swatch,
          { backgroundColor: tint, borderColor: colors.border },
        ]}
      />
      <Text style={[styles.legendText, { color: colors.mutedForeground }]}>
        {t(`diagonalQuiz.board.${type}`)}
        {"\n"}
        <Text style={styles.legendNote}>
          {t(`diagonalQuiz.board.${type}Direction`)}
        </Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignSelf: "center",
  },
  // The web's `flex justify-center gap-4 mt-3 text-xs`.
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  swatch: {
    width: 12,
    height: 12,
    marginTop: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  legendText: {
    fontSize: fontSize.xs,
    lineHeight: 15,
  },
  legendNote: {
    opacity: 0.75,
  },
});
