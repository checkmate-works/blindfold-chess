import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Line, Circle } from "react-native-svg";
import { ChessPieceIcon } from "@blindfold-chess/icons";
import type { PieceType, Square } from "@blindfold-chess/types";
import { boardThemeColors } from "@blindfold-chess/ui";

import { STATIC_BOARD_RADIUS, StaticBoard } from "../../components/StaticBoard";
import { useFenSquares } from "../../components/use-fen-squares";
import { useGamePreferences } from "../../lib/game-preferences";
import type { MobilePracticeModule } from "../../navigation/practice-modules";
import { cardGround } from "./card-ground";
import {
  borderRadius,
  fontWeight,
  monoFont,
  spacing,
  useTheme,
} from "../../theme";

// The same worked examples as the web practice catalogue. These are still
// illustrations: mounting a card must not start a timer or an answer loop.
const POSITION =
  "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1";
const REBUILD = "4k3/pppp1ppp/8/4p3/2B1P3/8/PPPP1PPP/4K3 w - - 0 1";
const MATE =
  "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4";
const EMPTY = "8/8/8/8/8/8/8/8 w - - 0 1";

/**
 * The preview board's side. Small enough that a card stays a list row
 * rather than a page; the route overlay is drawn in a 96-unit viewBox and
 * scales with it.
 */
const BOARD_SIZE = 80;

type Path = readonly Square[];
const point = (square: Square) => ({
  x: (square.charCodeAt(0) - 97 + 0.5) * 12,
  y: (8 - Number(square[1]) + 0.5) * 12,
});

function Board({ fen = EMPTY, path = [] }: { fen?: string; path?: Path }) {
  const { colors } = useTheme();
  const { preferences } = useGamePreferences();
  const renderSquare = useFenSquares(fen);
  return (
    <View
      style={[
        styles.board,
        { borderColor: boardThemeColors[preferences.boardTheme].dark },
      ]}
    >
      <StaticBoard
        maxSize={BOARD_SIZE}
        showCoordinates={false}
        renderSquare={renderSquare}
        renderOverlay={() => (
          <Svg
            width="100%"
            height="100%"
            viewBox="0 0 96 96"
            style={StyleSheet.absoluteFill}
          >
            {path.slice(1).map((square, i) => {
              const from = point(path[i]);
              const to = point(square);
              return (
                <Line
                  key={i}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={colors.primary}
                  strokeWidth={2.5}
                />
              );
            })}
            {path.map((square, i) => (
              <Circle
                key={i}
                cx={point(square).x}
                cy={point(square).y}
                r={3}
                fill={colors.primary}
              />
            ))}
          </Svg>
        )}
      />
    </View>
  );
}

function Label({
  children,
  answer = false,
}: {
  children: string;
  answer?: boolean;
}) {
  const { colors } = useTheme();
  // Every label is a tile laid on the band, like the tiles on a mahjong
  // table; the answer is the tile ringed in primary.
  return (
    <Text
      style={[
        styles.label,
        {
          color: colors.foreground,
          borderColor: answer ? colors.primary : colors.card,
          backgroundColor: colors.card,
        },
      ]}
    >
      {children}
    </Text>
  );
}
function Row({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}
function Arrow() {
  const { colors } = useTheme();
  return <Text style={{ color: colors.mutedForeground, fontSize: 18 }}>→</Text>;
}
function Piece({ type }: { type: PieceType }) {
  return <ChessPieceIcon type={type} color="w" size={32} />;
}

function Example({ slug }: { slug: MobilePracticeModule["slug"] }) {
  const { colors } = useTheme();
  const { preferences } = useGamePreferences();
  const board = boardThemeColors[preferences.boardTheme];
  switch (slug) {
    case "coordinate-quiz":
      return (
        <Row>
          <Label>e4</Label>
          <Arrow />
          <Board path={["e4"]} />
        </Row>
      );
    case "square-colors":
      return (
        <Row>
          <Label>e4</Label>
          <Arrow />
          <View
            style={[
              styles.swatch,
              { backgroundColor: board.light, borderColor: colors.primary },
            ]}
          />
          <View
            style={[
              styles.swatch,
              { backgroundColor: board.dark, borderColor: colors.border },
            ]}
          />
        </Row>
      );
    case "legal-moves":
      return (
        <>
          <Row>
            <Piece type="n" />
            <Label>e2</Label>
            <Arrow />
            <Label>e4</Label>
          </Row>
          <Row>
            <Label>○</Label>
            <Label answer>×</Label>
          </Row>
        </>
      );
    case "board-symmetry":
      return (
        <Row>
          <Board path={["e4", "d4"]} />
          <View style={styles.stack}>
            <Label>e4 ↔ d4</Label>
            <Label answer>d4</Label>
          </View>
        </Row>
      );
    case "diagonal-quiz":
      return (
        <Row>
          <Piece type="b" />
          <View style={styles.stack}>
            <Label>e4</Label>
            <Label answer>b1 ↔ h7</Label>
            <Label answer>a8 ↔ h1</Label>
          </View>
        </Row>
      );
    case "route-planner":
      return (
        <Row>
          <Piece type="n" />
          <Board path={["e2", "g3", "f5"]} />
          <View style={styles.stack}>
            <Label>e2 → f5</Label>
            <Label answer>g3</Label>
          </View>
        </Row>
      );
    case "quadrant-anchors":
      return (
        <Row>
          <Label>e4</Label>
          <Arrow />
          <View style={styles.quadrants}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.quadrant,
                  { backgroundColor: i === 3 ? colors.primary : colors.border },
                ]}
              />
            ))}
          </View>
        </Row>
      );
    case "knight-tour":
      return (
        <Row>
          <Piece type="n" />
          <Board path={["c3", "e4", "c5", "e6"]} />
          <Label>4 / 64</Label>
        </Row>
      );
    case "algebraic-notation":
      return (
        <>
          <Row>
            <Piece type="n" />
            <Label>g1</Label>
            <Arrow />
            <Label>f3</Label>
          </Row>
          <Row>
            <Label>nf3</Label>
            <Label answer>Nf3</Label>
            <Label>Kf3</Label>
          </Row>
        </>
      );
    case "fen":
      return (
        <Row>
          <Label>{"r1bqkbnr/\npppp1ppp/…"}</Label>
          <Arrow />
          <Board fen={POSITION} />
        </Row>
      );
    case "position-memory":
      return (
        <Row>
          <Board fen={POSITION} />
          <Arrow />
          <Board fen={REBUILD} />
        </Row>
      );
    case "recall":
      return (
        <>
          <Label>1. e4 e5 2. Nf3</Label>
          <Row>
            <Arrow />
            <Label answer>Nc6</Label>
          </Row>
        </>
      );
    case "puzzle":
      return (
        <Row>
          <Board fen={MATE} path={["h5", "f7"]} />
          <Arrow />
          <Label answer>Qxf7#</Label>
        </Row>
      );
    default: {
      const exhaustive: never = slug;
      return exhaustive;
    }
  }
}

/**
 * Decorative worked example; the parent card announces the actual description.
 * It is laid on a band in the player's board colour (`cardGround`), so every
 * card's example sits on the same ground, the way tiles sit on a table's felt.
 */
export function PracticeCardVisual({
  slug,
}: {
  slug: MobilePracticeModule["slug"];
}) {
  const { colors, isDark } = useTheme();
  const { preferences } = useGamePreferences();
  const ground = cardGround(
    boardThemeColors[preferences.boardTheme],
    isDark,
    colors.card,
  );
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      style={[styles.band, { backgroundColor: ground.fill }]}
    >
      <Example slug={slug} />
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    minHeight: 96,
    padding: spacing.sm,
    gap: spacing.xs,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: borderRadius.md,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  // The frame sits outside the board, so the band clears it by its width.
  stack: { gap: spacing.xs },
  board: {
    width: BOARD_SIZE + 4,
    height: BOARD_SIZE + 4,
    borderWidth: 2,
    borderRadius: STATIC_BOARD_RADIUS + 2,
  },
  label: {
    fontFamily: monoFont,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: fontWeight.semibold,
    borderWidth: 2,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 4,
    paddingVertical: 2,
    textAlign: "center",
  },
  swatch: {
    width: 32,
    height: 32,
    borderWidth: 2,
    borderRadius: borderRadius.sm,
  },
  quadrants: { width: 68, flexDirection: "row", flexWrap: "wrap", gap: 4 },
  quadrant: { width: 32, height: 32, borderRadius: borderRadius.sm },
});
