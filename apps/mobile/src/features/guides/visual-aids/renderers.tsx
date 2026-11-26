import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Square } from "@blindfold-chess/types";
import { fenToPlacements } from "@blindfold-chess/features/chess-core/fen";
import {
  A_FILE_ANTI_DIAGONALS,
  A_FILE_DIAGONALS,
  BREAKTHROUGH_LINE,
  CASTLED_KINGSIDE_FEN,
  PAWN_BREAKTHROUGH_FEN,
  RANK_1_DIAGONALS,
  RANK_8_ANTI_DIAGONALS,
  SCATTERED_PAWNS_FEN,
  TWO_PAWNS_VS_ONE_FEN,
  type DiagonalPair,
} from "@blindfold-chess/features/dojo-guides";

import { useTheme, withAlpha } from "../../../theme";
import { MarkdownView } from "../../learn/MarkdownView";
import type { GuideVisualAidName } from "../generated/visual-aids";
import type { GuideLocaleContent, GuideVisualAidRef } from "../types";
import { GUIDE_COLORS, GuideBoard } from "./GuideBoard";
import {
  fileIndexOf,
  isLightGuideSquare,
  pieceReach,
  rankOf,
  squaresBetween,
  tableArrow,
} from "./geometry";
import { MoveLineReplay } from "./MoveLineReplay";
import { PatternTable } from "./PatternTable";
import {
  QuadrantGrid,
  gridArrow,
  isGuideQuadrant,
  type GuideQuadrant,
} from "./QuadrantGrid";

type AidProps = GuideVisualAidRef["props"];
type Renderer = (props: AidProps, content: GuideLocaleContent) => ReactNode;

// ---------------------------------------------------------------------------
// The pieces each renderer is assembled from
// ---------------------------------------------------------------------------

const EDGE_SQUARES = {
  "a-file": squaresBetween("a8", "a1"),
  "h-file": squaresBetween("h8", "h1"),
  "rank-1": squaresBetween("a1", "h1"),
  "rank-8": squaresBetween("a8", "h8"),
} as const;

/**
 * The 3kyu boundary boards: the edge a diagonal starts or ends on in amber,
 * the stretch of diagonal from the bishop to it in emerald, the bishop on
 * its square.
 */
function BoundaryPathBoard({
  edge,
  from,
  to,
}: {
  edge: keyof typeof EDGE_SQUARES;
  from: string;
  to: string;
}) {
  return (
    <GuideBoard
      fills={[
        {
          squares: EDGE_SQUARES[edge],
          color: GUIDE_COLORS.amber,
          opacity: 0.25,
        },
        {
          squares: squaresBetween(from, to),
          color: GUIDE_COLORS.emerald,
          opacity: 0.4,
        },
      ]}
      pieces={[{ square: from, type: "b", color: "w" }]}
    />
  );
}

function LineBoard({ from, to }: { from: string; to: string }) {
  return (
    <GuideBoard
      fills={[
        {
          squares: squaresBetween(from, to),
          color: GUIDE_COLORS.emerald,
          opacity: 0.4,
        },
      ]}
    />
  );
}

function ArrowsBoard({ pairs }: { pairs: readonly DiagonalPair[] }) {
  return <GuideBoard arrows={pairs.map((p) => tableArrow(p.start, p.end))} />;
}

function MovementBoard({ piece }: { piece: "k" | "n" | "b" | "r" | "q" }) {
  return (
    <GuideBoard
      pieces={[{ square: "d4", type: piece, color: "w" }]}
      dots={pieceReach(piece, "d4")}
    />
  );
}

function PositionBoard({ fen }: { fen: string }) {
  return <GuideBoard pieces={fenToPlacements(fen)} />;
}

const CORNER_ANCHORS = ["a8", "h8", "a1", "h1"];
/** The corners of every quarter: files a, d, e, h on ranks 8, 5, 4, 1. */
const ALL_ANCHORS = ["8", "5", "4", "1"].flatMap((rank) =>
  ["a", "d", "e", "h"].map((file) => `${file}${rank}`),
);

/** The web's quadrant tints (blue / emerald / amber / rose at 20%). */
const QUADRANT_TINTS: Record<GuideQuadrant, string> = {
  "top-left": withAlpha(GUIDE_COLORS.blue, 0.2),
  "top-right": withAlpha(GUIDE_COLORS.emerald, 0.2),
  "bottom-left": withAlpha(GUIDE_COLORS.amber, 0.2),
  "bottom-right": withAlpha(GUIDE_COLORS.rose, 0.2),
};

function quadrantOf(square: Square): GuideQuadrant {
  const left = fileIndexOf(square) < 4;
  const top = rankOf(square) > 4;
  if (top) return left ? "top-left" : "top-right";
  return left ? "bottom-left" : "bottom-right";
}

/** Every quarter in its tint, split by two lines through the centre. */
function QuadrantsBoard() {
  const { colors } = useTheme();
  const line = withAlpha(colors.foreground, 0.5);
  return (
    <GuideBoard
      squareTint={(square) => QUADRANT_TINTS[quadrantOf(square)]}
      renderOverlay={(size) => (
        <>
          <View
            style={[
              styles.vLine,
              { left: size / 2 - 1, backgroundColor: line },
            ]}
            pointerEvents="none"
          />
          <View
            style={[styles.hLine, { top: size / 2 - 1, backgroundColor: line }]}
            pointerEvents="none"
          />
        </>
      )}
    />
  );
}

/** Each square labelled with its own name, the mukyu lesson's map of the board. */
function CoordinateBoard() {
  return (
    <GuideBoard
      showCoordinates={false}
      renderSquare={(square, size) => (
        <Text
          style={[
            styles.squareName,
            {
              fontSize: Math.max(8, size * 0.24),
              color: isLightGuideSquare(square)
                ? "rgba(0, 0, 0, 0.5)"
                : "rgba(255, 255, 255, 0.5)",
            },
          ]}
        >
          {square}
        </Text>
      )}
    />
  );
}

function Formula({ latex }: { latex: string }) {
  return <MarkdownView source={`$$${latex}$$`} />;
}

function quadrantProp(props: AidProps): GuideQuadrant {
  return isGuideQuadrant(props.quadrant) ? props.quadrant : "top-left";
}

function squaresProp(props: AidProps, name: string): readonly string[] {
  const value = props[name];
  return Array.isArray(value) ? value : [];
}

function tables(content: GuideLocaleContent) {
  const s = content.strings.diagonalTables;
  return { startHeader: s.start, endHeader: s.end };
}

// The two 5kyu grids' arrows, in the grid's 0–100 space (a square is 25).
const SYMMETRY_ARROWS = [
  gridArrow({ x: 12.5, y: 12.5 }, { x: 82, y: 82 }, GUIDE_COLORS.rose, 2),
  gridArrow(
    { x: 12.5, y: 12.5 },
    { x: 82, y: 12.5 },
    GUIDE_COLORS.blue,
    1.5,
    "4 2",
  ),
  gridArrow(
    { x: 12.5, y: 12.5 },
    { x: 12.5, y: 82 },
    GUIDE_COLORS.emerald,
    1.5,
    "4 2",
  ),
];
const STEP3_ARROWS = [
  gridArrow({ x: 12.5, y: 87.5 }, { x: 32, y: 68 }, GUIDE_COLORS.rose, 2),
];

// ---------------------------------------------------------------------------
// The registry
// ---------------------------------------------------------------------------

/**
 * The native drawing of every web visual-aid component the guides use,
 * keyed by the component's name on the web. Typed over the generated name
 * union, so a guide that starts using a new component fails the typecheck
 * until it is drawn here.
 */
export const VISUAL_AID_RENDERERS: Readonly<
  Record<GuideVisualAidName, Renderer>
> = {
  // mukyu / 5kyu: coordinates, quarters and their anchor squares
  CoordinateBoard: () => <CoordinateBoard />,
  QuadrantBoard: () => <QuadrantsBoard />,
  HighlightQuadrantBoard: (props) => {
    const quadrant = quadrantProp(props);
    return (
      <GuideBoard
        squareTint={(square) =>
          quadrantOf(square) === quadrant ? QUADRANT_TINTS[quadrant] : null
        }
      />
    );
  },
  AnchorPointsBoard: (props) => {
    const squares = squaresProp(props, "squares");
    return (
      <GuideBoard ringed={squares.length > 0 ? squares : CORNER_ANCHORS} />
    );
  },
  AllAnchorPointsBoard: () => <GuideBoard ringed={ALL_ANCHORS} />,
  MiniBoard: (props) => (
    <QuadrantGrid
      quadrant={quadrantProp(props)}
      highlighted={squaresProp(props, "highlightedSquares")}
    />
  ),
  SymmetryBoard: () => (
    <QuadrantGrid
      quadrant="top-left"
      highlighted={["a8", "d8", "a5", "d5"]}
      arrows={SYMMETRY_ARROWS}
    />
  ),
  Step3Board: () => (
    <QuadrantGrid
      quadrant="top-right"
      highlighted={["e5"]}
      arrows={STEP3_ARROWS}
    />
  ),

  // 3kyu: diagonals, their edges, and the start → end tables
  DiagonalBoard: () => <LineBoard from="a1" to="h8" />,
  AntiDiagonalBoard: () => <LineBoard from="a8" to="h1" />,
  DiagonalStartAFileBoard: () => (
    <BoundaryPathBoard edge="a-file" from="d7" to="a4" />
  ),
  DiagonalStartRank1Board: () => (
    <BoundaryPathBoard edge="rank-1" from="f4" to="c1" />
  ),
  DiagonalEndRank8Board: () => (
    <BoundaryPathBoard edge="rank-8" from="d7" to="e8" />
  ),
  DiagonalEndHFileBoard: () => (
    <BoundaryPathBoard edge="h-file" from="f4" to="h6" />
  ),
  AntiDiagStartAFileBoard: () => (
    <BoundaryPathBoard edge="a-file" from="c3" to="a5" />
  ),
  AntiDiagStartRank8Board: () => (
    <BoundaryPathBoard edge="rank-8" from="f7" to="e8" />
  ),
  AntiDiagEndRank1Board: () => (
    <BoundaryPathBoard edge="rank-1" from="c3" to="e1" />
  ),
  AntiDiagEndHFileBoard: () => (
    <BoundaryPathBoard edge="h-file" from="f7" to="h5" />
  ),
  DiagonalAFileTable: (_, content) => (
    <PatternTable
      title={content.strings.diagonalTables.aFileStart}
      pairs={A_FILE_DIAGONALS}
      highlightFirst
      {...tables(content)}
    />
  ),
  DiagonalRank1Table: (_, content) => (
    <PatternTable
      title={content.strings.diagonalTables.rank1Start}
      pairs={RANK_1_DIAGONALS}
      {...tables(content)}
    />
  ),
  AntiDiagAFileTable: (_, content) => (
    <PatternTable
      title={content.strings.diagonalTables.aFileStart}
      pairs={A_FILE_ANTI_DIAGONALS}
      highlightFirst
      {...tables(content)}
    />
  ),
  AntiDiagRank8Table: (_, content) => (
    <PatternTable
      title={content.strings.diagonalTables.rank8Start}
      pairs={RANK_8_ANTI_DIAGONALS}
      {...tables(content)}
    />
  ),
  DiagonalAFileArrowsBoard: () => <ArrowsBoard pairs={A_FILE_DIAGONALS} />,
  DiagonalRank1ArrowsBoard: () => <ArrowsBoard pairs={RANK_1_DIAGONALS} />,
  AntiDiagAFileArrowsBoard: () => <ArrowsBoard pairs={A_FILE_ANTI_DIAGONALS} />,
  AntiDiagRank8ArrowsBoard: () => <ArrowsBoard pairs={RANK_8_ANTI_DIAGONALS} />,

  // 4kyu: how each piece moves, as a board and as a formula
  KingMovementBoard: () => <MovementBoard piece="k" />,
  KnightMovementBoard: () => <MovementBoard piece="n" />,
  BishopMovementBoard: () => <MovementBoard piece="b" />,
  RookMovementBoard: () => <MovementBoard piece="r" />,
  QueenMovementBoard: () => <MovementBoard piece="q" />,
  KingFormulaBlock: () => (
    <Formula latex="\max(|file_1 - file_2|, |rank_1 - rank_2|) = 1" />
  ),
  KnightFormulaBlock: () => (
    <Formula latex="(|file_1 - file_2|, |rank_1 - rank_2|) \in \{(1,2), (2,1)\}" />
  ),
  BishopFormulaBlock: () => (
    <Formula latex="|file_1 - file_2| = |rank_1 - rank_2|" />
  ),

  // 2kyu / 1kyu: positions to memorise and play
  ScatteredPawnsBoard: () => <PositionBoard fen={SCATTERED_PAWNS_FEN} />,
  KingsideCastledBoard: () => <PositionBoard fen={CASTLED_KINGSIDE_FEN} />,
  PawnBreakthroughBoard: () => <PositionBoard fen={PAWN_BREAKTHROUGH_FEN} />,
  PawnBreakthroughLine: () => (
    <MoveLineReplay fen={PAWN_BREAKTHROUGH_FEN} line={BREAKTHROUGH_LINE} />
  ),
  TwoPawnsVsOneBoard: () => <PositionBoard fen={TWO_PAWNS_VS_ONE_FEN} />,
};

const styles = StyleSheet.create({
  vLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
  },
  hLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
  },
  squareName: {
    fontWeight: "600",
  },
});
