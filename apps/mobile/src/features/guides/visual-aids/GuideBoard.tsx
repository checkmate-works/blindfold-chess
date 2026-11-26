import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Line, Polygon, Rect } from "react-native-svg";
import { ChessPieceIcon } from "@blindfold-chess/icons";
import type { PieceColor, PieceType, Square } from "@blindfold-chess/types";

import { StaticBoard } from "../../../components";
import { useGamePreferences } from "../../../lib/game-preferences";
import { isLightGuideSquare, squareOrigin } from "./geometry";

/** The guide boards' widest size: the web's prose column on a phone. */
export const GUIDE_BOARD_MAX_SIZE = 360;

/**
 * The web's Tailwind colours the guide boards draw with. They are the same
 * in both themes there, so they are literals here too.
 */
export const GUIDE_COLORS = {
  emerald: "#10b981",
  amber: "#fbbf24",
  rose: "#f43f5e",
  blue: "#3b82f6",
  /** `ring-yellow-400`, the web's last-move ring. */
  ring: "#facc15",
} as const;

/** Squares filled with one colour, drawn over the board like the web's SVG rects. */
export type SquareFill = {
  readonly squares: readonly string[];
  readonly color: string;
  readonly opacity: number;
};

/**
 * An arrow in the web's 0–100 board space (a square is 12.5 wide). The head
 * is a triangle `headLength` long and `headWidth` wide whose tip lies
 * `tipOffset` past the end point, which is how the web's SVG markers sit.
 */
export type GuideArrow = {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly color: string;
  readonly strokeWidth: number;
  readonly opacity?: number;
  readonly headLength: number;
  readonly headWidth: number;
  readonly tipOffset: number;
  readonly dash?: string;
};

export type PiecePlacement = {
  readonly square: string;
  readonly type: PieceType;
  readonly color: PieceColor;
};

type GuideBoardProps = {
  fills?: readonly SquareFill[];
  arrows?: readonly GuideArrow[];
  pieces?: readonly PiecePlacement[];
  /** Squares ringed in yellow, the web's `last-move` highlight. */
  ringed?: readonly string[];
  /** Squares marked with a faint dot, the web's legal-move "・". */
  dots?: readonly string[];
  squareTint?: (square: Square) => string | null | undefined;
  /** Drawn on each square under everything else this board puts there. */
  renderSquare?: (square: Square, squareSize: number) => ReactNode;
  /** Extra layers over the board (lines that are not arrows). */
  renderOverlay?: (boardSize: number) => ReactNode;
  /** Overrides the player's show-coordinates preference. */
  showCoordinates?: boolean;
};

/**
 * The board every guide illustration is drawn on: `StaticBoard` in the
 * player's theme, filling the text column. Like the web's guide boards it
 * shows the coordinate letters only when the player's preference does —
 * the guides are read by a player who has chosen how their boards look.
 *
 * Fills and arrows go in one SVG over the squares, in the web's own 0–100
 * space, so a board ported from the web keeps its numbers.
 */
export function GuideBoard({
  fills = [],
  arrows = [],
  pieces = [],
  ringed = [],
  dots = [],
  squareTint,
  renderSquare,
  renderOverlay,
  showCoordinates,
}: GuideBoardProps) {
  const { preferences } = useGamePreferences();

  return (
    <StaticBoard
      maxSize={GUIDE_BOARD_MAX_SIZE}
      showCoordinates={showCoordinates ?? preferences.showCoordinates}
      squareTint={squareTint}
      renderSquare={(square, size) => {
        const piece = pieces.find((p) => p.square === square);
        return (
          <>
            {renderSquare?.(square, size)}
            {ringed.includes(square) && <View style={styles.ring} />}
            {dots.includes(square) && (
              <View
                style={[
                  {
                    width: size * 0.22,
                    height: size * 0.22,
                    borderRadius: size * 0.11,
                    backgroundColor: isLightGuideSquare(square)
                      ? "rgba(0, 0, 0, 0.3)"
                      : "rgba(255, 255, 255, 0.3)",
                  },
                ]}
              />
            )}
            {piece && (
              <ChessPieceIcon
                type={piece.type}
                color={piece.color}
                size={size * 0.8}
              />
            )}
          </>
        );
      }}
      renderOverlay={
        fills.length > 0 || arrows.length > 0 || renderOverlay
          ? (boardSize) => (
              <>
                {renderOverlay?.(boardSize)}
                <GuideSvgLayer size={boardSize} fills={fills} arrows={arrows} />
              </>
            )
          : undefined
      }
    />
  );
}

/** Fills and arrows in the web's 0–100 space, laid over a board of `size` points. */
export function GuideSvgLayer({
  size,
  fills = [],
  arrows = [],
}: {
  size: number;
  fills?: readonly SquareFill[];
  arrows?: readonly GuideArrow[];
}) {
  if (fills.length === 0 && arrows.length === 0) return null;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      {fills.flatMap((fill, i) =>
        fill.squares.map((square) => {
          const { x, y } = squareOrigin(square);
          return (
            <Rect
              key={`${i}-${square}`}
              x={x}
              y={y}
              width={12.5}
              height={12.5}
              fill={fill.color}
              opacity={fill.opacity}
            />
          );
        }),
      )}
      {arrows.map((arrow, i) => (
        <ArrowShape key={i} arrow={arrow} />
      ))}
    </Svg>
  );
}

function ArrowShape({ arrow }: { arrow: GuideArrow }) {
  const { x1, y1, x2, y2 } = arrow;
  const length = Math.hypot(x2 - x1, y2 - y1);
  const ux = (x2 - x1) / length;
  const uy = (y2 - y1) / length;
  const tipX = x2 + ux * arrow.tipOffset;
  const tipY = y2 + uy * arrow.tipOffset;
  const baseX = tipX - ux * arrow.headLength;
  const baseY = tipY - uy * arrow.headLength;
  const half = arrow.headWidth / 2;
  const opacity = arrow.opacity ?? 1;
  return (
    <>
      <Line
        x1={x1}
        y1={y1}
        x2={baseX}
        y2={baseY}
        stroke={arrow.color}
        strokeWidth={arrow.strokeWidth}
        strokeDasharray={arrow.dash}
        opacity={opacity}
      />
      <Polygon
        points={`${tipX},${tipY} ${baseX - uy * half},${baseY + ux * half} ${baseX + uy * half},${baseY - ux * half}`}
        fill={arrow.color}
        opacity={opacity}
      />
    </>
  );
}

const styles = StyleSheet.create({
  ring: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: GUIDE_COLORS.ring,
  },
});
