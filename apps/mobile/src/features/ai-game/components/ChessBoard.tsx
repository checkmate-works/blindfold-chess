import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  type ViewInstance,
} from "react-native";
import * as Haptics from "expo-haptics";
import {
  fenToBoard,
  type BoardPiece,
} from "@blindfold-chess/features/chess-core";
import {
  DISPLAY_RANKS,
  FILES,
  flipIndex,
  isLightSquare,
} from "@blindfold-chess/features/common";
import {
  areDestinationsObscured,
  resolvePieceDisplay,
  resolveSquareHighlight,
  type BlindfoldDisplaySettings,
  type MoveSquares,
  type PieceDisplay,
  type SquareHighlightType,
} from "@blindfold-chess/features/board-display";
import { ChessPieceIcon } from "@blindfold-chess/icons";
import type { PieceType, PieceColor } from "@blindfold-chess/icons";
import type { Side, Square } from "@blindfold-chess/types";
import { boardThemeColors } from "@blindfold-chess/ui";

import { useGamePreferences } from "../../../lib/game-preferences";
import { chessColors, spacing, fontSize } from "../../../theme";
import { useBoardMoveInput } from "../hooks/useBoardMoveInput";
import { squareAtPoint } from "../lib/board-geometry";
import { PromotionPicker } from "./PromotionPicker";

type ChessBoardProps = {
  fen: string;
  flipped?: boolean;
  /**
   * Overrides the player's `showCoordinates` preference. A teaching board
   * that always wants the labels passes `true`; a game board leaves it unset.
   */
  showCoordinates?: boolean;
  /** Squares of the last move, tinted when `highlightLastMove` is on. */
  lastMove?: { from: string; to: string } | null;
  /**
   * The side the player is playing. Setting it marks this as a game board:
   * the blindfold piece preferences (hidden sides, stones, single colour,
   * hidden pawns) apply, with "own" meaning this side. Left unset — a
   * practice or teaching board — every piece is drawn normally.
   */
  playerColor?: Side;
  /**
   * Caps the board's width below the default (the screen less 24pt a side),
   * for a board drawn inside a padded panel.
   */
  maxSize?: number;
  /**
   * Makes the board playable: tap a piece and then its destination, or drag
   * it there, and the legal move arrives here in SAN. Only `playerColor`'s
   * pieces respond. Leave it unset while the player cannot move (the AI's
   * turn, a covered board), and the board is a picture again.
   */
  onMove?: (san: string) => void;
  /** One completed but illegal board attempt, as the web board reports it. */
  onIllegalMove?: (attempt: string, squares: MoveSquares) => void;
  /**
   * Fires `true` while a piece is held and `false` when it is let go, so a
   * scrolling parent can stop scrolling under the finger meanwhile.
   */
  onDragActiveChange?: (active: boolean) => void;
};

const RANKS = DISPLAY_RANKS;

/** `chessColors.boardHighlight` at the strength lichess tints a last move. */
const LAST_MOVE_TINT = `${chessColors.boardHighlight}66`;

/**
 * The move affordances, in chessground's colours as the web board uses them:
 * the selected square's fill, the dot on an empty destination and the ring on
 * a capture.
 */
const SELECTED_TINT = "rgba(20, 85, 30, 0.5)";
const MOVE_DOT = "rgba(20, 85, 30, 0.5)";
const CAPTURE_RING = "rgba(20, 85, 0, 0.3)";
/** The square under a dragged piece. */
const DRAG_HOVER_TINT = "rgba(20, 85, 30, 0.3)";

/**
 * How far a finger travels before a press on a piece becomes a drag. Under
 * it, the press is a tap. A little above the web's 4px for a mouse, since a
 * fingertip rolls as it lands.
 */
const DRAG_THRESHOLD = 6;
/** The dragged piece is drawn larger than a square, and above the finger. */
const DRAG_PIECE_SCALE = 1.6;
const DRAG_PIECE_LIFT = 0.6;

/**
 * Board for the AI game, the puzzles and the notation lessons. It reads the
 * player's global board preferences itself — theme, coordinates, last-move
 * highlight, piece destinations and, on a game board, the blindfold display
 * rules from `@blindfold-chess/features/board-display` — so callers pass
 * only the position and whose board it is.
 *
 * Read-only unless `onMove` is given; then it takes taps and drags with the
 * web board's rules (`useBoardMoveInput`). The touches are handled by one
 * responder over the whole board, with the squares themselves taking none,
 * so a touch's position is always measured from the board's corner.
 */
export function ChessBoard({
  fen,
  flipped = false,
  showCoordinates,
  lastMove = null,
  playerColor,
  maxSize,
  onMove,
  onIllegalMove,
  onDragActiveChange,
}: ChessBoardProps) {
  const { preferences } = useGamePreferences();
  const { width: screenWidth } = useWindowDimensions();
  const maxBoardSize = screenWidth - spacing.lg * 2;
  const boardSize = Math.min(maxBoardSize, 400, maxSize ?? Infinity);
  const squareSize = boardSize / 8;
  const theme = boardThemeColors[preferences.boardTheme];
  const coordinatesShown = showCoordinates ?? preferences.showCoordinates;
  const highlightedMove = preferences.highlightLastMove ? lastMove : null;
  const interactive = onMove !== undefined && playerColor !== undefined;

  const displaySettings = useMemo<BlindfoldDisplaySettings | null>(
    () =>
      playerColor
        ? {
            ownColor: playerColor === "white" ? "w" : "b",
            showOwnPieces: preferences.showOwnPieces,
            showOpponentPieces: preferences.showOpponentPieces,
            pieceShapeMode: preferences.pieceShapeMode,
            pieceColors: preferences.pieceColors,
            pawnHideMode: preferences.pawnHideMode,
            hiddenPieceStyle: "absent",
          }
        : null,
    [
      playerColor,
      preferences.showOwnPieces,
      preferences.showOpponentPieces,
      preferences.pieceShapeMode,
      preferences.pieceColors,
      preferences.pawnHideMode,
    ],
  );

  const input = useBoardMoveInput({
    fen,
    movableColor: playerColor === "black" ? "b" : "w",
    enabled: interactive,
    onMove: onMove ?? noop,
    onIllegalMove,
  });

  // The piece being dragged and the square under it, kept with the position
  // they belong to so a new one drops them, like the selection.
  const [drag, setDrag] = useState<{
    fen: string;
    from: Square;
    over: Square | null;
  } | null>(null);
  const activeDrag = interactive && drag?.fen === fen ? drag : null;
  const dragPosition = useRef(new Animated.ValueXY()).current;

  // The responder is made once, so it reads everything that changes from
  // here. Rebuilding it mid-gesture would lose the gesture's state.
  const latest = useRef({
    input,
    fen,
    boardSize,
    flipped,
    interactive,
    onDragActiveChange,
  });
  useEffect(() => {
    latest.current = {
      input,
      fen,
      boardSize,
      flipped,
      interactive,
      onDragActiveChange,
    };
  });

  const boardRef = useRef<ViewInstance>(null);
  const panResponder = useMemo(() => {
    // One touch, from the press to the release. Positions are taken from
    // the page and the board's own page position, measured when the touch
    // starts: a touch's `locationX` / `locationY` are not reliably measured
    // from the responder's corner, and the board moves when the screen
    // scrolls. The measurement comes back asynchronously, so a touch that
    // ends before it does is finished in its callback.
    type Touch = {
      pageX: number;
      pageY: number;
      origin: { x: number; y: number } | null;
      square: Square | null;
      lifted: Square | null;
      dragging: boolean;
      releasedAt: { dx: number; dy: number } | null;
    };
    let touch: Touch | null = null;

    const squareAt = (x: number, y: number) =>
      squareAtPoint(x, y, latest.current.boardSize, latest.current.flipped);

    /** The touch's position on the board after moving by (dx, dy). */
    const pointOf = (t: Touch, dx: number, dy: number) =>
      t.origin
        ? { x: t.pageX + dx - t.origin.x, y: t.pageY + dy - t.origin.y }
        : null;

    const end = () => {
      if (touch?.lifted) latest.current.onDragActiveChange?.(false);
      touch = null;
      setDrag(null);
    };

    const finish = (t: Touch, dx: number, dy: number) => {
      const { input: current } = latest.current;
      const point = pointOf(t, dx, dy);
      if (t.dragging && t.lifted) {
        current.drop(t.lifted, point ? squareAt(point.x, point.y) : null);
      } else if (t.square && Math.hypot(dx, dy) < DRAG_THRESHOLD * 2) {
        current.tap(t.square);
      }
      end();
    };

    const accepts = () =>
      latest.current.interactive && !latest.current.input.promotion;

    return PanResponder.create({
      onStartShouldSetPanResponder: accepts,
      // Claimed before a scrolling parent can take it, or a tap that moves
      // a pixel would scroll instead.
      onStartShouldSetPanResponderCapture: accepts,
      onPanResponderGrant: (event) => {
        const t: Touch = {
          pageX: event.nativeEvent.pageX,
          pageY: event.nativeEvent.pageY,
          origin: null,
          square: null,
          lifted: null,
          dragging: false,
          releasedAt: null,
        };
        touch = t;
        boardRef.current?.measure((_x, _y, _w, _h, pageX, pageY) => {
          if (touch !== t) return;
          t.origin = { x: pageX, y: pageY };
          const point = pointOf(t, 0, 0);
          t.square = point ? squareAt(point.x, point.y) : null;
          if (t.square && latest.current.input.canLift(t.square)) {
            t.lifted = t.square;
            latest.current.onDragActiveChange?.(true);
          }
          if (t.releasedAt) finish(t, t.releasedAt.dx, t.releasedAt.dy);
        });
      },
      onPanResponderMove: (_, gesture) => {
        const t = touch;
        if (!t?.lifted) return;
        const distance = Math.hypot(gesture.dx, gesture.dy);
        if (!t.dragging && distance < DRAG_THRESHOLD) return;
        const point = pointOf(t, gesture.dx, gesture.dy);
        if (!point) return;
        dragPosition.setValue(point);
        const over = squareAt(point.x, point.y);
        if (!t.dragging) {
          t.dragging = true;
          latest.current.input.startDrag();
          void Haptics.selectionAsync();
        }
        const from = t.lifted;
        const currentFen = latest.current.fen;
        setDrag((current) =>
          current?.from === from &&
          current.over === over &&
          current.fen === currentFen
            ? current
            : { fen: currentFen, from, over },
        );
      },
      onPanResponderRelease: (_, gesture) => {
        const t = touch;
        if (!t) return;
        if (t.origin) finish(t, gesture.dx, gesture.dy);
        else t.releasedAt = { dx: gesture.dx, dy: gesture.dy };
      },
      // A held piece keeps the touch; anything else lets a parent scroll.
      onPanResponderTerminationRequest: () => !touch?.lifted,
      onPanResponderTerminate: end,
    });
  }, [dragPosition]);

  const board = useMemo(() => {
    try {
      return fenToBoard(fen);
    } catch {
      return Array(8)
        .fill(null)
        .map(() => Array(8).fill(null)) as BoardPiece[][];
    }
  }, [fen]);

  const moveSource = activeDrag?.from ?? input.selectedSquare;
  const destinationsShown =
    preferences.showPieceDestinations &&
    !(displaySettings && areDestinationsObscured(displaySettings));
  const { destinationsOf } = input;
  const destinations = useMemo(
    () => (destinationsShown ? destinationsOf(moveSource) : []),
    [destinationsShown, destinationsOf, moveSource],
  );

  const displayBoard = useMemo(() => {
    if (flipped) {
      return board
        .slice()
        .reverse()
        .map((row) => row.slice().reverse());
    }
    return board;
  }, [board, flipped]);

  const displayFiles = flipped ? FILES.slice().reverse() : FILES;
  const displayRanks = flipped ? RANKS.slice().reverse() : RANKS;

  const pieceSize = squareSize * 0.8;

  const draggedPiece = activeDrag ? input.pieceAt(activeDrag.from) : null;
  const draggedDisplay: PieceDisplay | null =
    draggedPiece && displaySettings
      ? resolvePieceDisplay(draggedPiece, displaySettings)
      : null;
  const dragPieceSize = squareSize * DRAG_PIECE_SCALE;

  const promotionCell = input.promotion
    ? drawnCell(input.promotion.to, flipped)
    : null;

  const squares = (
    <View
      pointerEvents={interactive ? "none" : "auto"}
      style={[styles.container, { width: boardSize, height: boardSize }]}
    >
      {displayBoard.map((row, rankIndex) => (
        <View key={rankIndex} style={styles.row}>
          {row.map((piece, fileIndex) => {
            const actualFileIndex = flipIndex(fileIndex, flipped);
            const actualRankIndex = flipIndex(rankIndex, flipped);
            const light = isLightSquare(actualFileIndex, actualRankIndex);
            const square = `${FILES[actualFileIndex]}${RANKS[actualRankIndex]}`;
            const isLegalDestination = destinations.includes(square as Square);
            const highlight = resolveSquareHighlight({
              isSelected: moveSource === square,
              isCaptureDest: isLegalDestination && piece !== null,
              isLegalDestination,
              isLastMove:
                highlightedMove !== null &&
                (square === highlightedMove.from ||
                  square === highlightedMove.to),
              isExternalHighlight: false,
            });
            const display: PieceDisplay | null = piece
              ? displaySettings
                ? resolvePieceDisplay(piece, displaySettings)
                : { kind: "piece", type: piece.type, color: piece.color }
              : null;
            const labelColor = light ? theme.lightText : theme.darkText;
            return (
              <View
                key={fileIndex}
                style={[
                  styles.square,
                  {
                    width: squareSize,
                    height: squareSize,
                    backgroundColor: light ? theme.light : theme.dark,
                  },
                ]}
              >
                <SquareHighlight
                  highlight={highlight}
                  squareSize={squareSize}
                  hovered={activeDrag?.over === square}
                />
                {display && (
                  <View
                    style={
                      activeDrag?.from === square ? styles.liftedSource : null
                    }
                  >
                    <PieceGlyph display={display} size={pieceSize} />
                  </View>
                )}
                {coordinatesShown && fileIndex === 0 && (
                  <Text style={[styles.rankLabel, { color: labelColor }]}>
                    {displayRanks[rankIndex]}
                  </Text>
                )}
                {coordinatesShown && rankIndex === 7 && (
                  <Text style={[styles.fileLabel, { color: labelColor }]}>
                    {displayFiles[fileIndex]}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );

  if (!interactive) return squares;

  return (
    <View
      ref={boardRef}
      style={[styles.interactive, { width: boardSize, height: boardSize }]}
      {...panResponder.panHandlers}
    >
      {squares}
      {draggedDisplay && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.dragPiece,
            {
              width: dragPieceSize,
              height: dragPieceSize,
              transform: [
                {
                  translateX: Animated.add(dragPosition.x, -dragPieceSize / 2),
                },
                {
                  translateY: Animated.add(
                    dragPosition.y,
                    -dragPieceSize / 2 - squareSize * DRAG_PIECE_LIFT,
                  ),
                },
              ],
            },
          ]}
        >
          <PieceGlyph display={draggedDisplay} size={dragPieceSize * 0.8} />
        </Animated.View>
      )}
      {input.promotion && promotionCell && (
        <PromotionPicker
          squareSize={squareSize}
          column={promotionCell.column}
          row={promotionCell.row}
          color={playerColor === "black" ? "b" : "w"}
          onSelect={input.choosePromotion}
          onCancel={input.cancelPromotion}
        />
      )}
    </View>
  );
}

function noop() {}

/** Where a square is drawn: its column and row from the top-left. */
function drawnCell(square: Square, flipped: boolean) {
  const column = square.charCodeAt(0) - "a".charCodeAt(0);
  const row = 8 - Number(square[1]);
  return flipped ? { column: 7 - column, row: 7 - row } : { column, row };
}

/** One square's tint, dot or ring, under its piece. */
function SquareHighlight({
  highlight,
  squareSize,
  hovered,
}: {
  highlight: SquareHighlightType;
  squareSize: number;
  hovered: boolean;
}) {
  const fill =
    highlight === "last-move"
      ? LAST_MOVE_TINT
      : highlight === "selected"
        ? SELECTED_TINT
        : null;
  return (
    <>
      {fill && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: fill }]} />
      )}
      {hovered && (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: DRAG_HOVER_TINT },
          ]}
        />
      )}
      {highlight === "move-dest" && (
        <View
          style={[
            styles.marker,
            {
              width: squareSize * 0.38,
              height: squareSize * 0.38,
              borderRadius: squareSize * 0.19,
              backgroundColor: MOVE_DOT,
            },
          ]}
        />
      )}
      {highlight === "capture-dest" && (
        <View
          style={[
            styles.marker,
            {
              width: squareSize,
              height: squareSize,
              borderRadius: squareSize / 2,
              borderWidth: squareSize * 0.1,
              borderColor: CAPTURE_RING,
            },
          ]}
        />
      )}
    </>
  );
}

/**
 * Draws one resolved piece. `ghost` and faint stones only arise with the
 * review's `hiddenPieceStyle: 'ghost'`, which this live board never asks
 * for; they are drawn translucent anyway so the mapping is total.
 */
function PieceGlyph({
  display,
  size,
}: {
  display: PieceDisplay;
  size: number;
}) {
  if (display.kind === "absent") return null;
  if (display.kind === "circle") {
    const stone = size * 0.75;
    return (
      <View
        style={[
          styles.stone,
          {
            width: stone,
            height: stone,
            borderRadius: stone / 2,
            backgroundColor: display.color === "w" ? "#ffffff" : "#1f1f1f",
            opacity: display.faint ? 0.35 : 1,
          },
        ]}
      />
    );
  }
  return (
    <View
      style={[styles.pieceContainer, display.kind === "ghost" && styles.ghost]}
    >
      <ChessPieceIcon
        type={display.type as PieceType}
        color={display.color as PieceColor}
        size={size}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "center",
    borderRadius: 4,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    flex: 1,
  },
  square: {
    alignItems: "center",
    justifyContent: "center",
  },
  pieceContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  ghost: {
    opacity: 0.35,
  },
  interactive: {
    alignSelf: "center",
  },
  liftedSource: {
    opacity: 0.3,
  },
  dragPiece: {
    position: "absolute",
    top: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  marker: {
    position: "absolute",
  },
  stone: {
    borderWidth: 1,
    borderColor: "#555555",
  },
  rankLabel: {
    position: "absolute",
    top: 1,
    left: 2,
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
  fileLabel: {
    position: "absolute",
    bottom: 1,
    right: 2,
    fontSize: fontSize.xs,
    fontWeight: "600",
  },
});
