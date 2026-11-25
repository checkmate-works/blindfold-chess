import { memo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { ViewStyle } from "react-native";
import {
  type QuadrantId,
  type VisualQuadrant,
  quadrantIdAtVisualPosition,
} from "@blindfold-chess/features/quadrants";
import type { ResolvedBoardOrientation } from "@blindfold-chess/types";

import { StaticBoard } from "../../../components";
import { useGamePreferences } from "../../../lib/game-preferences";

/** The web board's `max-w-xs`. */
export const QUADRANT_BOARD_MAX_SIZE = 320;

/**
 * The web's Tailwind colours, which have no theme token on either platform:
 * `yellow-400` for the quarter lines, `green-500` / `red-500` for the
 * verdict lines and (at 30%) the verdict tint over a quarter.
 */
const LINE_COLOR = "#facc15";
const CORRECT_COLOR = "#22c55e";
const WRONG_COLOR = "#ef4444";
const TINT_ALPHA = "4D";

/** The web's `w-[3px]` / `h-[3px]` lines. */
const LINE_WIDTH = 3;

const QUARTERS: readonly VisualQuadrant[] = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
];

type QuadrantBoardProps = {
  orientation: ResolvedBoardOrientation;
  /** The quadrant that held the square, while feedback shows. */
  correctQuadrant: QuadrantId | null;
  /** The quadrant the player wrongly picked, while feedback shows. */
  wrongQuadrant: QuadrantId | null;
  /** Left out, the board is a still picture (the setup screen's demo). */
  onQuadrantPress?: (quadrant: QuadrantId) => void;
  disabled?: boolean;
  /** The widest the board gets; defaults to the web's 320. */
  maxSize?: number;
  /**
   * Draws the rank and file letters. Defaults to the player's
   * show-coordinates preference, as the web's board does.
   */
  showCoordinates?: boolean;
};

/**
 * The web's `QuadrantBoard`: the board in the player's theme, turned to the
 * question's side, with yellow lines splitting it into quarters. After an
 * answer the right quarter's lines turn green and it takes a green tint, and
 * a wrong pick's turn red.
 *
 * The squares are `StaticBoard`'s; the quarters and the lines are laid over
 * them. Each quarter is one touch target rather than sixteen squares: the
 * answer is the quarter, so a tap anywhere inside it counts, as a click on
 * any of its squares does on the web.
 */
export function QuadrantBoard({
  orientation,
  correctQuadrant,
  wrongQuadrant,
  onQuadrantPress,
  disabled = false,
  maxSize = QUADRANT_BOARD_MAX_SIZE,
  showCoordinates,
}: QuadrantBoardProps) {
  const { preferences } = useGamePreferences();

  const idAt = (quarter: VisualQuadrant) =>
    quadrantIdAtVisualPosition(quarter, orientation);

  /**
   * A line's colour, from the quarters it borders: the verdict of the first
   * that has one, else yellow — the web's `getSegmentColor`.
   */
  const lineColor = (quarters: readonly VisualQuadrant[]) => {
    for (const quarter of quarters) {
      const id = idAt(quarter);
      if (id === correctQuadrant) return CORRECT_COLOR;
      if (id === wrongQuadrant) return WRONG_COLOR;
    }
    return null;
  };

  const renderOverlay = (boardSize: number) => {
    const half = boardSize / 2;
    const coloured = quarterLines(half).map((line) => ({
      ...line,
      color: lineColor(line.quarters),
    }));
    return (
      <>
        {QUARTERS.map((quarter) => {
          const id = idAt(quarter);
          return (
            <Quarter
              key={quarter}
              id={id}
              style={quarterFrame(quarter, half)}
              tint={
                id === correctQuadrant
                  ? CORRECT_COLOR + TINT_ALPHA
                  : id === wrongQuadrant
                    ? WRONG_COLOR + TINT_ALPHA
                    : null
              }
              onPress={onQuadrantPress}
              disabled={disabled}
            />
          );
        })}

        {/* Yellow lines first, so a verdict line is drawn over its neighbours. */}
        {[
          ...coloured.filter((l) => !l.color),
          ...coloured.filter((l) => l.color),
        ].map((line, index) => (
          <View
            key={index}
            pointerEvents="none"
            style={[
              styles.line,
              line.style,
              { backgroundColor: line.color ?? LINE_COLOR },
            ]}
          />
        ))}
      </>
    );
  };

  return (
    <StaticBoard
      maxSize={maxSize}
      horizontalInset={0}
      flipped={orientation === "black"}
      showCoordinates={showCoordinates ?? preferences.showCoordinates}
      renderOverlay={renderOverlay}
      testID="quadrant-board"
    />
  );
}

/**
 * The twelve 3pt segments: the centre cross straddling the middle, then
 * the outer frame inside the edge, each with the quarters it borders.
 */
function quarterLines(
  half: number,
): { quarters: VisualQuadrant[]; style: ViewStyle }[] {
  return [
    // The centre cross, straddling the middle.
    {
      quarters: ["top-left", "top-right"],
      style: {
        left: half - LINE_WIDTH / 2,
        top: 0,
        width: LINE_WIDTH,
        height: half,
      },
    },
    {
      quarters: ["bottom-left", "bottom-right"],
      style: {
        left: half - LINE_WIDTH / 2,
        top: half,
        width: LINE_WIDTH,
        height: half,
      },
    },
    {
      quarters: ["top-left", "bottom-left"],
      style: {
        top: half - LINE_WIDTH / 2,
        left: 0,
        height: LINE_WIDTH,
        width: half,
      },
    },
    {
      quarters: ["top-right", "bottom-right"],
      style: {
        top: half - LINE_WIDTH / 2,
        left: half,
        height: LINE_WIDTH,
        width: half,
      },
    },
    // The outer frame, inside the edge.
    {
      quarters: ["top-left"],
      style: { top: 0, left: 0, width: half, height: LINE_WIDTH },
    },
    {
      quarters: ["top-right"],
      style: { top: 0, left: half, width: half, height: LINE_WIDTH },
    },
    {
      quarters: ["bottom-left"],
      style: { bottom: 0, left: 0, width: half, height: LINE_WIDTH },
    },
    {
      quarters: ["bottom-right"],
      style: { bottom: 0, left: half, width: half, height: LINE_WIDTH },
    },
    {
      quarters: ["top-left"],
      style: { top: 0, left: 0, height: half, width: LINE_WIDTH },
    },
    {
      quarters: ["bottom-left"],
      style: { top: half, left: 0, height: half, width: LINE_WIDTH },
    },
    {
      quarters: ["top-right"],
      style: { top: 0, right: 0, height: half, width: LINE_WIDTH },
    },
    {
      quarters: ["bottom-right"],
      style: { top: half, right: 0, height: half, width: LINE_WIDTH },
    },
  ];
}

function quarterFrame(quarter: VisualQuadrant, half: number): ViewStyle {
  return {
    width: half,
    height: half,
    top: quarter.startsWith("top") ? 0 : half,
    left: quarter.endsWith("left") ? 0 : half,
  };
}

type QuarterProps = {
  id: QuadrantId;
  style: ViewStyle;
  tint: string | null;
  onPress: ((id: QuadrantId) => void) | undefined;
  disabled: boolean;
};

const Quarter = memo(function Quarter({
  id,
  style,
  tint,
  onPress,
  disabled,
}: QuarterProps) {
  const content = tint ? (
    <View
      pointerEvents="none"
      style={[styles.fill, { backgroundColor: tint }]}
    />
  ) : null;

  if (!onPress) {
    return (
      <View pointerEvents="none" style={[styles.quarter, style]}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => onPress(id)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={id}
      testID={`quadrant-${id}`}
      style={({ pressed }) => [
        styles.quarter,
        style,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {content}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  quarter: {
    position: "absolute",
  },
  fill: {
    ...StyleSheet.absoluteFill,
  },
  pressed: {
    backgroundColor: "rgba(0, 0, 0, 0.12)",
  },
  line: {
    position: "absolute",
  },
});
