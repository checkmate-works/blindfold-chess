import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { boardThemeColors } from "@blindfold-chess/ui";

import { STATIC_BOARD_RADIUS } from "../../../components";
import { useGamePreferences } from "../../../lib/game-preferences";
import { fontWeight } from "../../../theme";
import {
  GUIDE_BOARD_MAX_SIZE,
  GUIDE_COLORS,
  GuideSvgLayer,
  type GuideArrow,
} from "./GuideBoard";
import { isLightGuideSquare } from "./geometry";

export type GuideQuadrant =
  "top-left" | "top-right" | "bottom-left" | "bottom-right";

const QUADRANT_SQUARES: Record<
  GuideQuadrant,
  { files: readonly string[]; ranks: readonly string[] }
> = {
  "top-left": { files: ["a", "b", "c", "d"], ranks: ["8", "7", "6", "5"] },
  "top-right": { files: ["e", "f", "g", "h"], ranks: ["8", "7", "6", "5"] },
  "bottom-left": { files: ["a", "b", "c", "d"], ranks: ["4", "3", "2", "1"] },
  "bottom-right": { files: ["e", "f", "g", "h"], ranks: ["4", "3", "2", "1"] },
};

export function isGuideQuadrant(value: unknown): value is GuideQuadrant {
  return typeof value === "string" && value in QUADRANT_SQUARES;
}

/**
 * The web's `QuadrantGridBoard`: one quarter of the board blown up to the
 * full board's size, 4 × 4 squares, for the 5kyu lesson that reads a
 * quarter as a small board of its own. `StaticBoard` is always 8 × 8, so
 * this draws its own squares in the same theme, corners and letters.
 * Squares in `highlighted` get the yellow ring; `arrows` are in the grid's
 * own 0–100 space (a square is 25 wide).
 */
export function QuadrantGrid({
  quadrant = "top-left",
  highlighted = [],
  arrows = [],
}: {
  quadrant?: GuideQuadrant;
  highlighted?: readonly string[];
  arrows?: readonly GuideArrow[];
}) {
  const { preferences } = useGamePreferences();
  const theme = boardThemeColors[preferences.boardTheme];
  const { files, ranks } = QUADRANT_SQUARES[quadrant];
  // The arrows' SVG needs a size in points, known after the first layout.
  const [size, setSize] = useState(0);

  return (
    <View
      style={styles.board}
      onLayout={(event) => setSize(event.nativeEvent.layout.width)}
    >
      {ranks.map((rank, row) => (
        <View key={rank} style={styles.row}>
          {files.map((file, col) => {
            const square = `${file}${rank}`;
            const light = isLightGuideSquare(square);
            const labelColor = light ? theme.lightText : theme.darkText;
            return (
              <View
                key={square}
                style={[
                  styles.square,
                  { backgroundColor: light ? theme.light : theme.dark },
                ]}
              >
                {highlighted.includes(square) && <View style={styles.ring} />}
                {preferences.showCoordinates && col === 0 && (
                  <Text style={[styles.rankLabel, { color: labelColor }]}>
                    {rank}
                  </Text>
                )}
                {preferences.showCoordinates && row === ranks.length - 1 && (
                  <Text style={[styles.fileLabel, { color: labelColor }]}>
                    {file}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      ))}
      {size > 0 && <GuideSvgLayer size={size} arrows={arrows} />}
    </View>
  );
}

/**
 * The 5kyu arrows: the web's 8 × 6 markers (counted in stroke widths, as
 * SVG markers are), the tip one stroke width past the end point.
 */
export function gridArrow(
  from: { x: number; y: number },
  to: { x: number; y: number },
  color: string,
  strokeWidth: number,
  dash?: string,
): GuideArrow {
  return {
    x1: from.x,
    y1: from.y,
    x2: to.x,
    y2: to.y,
    color,
    strokeWidth,
    headLength: 8 * strokeWidth,
    headWidth: 6 * strokeWidth,
    tipOffset: 1 * strokeWidth,
    dash,
  };
}

export { GUIDE_COLORS };

const styles = StyleSheet.create({
  board: {
    width: "100%",
    maxWidth: GUIDE_BOARD_MAX_SIZE,
    aspectRatio: 1,
    alignSelf: "center",
    borderRadius: STATIC_BOARD_RADIUS,
    overflow: "hidden",
  },
  row: {
    flex: 1,
    flexDirection: "row",
  },
  square: {
    flex: 1,
  },
  ring: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: GUIDE_COLORS.ring,
  },
  rankLabel: {
    position: "absolute",
    top: 2,
    left: 3,
    fontSize: 11,
    fontWeight: fontWeight.semibold,
  },
  fileLabel: {
    position: "absolute",
    bottom: 2,
    right: 3,
    fontSize: 11,
    fontWeight: fontWeight.semibold,
  },
});
