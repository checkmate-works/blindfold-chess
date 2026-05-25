/**
 * Tests for `ChessBoard`'s interactive mode (`onMove` prop) — the
 * click-to-move + HTML5 drag-and-drop flow used by always-visible games.
 *
 * What this file covers:
 *   - Click-to-move state machine: select / move / deselect / reselect.
 *   - HTML5 native DnD via mocked `dataTransfer`.
 *   - Legality gating: illegal destinations do NOT fire `onMove`.
 *   - Ownership gating: opponent / empty squares cannot be selected /
 *     dragged.
 *   - Backward compatibility: when `onMove` is not provided, the
 *     existing `onSquareClick` behavior used by practice modes is
 *     preserved.
 *
 * Move legality is validated end-to-end against the real chess.js
 * engine via `findLegalMoveByCoords` (no mock); the tests use canonical
 * positions and assert on the SAN string emitted to onMove.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChessBoard } from './ChessBoard';

// Promotion picker renders aria-labels through the safe-translations
// fallback (which returns the namespaced key path when no provider is
// mounted). Stub the wrapper so assertions use stable strings.
vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => (key: string) => key,
}));

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/** White pawn on e7 ready to promote; both kings out of the way. */
const PROMO_FEN = '8/4P3/8/8/8/8/8/4K2k w - - 0 1';

function squareEl(container: HTMLElement, square: string): HTMLElement {
  const el = container.querySelector<HTMLElement>(`[data-square="${square}"]`);
  if (!el) throw new Error(`Square ${square} not found in board`);
  return el;
}

function pieceInSquare(container: HTMLElement, square: string): HTMLElement {
  const sq = squareEl(container, square);
  const piece = sq.querySelector<HTMLElement>('[draggable="true"]');
  if (!piece) throw new Error(`No draggable piece in ${square}`);
  return piece;
}

/**
 * Mock `dataTransfer` because jsdom's DragEvent does not implement it.
 * Keeps a single string slot — `setData('text/plain', x); getData('text/plain') === x`.
 */
function makeDataTransfer() {
  let stored = '';
  return {
    setData: (_type: string, value: string) => {
      stored = value;
    },
    getData: (_type: string) => stored,
    setDragImage: () => {},
    effectAllowed: '',
    dropEffect: '',
    types: [] as string[],
    files: [] as File[],
    items: [] as DataTransferItem[],
  };
}

afterEach(() => {
  cleanup();
});

describe('ChessBoard interactive mode — click-to-move', () => {
  it('fires onMove with the SAN of a legal move after select → destination clicks', () => {
    const onMove = vi.fn();
    const { container } = render(
      <ChessBoard fen={STARTING_FEN} playerSide="white" onMove={onMove} />
    );

    fireEvent.click(squareEl(container, 'e2')); // select own pawn
    fireEvent.click(squareEl(container, 'e4')); // legal destination

    expect(onMove).toHaveBeenCalledExactlyOnceWith('e4');
  });

  it('does not fire onMove when the destination is illegal', () => {
    const onMove = vi.fn();
    const { container } = render(
      <ChessBoard fen={STARTING_FEN} playerSide="white" onMove={onMove} />
    );

    fireEvent.click(squareEl(container, 'e2')); // select
    fireEvent.click(squareEl(container, 'e5')); // illegal (two squares too far)

    expect(onMove).not.toHaveBeenCalled();
  });

  it('does not select an empty square (no piece to move)', () => {
    const onMove = vi.fn();
    const { container } = render(
      <ChessBoard fen={STARTING_FEN} playerSide="white" onMove={onMove} />
    );

    fireEvent.click(squareEl(container, 'e3')); // empty in start position
    fireEvent.click(squareEl(container, 'e4'));

    expect(onMove).not.toHaveBeenCalled();
  });

  it('does not select an opponent piece (must move own color)', () => {
    const onMove = vi.fn();
    const { container } = render(
      <ChessBoard fen={STARTING_FEN} playerSide="white" onMove={onMove} />
    );

    fireEvent.click(squareEl(container, 'e7')); // opponent pawn
    fireEvent.click(squareEl(container, 'e5')); // would be its legal move

    expect(onMove).not.toHaveBeenCalled();
  });

  it('deselects when the same square is clicked twice', () => {
    const onMove = vi.fn();
    const { container } = render(
      <ChessBoard fen={STARTING_FEN} playerSide="white" onMove={onMove} />
    );

    fireEvent.click(squareEl(container, 'e2')); // select
    fireEvent.click(squareEl(container, 'e2')); // toggle off
    fireEvent.click(squareEl(container, 'e4')); // no selected source → no-op

    expect(onMove).not.toHaveBeenCalled();
  });

  it('reselects when another own piece is clicked instead of moving', () => {
    const onMove = vi.fn();
    const { container } = render(
      <ChessBoard fen={STARTING_FEN} playerSide="white" onMove={onMove} />
    );

    fireEvent.click(squareEl(container, 'e2')); // select e-pawn
    fireEvent.click(squareEl(container, 'd2')); // switch to d-pawn (own piece)
    fireEvent.click(squareEl(container, 'd4')); // legal for the new selection

    expect(onMove).toHaveBeenCalledExactlyOnceWith('d4');
  });

  it('clears selection after a successful move so the next click starts fresh', () => {
    const onMove = vi.fn();
    const { container, rerender } = render(
      <ChessBoard fen={STARTING_FEN} playerSide="white" onMove={onMove} />
    );

    fireEvent.click(squareEl(container, 'e2'));
    fireEvent.click(squareEl(container, 'e4'));
    expect(onMove).toHaveBeenCalledOnce();

    // Caller would update FEN after the move; simulate that here.
    const afterMoveFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
    rerender(<ChessBoard fen={afterMoveFen} playerSide="white" onMove={onMove} />);

    // Clicking a destination square without a fresh select must not fire.
    fireEvent.click(squareEl(container, 'd4'));
    expect(onMove).toHaveBeenCalledOnce();
  });
});

describe('ChessBoard interactive mode — drag-and-drop', () => {
  it('fires onMove when a piece is dragged to a legal destination', () => {
    const onMove = vi.fn();
    const { container } = render(
      <ChessBoard fen={STARTING_FEN} playerSide="white" onMove={onMove} />
    );

    const transfer = makeDataTransfer();
    fireEvent.dragStart(pieceInSquare(container, 'e2'), { dataTransfer: transfer });
    fireEvent.dragOver(squareEl(container, 'e4'), { dataTransfer: transfer });
    fireEvent.drop(squareEl(container, 'e4'), { dataTransfer: transfer });

    expect(onMove).toHaveBeenCalledExactlyOnceWith('e4');
  });

  it('does not fire onMove when the drop target is illegal', () => {
    const onMove = vi.fn();
    const { container } = render(
      <ChessBoard fen={STARTING_FEN} playerSide="white" onMove={onMove} />
    );

    const transfer = makeDataTransfer();
    fireEvent.dragStart(pieceInSquare(container, 'e2'), { dataTransfer: transfer });
    fireEvent.dragOver(squareEl(container, 'e5'), { dataTransfer: transfer });
    fireEvent.drop(squareEl(container, 'e5'), { dataTransfer: transfer });

    expect(onMove).not.toHaveBeenCalled();
  });

  it('does not make opponent pieces draggable', () => {
    const { container } = render(
      <ChessBoard fen={STARTING_FEN} playerSide="white" onMove={() => {}} />
    );

    const opponentSquare = squareEl(container, 'e7');
    expect(opponentSquare.querySelector('[draggable="true"]')).toBeNull();
  });

  it('makes own pieces draggable', () => {
    const { container } = render(
      <ChessBoard fen={STARTING_FEN} playerSide="white" onMove={() => {}} />
    );

    const ownSquare = squareEl(container, 'e2');
    expect(ownSquare.querySelector('[draggable="true"]')).not.toBeNull();
  });

  it('does not make any piece draggable when onMove is not provided', () => {
    const { container } = render(<ChessBoard fen={STARTING_FEN} playerSide="white" />);

    expect(container.querySelector('[draggable="true"]')).toBeNull();
  });
});

describe('ChessBoard interactive mode — promotion picker', () => {
  it('opens the picker (and does NOT yet fire onMove) on click promotion', () => {
    const onMove = vi.fn();
    const { container } = render(<ChessBoard fen={PROMO_FEN} playerSide="white" onMove={onMove} />);

    fireEvent.click(squareEl(container, 'e7'));
    fireEvent.click(squareEl(container, 'e8'));

    expect(onMove).not.toHaveBeenCalled();
    // All four promotion buttons are present in the picker.
    expect(screen.getByLabelText('promotionPicker.promoteTo.queen')).toBeInTheDocument();
    expect(screen.getByLabelText('promotionPicker.promoteTo.rook')).toBeInTheDocument();
    expect(screen.getByLabelText('promotionPicker.promoteTo.bishop')).toBeInTheDocument();
    expect(screen.getByLabelText('promotionPicker.promoteTo.knight')).toBeInTheDocument();
  });

  it('fires onMove with the queen SAN when the queen button is clicked', () => {
    const onMove = vi.fn();
    const { container } = render(<ChessBoard fen={PROMO_FEN} playerSide="white" onMove={onMove} />);

    fireEvent.click(squareEl(container, 'e7'));
    fireEvent.click(squareEl(container, 'e8'));
    fireEvent.click(screen.getByLabelText('promotionPicker.promoteTo.queen'));

    expect(onMove).toHaveBeenCalledExactlyOnceWith('e8=Q');
  });

  it('honors underpromotion: clicking the knight fires the knight SAN', () => {
    const onMove = vi.fn();
    const { container } = render(<ChessBoard fen={PROMO_FEN} playerSide="white" onMove={onMove} />);

    fireEvent.click(squareEl(container, 'e7'));
    fireEvent.click(squareEl(container, 'e8'));
    fireEvent.click(screen.getByLabelText('promotionPicker.promoteTo.knight'));

    expect(onMove).toHaveBeenCalledExactlyOnceWith('e8=N');
  });

  it('cancels via the backdrop click — no onMove, picker dismissed', () => {
    const onMove = vi.fn();
    const { container } = render(<ChessBoard fen={PROMO_FEN} playerSide="white" onMove={onMove} />);

    fireEvent.click(squareEl(container, 'e7'));
    fireEvent.click(squareEl(container, 'e8'));

    // The backdrop has its own aria-label for dismiss.
    fireEvent.click(screen.getByLabelText('promotionPicker.cancel'));

    expect(onMove).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('promotionPicker.promoteTo.queen')).not.toBeInTheDocument();
  });

  it('cancels via the Escape key', () => {
    const onMove = vi.fn();
    const { container } = render(<ChessBoard fen={PROMO_FEN} playerSide="white" onMove={onMove} />);

    fireEvent.click(squareEl(container, 'e7'));
    fireEvent.click(squareEl(container, 'e8'));

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onMove).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('promotionPicker.promoteTo.queen')).not.toBeInTheDocument();
  });

  it('opens the picker after a drag-and-drop promotion', () => {
    const onMove = vi.fn();
    const { container } = render(<ChessBoard fen={PROMO_FEN} playerSide="white" onMove={onMove} />);

    const transfer = makeDataTransfer();
    fireEvent.dragStart(pieceInSquare(container, 'e7'), { dataTransfer: transfer });
    fireEvent.dragOver(squareEl(container, 'e8'), { dataTransfer: transfer });
    fireEvent.drop(squareEl(container, 'e8'), { dataTransfer: transfer });

    expect(onMove).not.toHaveBeenCalled();
    expect(screen.getByLabelText('promotionPicker.promoteTo.queen')).toBeInTheDocument();
  });

  it('does not open the picker for a regular (non-promotion) move', () => {
    const onMove = vi.fn();
    const { container } = render(
      <ChessBoard fen={STARTING_FEN} playerSide="white" onMove={onMove} />
    );

    fireEvent.click(squareEl(container, 'e2'));
    fireEvent.click(squareEl(container, 'e4'));

    expect(onMove).toHaveBeenCalledExactlyOnceWith('e4');
    expect(screen.queryByLabelText('promotionPicker.promoteTo.queen')).not.toBeInTheDocument();
  });
});

describe('ChessBoard interactive mode — onSquareClick backward compat', () => {
  it('forwards raw clicks to onSquareClick when onMove is not provided', () => {
    const onSquareClick = vi.fn();
    const { container } = render(
      <ChessBoard fen={STARTING_FEN} playerSide="white" onSquareClick={onSquareClick} />
    );

    fireEvent.click(squareEl(container, 'e2'));
    fireEvent.click(squareEl(container, 'e4'));

    // No select/move state machine — each click is its own event.
    expect(onSquareClick).toHaveBeenCalledTimes(2);
    expect(onSquareClick).toHaveBeenNthCalledWith(1, 'e2');
    expect(onSquareClick).toHaveBeenNthCalledWith(2, 'e4');
  });

  it('routes clicks through onMove (not onSquareClick) when both are provided', () => {
    const onMove = vi.fn();
    const onSquareClick = vi.fn();
    const { container } = render(
      <ChessBoard
        fen={STARTING_FEN}
        playerSide="white"
        onMove={onMove}
        onSquareClick={onSquareClick}
      />
    );

    fireEvent.click(squareEl(container, 'e2'));
    fireEvent.click(squareEl(container, 'e4'));

    expect(onMove).toHaveBeenCalledExactlyOnceWith('e4');
    expect(onSquareClick).not.toHaveBeenCalled();
  });
});
