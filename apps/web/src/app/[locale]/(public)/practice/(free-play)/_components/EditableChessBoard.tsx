'use client';

import { useCallback, useEffect, useState } from 'react';

import { ChessPiece, Square } from '@/app/_components';
import type { Color } from '@blindfold-chess/features/chess-core';
import { boardFlatToFen, fenToBoardFlat } from '@blindfold-chess/features/chess-core/fen';
import { DISPLAY_RANKS, FILES, isLightSquare } from '@blindfold-chess/features/common';
import type { PieceType } from '@blindfold-chess/types';
import { createPortal } from 'react-dom';

import { BoardAnnotationOverlay } from '@/lib/board-annotations/BoardAnnotationOverlay';
import type { BoardAnnotations } from '@/lib/board-annotations/types';
import { useBoardAnnotationDrawing } from '@/lib/board-annotations/use-board-annotation-drawing';
import type { BoardTheme } from '@/lib/games/board-themes';
import { DEFAULT_BOARD_THEME, getBoardThemeColors } from '@/lib/games/board-themes';

import type { FenPieceChar } from './types';
import type { EditableBoardDragSource } from './use-editable-board-drag-drop';
import { useEditableBoardDragDrop } from './use-editable-board-drag-drop';

type EditableChessBoardLabels = {
  whitePieces: string;
  blackPieces: string;
  removePieceMode: string;
  placingPiece: string;
};

type Props = {
  fen: string;
  onFenChange: (fen: string) => void;
  labels: EditableChessBoardLabels;
  flipped?: boolean;
  editable?: boolean;
  preserveTurnInfo?: boolean; // Whether to preserve turn info from original position
  originalPosition?: string; // Original position to preserve turn info from
  boardTheme?: BoardTheme;
  showCoordinates?: boolean;
  /**
   * Lichess-style annotations (arrows + circles) drawn on top of the
   * board. When `annotations` is provided (even as the empty value),
   * the overlay is rendered. When `onAnnotationsChange` is also
   * provided, right-click + drag becomes interactive — the standard
   * lichess drawing UX (color modifiers, toggle-off on repeat). Left-
   * click semantics are unchanged: piece-placement / -removal still
   * fires through `handleSquareClick` because right-button events do
   * not trigger HTML `onClick`.
   *
   * Both optional so puzzle / position-memory callers can stay on the
   * pure piece-placement mode without supplying these props.
   */
  annotations?: BoardAnnotations | null;
  onAnnotationsChange?: (next: BoardAnnotations) => void;
};

const WHITE_PIECES: FenPieceChar[] = ['K', 'Q', 'R', 'B', 'N', 'P'];
const BLACK_PIECES: FenPieceChar[] = ['k', 'q', 'r', 'b', 'n', 'p'];

// Helper function to convert board array to FEN
function boardToFen(
  board: FenPieceChar[],
  preserveTurnInfo?: boolean,
  originalPosition?: string
): string {
  return boardFlatToFen(
    board,
    preserveTurnInfo && originalPosition ? { preserveFrom: originalPosition } : {}
  );
}

export function EditableChessBoard({
  fen,
  onFenChange,
  labels,
  flipped = false,
  editable = false,
  preserveTurnInfo = false,
  originalPosition,
  boardTheme = DEFAULT_BOARD_THEME,
  showCoordinates = true,
  annotations = null,
  onAnnotationsChange,
}: Props) {
  const [board, setBoard] = useState<FenPieceChar[]>(() => fenToBoardFlat(fen) as FenPieceChar[]);
  const [selectedPiece, setSelectedPiece] = useState<FenPieceChar>('');
  const themeColors = getBoardThemeColors(boardTheme);

  // Annotation drawing (right-click circles/arrows) is an independent
  // interaction mode from the piece editor — its gesture wiring lives in
  // useBoardAnnotationDrawing.
  const {
    interactive: annotationsInteractive,
    containerRef: boardContainerRef,
    containerProps: annotationContainerProps,
    hasAnnotations,
    clearAnnotations,
  } = useBoardAnnotationDrawing({ annotations, onAnnotationsChange, flipped });

  useEffect(() => {
    setBoard(fenToBoardFlat(fen) as FenPieceChar[]);
  }, [fen]);

  const pieceAt = useCallback((index: number) => board[index] ?? '', [board]);

  const applyBoard = useCallback(
    (next: FenPieceChar[]) => {
      setBoard(next);
      onFenChange(boardToFen(next, preserveTurnInfo, originalPosition));
    },
    [preserveTurnInfo, originalPosition, onFenChange]
  );

  const handleDrop = useCallback(
    (source: EditableBoardDragSource, destIndex: number | null) => {
      // Dropped outside the board: a board-origin piece is removed; dragging
      // a palette piece off the board is a no-op (cancel).
      if (destIndex === null && source.kind !== 'board') return;
      if (source.kind === 'board' && source.index === destIndex) return; // dropped back on itself

      const newBoard = [...board];
      if (source.kind === 'board') newBoard[source.index] = '';
      if (destIndex !== null) newBoard[destIndex] = source.piece;
      applyBoard(newBoard);
    },
    [board, applyBoard]
  );

  const { dragSource, dragSize, handlePointerDown, floatingRef, consumeTrailingClick } =
    useEditableBoardDragDrop({
      enabled: editable,
      boardRef: boardContainerRef,
      pieceAt,
      onDrop: handleDrop,
    });

  const handleSquareClick = (squareIndex: number) => {
    if (consumeTrailingClick()) return;
    if (!editable) return;

    const newBoard = [...board];
    const currentPiece = newBoard[squareIndex];

    if (selectedPiece === '') {
      // Remove piece mode
      newBoard[squareIndex] = '';
    } else {
      // Place piece mode - toggle if same piece
      // Use trim and explicit string comparison to ensure matching
      const currentPieceStr = String(currentPiece || '').trim();
      const selectedPieceStr = String(selectedPiece).trim();

      if (currentPieceStr !== '' && currentPieceStr === selectedPieceStr) {
        // Toggle off if clicking the same piece
        newBoard[squareIndex] = '';
      } else {
        // Place the piece
        newBoard[squareIndex] = selectedPiece;
      }
    }

    applyBoard(newBoard);
  };

  const handlePaletteSelect = (piece: FenPieceChar) => {
    if (consumeTrailingClick()) return;
    setSelectedPiece(piece);
  };

  // The palette buttons live outside `boardContainerRef` (a sibling of the
  // board, not a descendant), so drag hit-testing needs a pointerdown
  // listener on the outer wrapper that contains both. `onPointerDown` is
  // pulled out of `annotationContainerProps` and composed here (rather than
  // left in the spread on the inner board container) so the two gestures'
  // pointerdown handling doesn't fire twice for presses inside the board.
  const { onPointerDown: annotationPointerDown, ...boardContainerProps } = annotationContainerProps;
  const handleWrapperPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    annotationPointerDown?.(e);
    handlePointerDown(e);
  };

  const renderPiece = (piece: FenPieceChar, faded = false) => {
    if (!piece) return null;

    const isWhite = piece === piece.toUpperCase();
    const color: Color = (isWhite ? 'w' : 'b') as Color;
    const type: PieceType = piece.toLowerCase() as PieceType;
    const grabClass = editable ? 'cursor-grab active:cursor-grabbing touch-none' : '';
    const fadeClass = faded ? 'opacity-30' : '';

    return (
      <div className={`w-[80%] h-[80%] flex items-center justify-center ${grabClass} ${fadeClass}`}>
        <ChessPiece type={type} color={color} size={45} />
      </div>
    );
  };

  // Determine palette order based on board orientation
  const topPalette = flipped
    ? { pieces: WHITE_PIECES, label: labels.whitePieces }
    : { pieces: BLACK_PIECES, label: labels.blackPieces };

  const bottomPalette = flipped
    ? { pieces: BLACK_PIECES, label: labels.blackPieces }
    : { pieces: WHITE_PIECES, label: labels.whitePieces };

  const displayFiles = flipped ? [...FILES].reverse() : [...FILES];
  const displayRanks = flipped ? [...DISPLAY_RANKS].reverse() : [...DISPLAY_RANKS];

  const renderPalette = (pieces: FenPieceChar[], title: string) => (
    <div className="flex flex-col items-center gap-2">
      <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
      <div className="flex gap-1 sm:gap-2 p-2 sm:p-3 border border-border rounded-lg">
        <button
          type="button"
          onClick={() => handlePaletteSelect('')}
          className={`w-10 h-10 sm:w-12 sm:h-12 rounded border-2 flex items-center justify-center text-base sm:text-lg flex-shrink-0 transition-colors touch-manipulation select-none ${
            selectedPiece === ''
              ? 'border-foreground bg-foreground/10 scale-105'
              : 'border-border hover:bg-muted'
          }`}
          title="Remove piece"
        >
          ×
        </button>
        {pieces.map((piece) => {
          const isWhite = piece === piece.toUpperCase();
          const color: Color = (isWhite ? 'w' : 'b') as Color;
          const type: PieceType = piece.toLowerCase() as PieceType;

          return (
            <button
              type="button"
              key={piece}
              data-palette-piece={piece}
              onClick={() => handlePaletteSelect(piece)}
              className={`w-10 h-10 sm:w-12 sm:h-12 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors touch-none select-none cursor-grab active:cursor-grabbing ${
                selectedPiece === piece
                  ? 'border-foreground bg-foreground/10 scale-105'
                  : 'border-border hover:bg-muted'
              }`}
              title={`Place ${piece.toUpperCase() === piece ? 'White' : 'Black'} ${piece.toUpperCase()}`}
            >
              <div className="w-full h-full flex items-center justify-center p-1">
                <ChessPiece type={type} color={color} size={32} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-4" onPointerDown={handleWrapperPointerDown}>
      {/* Top palette */}
      {editable && renderPalette(topPalette.pieces, topPalette.label)}

      {/* Chess board */}
      <div className="w-full max-w-md">
        <div
          ref={boardContainerRef}
          className={`relative w-full aspect-square rounded-md overflow-hidden${
            annotationsInteractive ? ' select-none touch-none' : ''
          }`}
          {...boardContainerProps}
        >
          <div className="grid grid-cols-8 gap-0 w-full h-full">
            {board.map((piece, squareIndex) => {
              // Handle board flipping for black side
              const displayIndex = flipped ? 63 - squareIndex : squareIndex;
              const displayPiece = board[displayIndex];
              const isLight = isLightSquare(squareIndex % 8, Math.floor(squareIndex / 8));

              // Grid position for coordinate display
              const gridFile = squareIndex % 8;
              const gridRank = Math.floor(squareIndex / 8);

              // Get file/rank for this grid position
              const file = displayFiles[gridFile];
              const rank = displayRanks[gridRank];

              // Show rank on left edge, file on bottom edge (always, like ChessBoard)
              const showRankCoordinate = gridFile === 0;
              const showFileCoordinate = gridRank === 7;

              const isDragSource =
                dragSource?.kind === 'board' && dragSource.index === displayIndex;

              return (
                <Square
                  key={squareIndex}
                  file={file}
                  rank={rank}
                  isLight={isLight}
                  showCoordinates={showCoordinates}
                  showRankCoordinate={showRankCoordinate}
                  showFileCoordinate={showFileCoordinate}
                  onClick={() => handleSquareClick(displayIndex)}
                  dataSquare={editable ? String(displayIndex) : undefined}
                  layoutMode="grid"
                  themeColors={themeColors}
                >
                  {renderPiece(displayPiece, isDragSource)}
                </Square>
              );
            })}
          </div>
          {annotations && <BoardAnnotationOverlay annotations={annotations} flipped={flipped} />}
        </div>
        {annotationsInteractive && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>
              <strong>Right-click</strong> a square for a circle,{' '}
              <strong>right-click + drag</strong> for an arrow.
            </span>
            <span>
              Hold <kbd>Shift</kbd> red, <kbd>Alt</kbd> blue, <kbd>Ctrl</kbd> yellow.
            </span>
            <span>Repeat the same mark to remove it; use a different color to recolor.</span>
            <button
              type="button"
              onClick={clearAnnotations}
              disabled={!hasAnnotations}
              className="ml-auto px-2 py-1 rounded border border-border text-foreground hover:bg-muted disabled:opacity-50 transition-opacity"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Current mode indicator */}
      {editable && (
        <p className="text-sm text-muted-foreground text-center">
          {selectedPiece === ''
            ? labels.removePieceMode
            : selectedPiece
              ? `${labels.placingPiece} ${selectedPiece.toUpperCase()}`
              : 'Select a piece above'}
        </p>
      )}

      {/* Bottom palette */}
      {editable && renderPalette(bottomPalette.pieces, bottomPalette.label)}

      {/* Floating piece that follows the cursor during a drag (palette →
          board, or board → board/off-board). Portaled to <body> so it's
          never clipped by the board's overflow-hidden. See
          useEditableBoardDragDrop. */}
      {dragSource &&
        dragSize !== null &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            aria-hidden
            ref={floatingRef}
            className="pointer-events-none fixed z-[1000] flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
            style={{ width: dragSize, height: dragSize }}
          >
            {renderPiece(dragSource.piece)}
          </div>,
          document.body
        )}
    </div>
  );
}
