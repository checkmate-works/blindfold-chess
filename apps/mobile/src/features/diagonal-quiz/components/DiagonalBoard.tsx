import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { getDiagonalSquares } from "@blindfold-chess/features/diagonal-quiz";
import { ChessPieceIcon } from "@blindfold-chess/icons";
import type { Square } from "@blindfold-chess/types";
import { DISPLAY_RANKS, FILES } from "@blindfold-chess/types";
import { boardThemeColors } from "@blindfold-chess/ui";

import { useGamePreferences } from "../../../lib/game-preferences";
import { fontSize, fontWeight, useTheme } from "../../../theme";

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
  const { preferences } = useGamePreferences();
  const theme = boardThemeColors[preferences.boardTheme];
  const [width, setWidth] = useState(0);
  const squareSize = width / 8;

  const overlays = useMemo(() => {
    const { diagonal, antiDiagonal } = getDiagonalSquares(square);
    const onDiagonal = new Set<string>(diagonal);
    const onAntiDiagonal = new Set<string>(antiDiagonal);
    return (target: string): string | null => {
      if (target === square) return `${colors.primary}80`;
      const d = onDiagonal.has(target);
      const a = onAntiDiagonal.has(target);
      if (d && a) return `${colors.primary}4d`;
      if (d) return DIAGONAL_TINT;
      if (a) return ANTI_DIAGONAL_TINT;
      return null;
    };
  }, [square, colors.primary]);

  return (
    <View style={[styles.container, { maxWidth: maxSize }]}>
      <View
        style={styles.board}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      >
        {width > 0 &&
          DISPLAY_RANKS.map((rank, rankIndex) => (
            <View key={rank} style={styles.row}>
              {FILES.map((file, fileIndex) => {
                const name = `${file}${rank}`;
                const light = (fileIndex + rankIndex) % 2 === 0;
                const overlay = overlays(name);
                const labelColor = light ? theme.lightText : theme.darkText;
                return (
                  <View
                    key={name}
                    style={[
                      styles.square,
                      {
                        width: squareSize,
                        height: squareSize,
                        backgroundColor: light ? theme.light : theme.dark,
                      },
                    ]}
                  >
                    {overlay && (
                      <View
                        style={[
                          StyleSheet.absoluteFill,
                          { backgroundColor: overlay },
                        ]}
                      />
                    )}
                    {name === square && (
                      <ChessPieceIcon
                        type="b"
                        color="w"
                        size={squareSize * 0.8}
                      />
                    )}
                    {fileIndex === 0 && (
                      <Text style={[styles.rankLabel, { color: labelColor }]}>
                        {rank}
                      </Text>
                    )}
                    {rankIndex === DISPLAY_RANKS.length - 1 && (
                      <Text style={[styles.fileLabel, { color: labelColor }]}>
                        {file}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
      </View>

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
  // The web's `aspect-square rounded-md overflow-hidden`.
  board: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 6,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
  },
  square: {
    alignItems: "center",
    justifyContent: "center",
  },
  rankLabel: {
    position: "absolute",
    top: 1,
    left: 2,
    fontSize: 10,
    fontWeight: fontWeight.semibold,
  },
  fileLabel: {
    position: "absolute",
    bottom: 0,
    right: 2,
    fontSize: 10,
    fontWeight: fontWeight.semibold,
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
