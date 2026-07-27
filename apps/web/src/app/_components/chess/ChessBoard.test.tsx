/**
 * Tests for `ChessBoard`'s interactive mode (`onMove` prop) — the
 * click-to-move + pointer-drag flow used by always-visible games.
 *
 * What this file covers:
 *   - Click-to-move state machine: select / move / deselect / reselect.
 *   - Pointer-based dragging (pointerdown → pointermove → pointerup).
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

/**
 * Simulate a pointer drag from `from` to `to`. ChessBoard uses pointer-based
 * dragging (not HTML5 native DnD): pointerdown on the source, a pointermove
 * past the threshold dispatched on `window` (where the live listeners sit),
 * then pointerup whose `target` is the destination square (the floating piece
 * is `pointer-events: none`, so in a real browser the square is hit too).
 */
function dragPiece(
  container: HTMLElement,
  from: string,
  to: string,
  opts: { startX?: number; startY?: number; endX?: number; endY?: number } = {}
) {
  const { startX = 10, startY = 10, endX = 100, endY = 100 } = opts;
  fireEvent.pointerDown(squareEl(container, from), { button: 0, clientX: startX, clientY: startY });
  fireEvent.pointerMove(window, { clientX: endX, clientY: endY });
  fireEvent.pointerUp(squareEl(container, to), { clientX: endX, clientY: endY });
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

describe('ChessBoard interactive mode — pointer drag', () => {
  it('fires onMove when a piece is dragged to a legal destination', () => {
    const onMove = vi.fn();
    const { container } = render(
      <ChessBoard fen={STARTING_FEN} playerSide="white" onMove={onMove} />
    );

    dragPiece(container, 'e2', 'e4');

    expect(onMove).toHaveBeenCalledExactlyOnceWith('e4');
  });

  it('does not fire onMove when the drop target is illegal', () => {
    const onMove = vi.fn();
    const { container } = render(
      <ChessBoard fen={STARTING_FEN} playerSide="white" onMove={onMove} />
    );

    dragPiece(container, 'e2', 'e5'); // two squares too far

    expect(onMove).not.toHaveBeenCalled();
  });

  it('does not start a drag from an opponent piece', () => {
    const onMove = vi.fn();
    const { container } = render(
      <ChessBoard fen={STARTING_FEN} playerSide="white" onMove={onMove} />
    );

    dragPiece(container, 'e7', 'e5'); // opponent pawn → its "legal" advance

    expect(onMove).not.toHaveBeenCalled();
  });

  it('does not fire onMove when the piece is dropped back on its origin', () => {
    const onMove = vi.fn();
    const { container } = render(
      <ChessBoard fen={STARTING_FEN} playerSide="white" onMove={onMove} />
    );

    dragPiece(container, 'e2', 'e2');

    expect(onMove).not.toHaveBeenCalled();
  });

  it('lifts a floating piece into a body portal while dragging, removed on drop', () => {
    const onMove = vi.fn();
    const { container } = render(
      <ChessBoard fen={STARTING_FEN} playerSide="white" onMove={onMove} />
    );

    // Mid-drag: pointer down + a move past the threshold, no release yet. The
    // floating piece is the only `fixed`-positioned overlay (highlight overlays
    // are `absolute`), so this selector targets it specifically.
    fireEvent.pointerDown(squareEl(container, 'e2'), { button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(window, { clientX: 100, clientY: 100 });
    expect(document.body.querySelector('.fixed[aria-hidden]')).not.toBeNull();

    // Release → floating piece is torn down.
    fireEvent.pointerUp(squareEl(container, 'e4'), { clientX: 100, clientY: 100 });
    expect(document.body.querySelector('.fixed[aria-hidden]')).toBeNull();
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

  it('opens the picker after a drag promotion', () => {
    const onMove = vi.fn();
    const { container } = render(<ChessBoard fen={PROMO_FEN} playerSide="white" onMove={onMove} />);

    dragPiece(container, 'e7', 'e8');

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

describe('ChessBoard interactive mode — illegal-move reporting (onIllegalMove)', () => {
  it('fires onIllegalMove on a destination click to an illegal empty square', () => {
    const onMove = vi.fn();
    const onIllegalMove = vi.fn();
    const { container } = render(
      <ChessBoard
        fen={STARTING_FEN}
        playerSide="white"
        onMove={onMove}
        onIllegalMove={onIllegalMove}
      />
    );

    fireEvent.click(squareEl(container, 'e2')); // select
    fireEvent.click(squareEl(container, 'e5')); // illegal (two squares too far)

    expect(onMove).not.toHaveBeenCalled();
    // Same-file pawn push → bare-destination SAN-like label, plus the exact
    // squares (unrecoverable from the label alone once disambiguation matters).
    expect(onIllegalMove).toHaveBeenCalledExactlyOnceWith('e5', { from: 'e2', to: 'e5' });
  });

  it('does not fire onIllegalMove when reselecting another own piece', () => {
    const onMove = vi.fn();
    const onIllegalMove = vi.fn();
    const { container } = render(
      <ChessBoard
        fen={STARTING_FEN}
        playerSide="white"
        onMove={onMove}
        onIllegalMove={onIllegalMove}
      />
    );

    fireEvent.click(squareEl(container, 'e2')); // select e-pawn
    fireEvent.click(squareEl(container, 'd2')); // switch to own d-pawn — a reselect, not a mistake

    expect(onIllegalMove).not.toHaveBeenCalled();
  });

  it('does not fire onIllegalMove on a legal move', () => {
    const onMove = vi.fn();
    const onIllegalMove = vi.fn();
    const { container } = render(
      <ChessBoard
        fen={STARTING_FEN}
        playerSide="white"
        onMove={onMove}
        onIllegalMove={onIllegalMove}
      />
    );

    fireEvent.click(squareEl(container, 'e2'));
    fireEvent.click(squareEl(container, 'e4'));

    expect(onMove).toHaveBeenCalledExactlyOnceWith('e4');
    expect(onIllegalMove).not.toHaveBeenCalled();
  });

  it('does not fire onIllegalMove on the toggle-off (same-square) click', () => {
    const onMove = vi.fn();
    const onIllegalMove = vi.fn();
    const { container } = render(
      <ChessBoard
        fen={STARTING_FEN}
        playerSide="white"
        onMove={onMove}
        onIllegalMove={onIllegalMove}
      />
    );

    fireEvent.click(squareEl(container, 'e2')); // select
    fireEvent.click(squareEl(container, 'e2')); // deselect

    expect(onIllegalMove).not.toHaveBeenCalled();
  });

  it('fires onIllegalMove on a drag onto an illegal square', () => {
    const onMove = vi.fn();
    const onIllegalMove = vi.fn();
    const { container } = render(
      <ChessBoard
        fen={STARTING_FEN}
        playerSide="white"
        onMove={onMove}
        onIllegalMove={onIllegalMove}
      />
    );

    dragPiece(container, 'e2', 'e5'); // illegal advance

    expect(onMove).not.toHaveBeenCalled();
    expect(onIllegalMove).toHaveBeenCalledExactlyOnceWith('e5', { from: 'e2', to: 'e5' });
  });

  it('does not fire onIllegalMove when a drag is dropped back on its origin', () => {
    const onMove = vi.fn();
    const onIllegalMove = vi.fn();
    const { container } = render(
      <ChessBoard
        fen={STARTING_FEN}
        playerSide="white"
        onMove={onMove}
        onIllegalMove={onIllegalMove}
      />
    );

    dragPiece(container, 'e2', 'e2');

    expect(onIllegalMove).not.toHaveBeenCalled();
  });
});

describe('ChessBoard interactive mode — obfuscation does not change click counting (single-color / discs)', () => {
  // A position where White's d-bishop on e2 is absolutely pinned to the king
  // on e1 by the black rook on e8 — moving it sideways is illegal.
  const PIN_FEN = '4r2k/8/8/8/8/8/4B3/4K3 w - - 0 1';

  it('does NOT count a first click onto the opponent piece (mis-grab names no move)', () => {
    const onMove = vi.fn();
    const onIllegalMove = vi.fn();
    const { container } = render(
      <ChessBoard
        fen={STARTING_FEN}
        playerSide="white"
        pieceColors="white-only"
        onMove={onMove}
        onIllegalMove={onIllegalMove}
      />
    );

    fireEvent.click(squareEl(container, 'e7')); // opponent pawn, nothing selected yet

    // A first tap with no selection names no source → destination, so it is a
    // no-op — indistinguishable from a misclick and not a counted attempt.
    expect(onIllegalMove).not.toHaveBeenCalled();
    expect(onMove).not.toHaveBeenCalled();
  });

  it('does NOT count a first click onto an empty square', () => {
    const onIllegalMove = vi.fn();
    const { container } = render(
      <ChessBoard
        fen={STARTING_FEN}
        playerSide="white"
        pieceColors="white-only"
        onMove={() => {}}
        onIllegalMove={onIllegalMove}
      />
    );

    fireEvent.click(squareEl(container, 'e4')); // empty, nothing selected

    expect(onIllegalMove).not.toHaveBeenCalled();
  });

  it('reselects another own piece after a selection instead of counting it (change of intent)', () => {
    // Regression: playing White, tap the d-pawn (intending d4), then change
    // your mind to the Réti and tap the g1 knight. Tapping one's own piece is a
    // reselection, NOT an illegal "dxg1" — even while obfuscated (white-only).
    const onMove = vi.fn();
    const onIllegalMove = vi.fn();
    const { container } = render(
      <ChessBoard
        fen={STARTING_FEN}
        playerSide="white"
        pieceColors="white-only"
        onMove={onMove}
        onIllegalMove={onIllegalMove}
      />
    );

    fireEvent.click(squareEl(container, 'd2')); // select own d-pawn
    fireEvent.click(squareEl(container, 'g1')); // changed mind → tap own knight

    expect(onIllegalMove).not.toHaveBeenCalled();

    // The knight is now the selection: playing Nf3 goes straight through.
    fireEvent.click(squareEl(container, 'f3'));
    expect(onMove).toHaveBeenCalledExactlyOnceWith('Nf3');
  });

  it('counts trying to move an absolutely-pinned piece', () => {
    const onMove = vi.fn();
    const onIllegalMove = vi.fn();
    const { container } = render(
      <ChessBoard
        fen={PIN_FEN}
        playerSide="white"
        pieceColors="white-only"
        onMove={onMove}
        onIllegalMove={onIllegalMove}
      />
    );

    fireEvent.click(squareEl(container, 'e2')); // select the pinned bishop
    fireEvent.click(squareEl(container, 'd3')); // would be legal if not pinned

    // Bishop to an empty square → piece SAN-like, no capture mark.
    expect(onIllegalMove).toHaveBeenCalledExactlyOnceWith('Bd3', { from: 'e2', to: 'd3' });
    expect(onMove).not.toHaveBeenCalled();
  });

  it('still plays a legal move and does not count it', () => {
    const onMove = vi.fn();
    const onIllegalMove = vi.fn();
    const { container } = render(
      <ChessBoard
        fen={STARTING_FEN}
        playerSide="white"
        pieceColors="white-only"
        onMove={onMove}
        onIllegalMove={onIllegalMove}
      />
    );

    fireEvent.click(squareEl(container, 'e2'));
    fireEvent.click(squareEl(container, 'e4'));

    expect(onMove).toHaveBeenCalledExactlyOnceWith('e4');
    expect(onIllegalMove).not.toHaveBeenCalled();
  });
});

describe('ChessBoard interactive mode — lichess-style move highlights (normal display)', () => {
  // White pawn on e4, black pawn on d5: e4 can advance to e5 (empty → dot)
  // or capture on d5 (occupied → ring). Kings kept clear of the action.
  const CAPTURE_FEN = '4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1';

  /** The `data-highlight` value on the overlay inside a square, or null. */
  function highlightOf(container: HTMLElement, square: string): string | null {
    return (
      squareEl(container, square)
        .querySelector('[data-highlight]')
        ?.getAttribute('data-highlight') ?? null
    );
  }

  it('marks the selected square with the lichess "selected" overlay', () => {
    const { container } = render(
      <ChessBoard fen={STARTING_FEN} playerSide="white" onMove={() => {}} />
    );

    fireEvent.click(squareEl(container, 'e2')); // select own pawn
    expect(highlightOf(container, 'e2')).toBe('selected');
  });

  it('marks a legal empty destination with a move-dest dot', () => {
    const { container } = render(
      <ChessBoard fen={STARTING_FEN} playerSide="white" onMove={() => {}} />
    );

    fireEvent.click(squareEl(container, 'e2'));
    expect(highlightOf(container, 'e4')).toBe('move-dest');
  });

  it('marks a legal capture destination with a capture-dest ring', () => {
    const { container } = render(
      <ChessBoard fen={CAPTURE_FEN} playerSide="white" onMove={() => {}} />
    );

    fireEvent.click(squareEl(container, 'e4')); // select the pawn
    expect(highlightOf(container, 'd5')).toBe('capture-dest'); // occupied target
    expect(highlightOf(container, 'e5')).toBe('move-dest'); // empty advance
  });
});

describe('ChessBoard interactive mode — obfuscation suppresses the legal-destination highlight', () => {
  /** The `data-highlight` value on the overlay inside a square, or null. */
  function highlightOf(container: HTMLElement, square: string): string | null {
    return (
      squareEl(container, square)
        .querySelector('[data-highlight]')
        ?.getAttribute('data-highlight') ?? null
    );
  }

  it('still marks the selected square (selection feedback is not a leak)', () => {
    const { container } = render(
      <ChessBoard
        fen={STARTING_FEN}
        playerSide="white"
        pieceColors="white-only"
        onMove={() => {}}
      />
    );

    fireEvent.click(squareEl(container, 'e2'));
    expect(highlightOf(container, 'e2')).toBe('selected');
  });

  it('suppresses the legal-destination dots when pieces are shown as discs (pieceShapeMode)', () => {
    const { container } = render(
      <ChessBoard
        fen={STARTING_FEN}
        playerSide="white"
        pieceShapeMode="circles-all"
        onMove={() => {}}
      />
    );

    fireEvent.click(squareEl(container, 'e2'));
    expect(highlightOf(container, 'e4')).toBeNull();
  });

  it('still shows the legal-destination dots in single-color mode (shapes stay intact)', () => {
    // Single-colour only recolours the pieces; their shapes (and thus
    // identities) are fully visible, so the destination dots leak nothing.
    const { container } = render(
      <ChessBoard
        fen={STARTING_FEN}
        playerSide="white"
        pieceColors="white-only"
        onMove={() => {}}
      />
    );

    fireEvent.click(squareEl(container, 'e2'));
    expect(highlightOf(container, 'e4')).toBe('move-dest');
  });

  it('suppresses the legal-destination dots when own pieces are hidden (showOwnPieces=false)', () => {
    const { container } = render(
      <ChessBoard fen={STARTING_FEN} playerSide="white" showOwnPieces={false} onMove={() => {}} />
    );

    fireEvent.click(squareEl(container, 'e2'));
    expect(highlightOf(container, 'e4')).toBeNull();
  });
});

/**
 * `hiddenPieceStyle` controls how a piece hidden by the blindfold settings is
 * drawn. `'absent'` (default, live play) renders an empty square; `'ghost'`
 * (the review's "As Played" toggle) renders a faint copy of the true piece so
 * the reviewer sees what was concealed and can tell a hidden square from an
 * empty one.
 */
describe('ChessBoard — hiddenPieceStyle', () => {
  // A rendered piece (normal or ghost) is wrapped in a `w-[80%]` box; the ghost
  // wrapper additionally carries `opacity-40`.
  const pieceBox = (sq: HTMLElement) => sq.querySelector('[class*="w-[80%]"]');
  const ghostBox = (sq: HTMLElement) => sq.querySelector('[class*="opacity-40"]');

  it("defaults to 'absent' — a hidden own piece leaves an empty square", () => {
    const { container } = render(
      <ChessBoard
        fen={STARTING_FEN}
        playerSide="white"
        showOwnPieces={false}
        onSquareClick={() => {}}
      />
    );
    expect(pieceBox(squareEl(container, 'e2'))).toBeNull();
  });

  it("'ghost' renders the hidden own piece as a faint copy instead of hiding it", () => {
    const { container } = render(
      <ChessBoard
        fen={STARTING_FEN}
        playerSide="white"
        showOwnPieces={false}
        hiddenPieceStyle="ghost"
        onSquareClick={() => {}}
      />
    );
    const e2 = squareEl(container, 'e2');
    expect(pieceBox(e2)).not.toBeNull();
    expect(ghostBox(e2)).not.toBeNull();
  });

  it("'ghost' does not fade pieces that were visible", () => {
    const { container } = render(
      <ChessBoard
        fen={STARTING_FEN}
        playerSide="white"
        showOwnPieces={false}
        hiddenPieceStyle="ghost"
        onSquareClick={() => {}}
      />
    );
    // The opponent's pieces stay shown (showOpponentPieces defaults true) — solid,
    // not ghosted.
    const e7 = squareEl(container, 'e7');
    expect(pieceBox(e7)).not.toBeNull();
    expect(ghostBox(e7)).toBeNull();
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

/**
 * `movablePieces` gates which color the user can pick up. The default ('own')
 * is the real-game rule — only `playerSide` responds, even on the opponent's
 * turn. 'side-to-move' (recall) lets whichever color is to move respond,
 * so the reviewer can enter the opponent's moves too. These tests lock BOTH
 * so a future change can't silently make the opponent's pieces grabbable in a
 * normal game.
 */
describe('ChessBoard interactive mode — movablePieces gating', () => {
  // Black to move (after 1.e4). Black's e7-e5 is a legal reply.
  const BLACK_TO_MOVE_FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';

  it("default ('own'): the opponent's piece stays inert even on the opponent's turn", () => {
    const onMove = vi.fn();
    const { container } = render(
      <ChessBoard fen={BLACK_TO_MOVE_FEN} playerSide="white" onMove={onMove} />
    );

    // Click selection and drag both must do nothing for black (the opponent).
    fireEvent.click(squareEl(container, 'e7'));
    fireEvent.click(squareEl(container, 'e5'));
    dragPiece(container, 'e7', 'e5');

    expect(onMove).not.toHaveBeenCalled();
  });

  it("'side-to-move': the opponent's piece moves on the opponent's turn (click)", () => {
    const onMove = vi.fn();
    const { container } = render(
      <ChessBoard
        fen={BLACK_TO_MOVE_FEN}
        playerSide="white"
        onMove={onMove}
        movablePieces="side-to-move"
      />
    );

    fireEvent.click(squareEl(container, 'e7')); // black pawn — now selectable
    fireEvent.click(squareEl(container, 'e5')); // its legal advance

    expect(onMove).toHaveBeenCalledExactlyOnceWith('e5');
  });

  it("'side-to-move': the opponent's piece moves on the opponent's turn (drag)", () => {
    const onMove = vi.fn();
    const { container } = render(
      <ChessBoard
        fen={BLACK_TO_MOVE_FEN}
        playerSide="white"
        onMove={onMove}
        movablePieces="side-to-move"
      />
    );

    dragPiece(container, 'e7', 'e5');

    expect(onMove).toHaveBeenCalledExactlyOnceWith('e5');
  });

  it("'side-to-move': the side NOT to move is inert (white can't move on black's turn)", () => {
    const onMove = vi.fn();
    const { container } = render(
      <ChessBoard
        fen={BLACK_TO_MOVE_FEN}
        playerSide="white"
        onMove={onMove}
        movablePieces="side-to-move"
      />
    );

    fireEvent.click(squareEl(container, 'e4')); // white pawn — not the side to move
    fireEvent.click(squareEl(container, 'e5'));

    expect(onMove).not.toHaveBeenCalled();
  });

  it("'side-to-move': own pieces still move on the player's own turn", () => {
    const onMove = vi.fn();
    const { container } = render(
      <ChessBoard
        fen={STARTING_FEN}
        playerSide="white"
        onMove={onMove}
        movablePieces="side-to-move"
      />
    );

    fireEvent.click(squareEl(container, 'e2'));
    fireEvent.click(squareEl(container, 'e4'));

    expect(onMove).toHaveBeenCalledExactlyOnceWith('e4');
  });
});

/**
 * Count move-affordance overlays of a given kind on the board. Used by the
 * preview-selection tests, which run on a non-interactive board where squares
 * carry no `data-square` hook (that is only emitted for clickable boards) — the
 * `data-highlight` overlays are still painted, so we assert on those directly.
 */
function countHighlights(container: HTMLElement, type: string): number {
  return container.querySelectorAll(`[data-highlight="${type}"]`).length;
}

describe('ChessBoard preview selection (non-interactive)', () => {
  it('marks the previewed square selected and shows its legal destinations as dots without onMove', () => {
    // No onMove → non-interactive board (e.g. the settings BoardPreview). The
    // d2 pawn from the start position has exactly two destinations: d3 and d4.
    const { container } = render(
      <ChessBoard fen={STARTING_FEN} playerSide="white" previewSelection="d2" />
    );

    expect(countHighlights(container, 'selected')).toBe(1);
    expect(countHighlights(container, 'move-dest')).toBe(2);
  });

  it('suppresses the destination dots when showPieceDestinations is off', () => {
    const { container } = render(
      <ChessBoard
        fen={STARTING_FEN}
        playerSide="white"
        previewSelection="d2"
        showPieceDestinations={false}
      />
    );

    expect(countHighlights(container, 'move-dest')).toBe(0);
  });

  it('suppresses the destination dots when the board is obfuscated (hidden pieces)', () => {
    const { container } = render(
      <ChessBoard
        fen={STARTING_FEN}
        playerSide="white"
        previewSelection="d2"
        showOwnPieces={false}
      />
    );

    expect(countHighlights(container, 'move-dest')).toBe(0);
  });

  it('still shows destinations in single-colour mode (shapes stay visible)', () => {
    const { container } = render(
      <ChessBoard
        fen={STARTING_FEN}
        playerSide="white"
        previewSelection="d2"
        pieceColors="white-only"
      />
    );

    expect(countHighlights(container, 'move-dest')).toBe(2);
  });

  it('suppresses the destination dots when pieces are shown as stones', () => {
    const { container } = render(
      <ChessBoard
        fen={STARTING_FEN}
        playerSide="white"
        previewSelection="d2"
        pieceShapeMode="circles-all"
      />
    );

    expect(countHighlights(container, 'move-dest')).toBe(0);
  });
});

describe('ChessBoard — pawn hiding (pawnHideMode)', () => {
  // Asymmetric position so own (white) vs opponent (black) hides distinguish:
  // 3 white pawns (a2,b2,c2) + 5 black pawns (d7..h7) + 2 kings = 10 piece svgs.
  // Pieces render as <svg> (normal display); coordinates/highlights are not svg,
  // so counting svgs counts visible pieces.
  const PAWN_FEN = '4k3/3ppppp/8/8/8/8/PPP5/4K3 w - - 0 1';
  const countPieces = (c: HTMLElement) => c.querySelectorAll('svg').length;

  it('shows every pawn by default', () => {
    const { container } = render(<ChessBoard fen={PAWN_FEN} playerSide="white" />);
    expect(countPieces(container)).toBe(10);
  });

  it("hides both sides' pawns with 'all' (kings remain)", () => {
    const { container } = render(
      <ChessBoard fen={PAWN_FEN} playerSide="white" pawnHideMode="all" />
    );
    expect(countPieces(container)).toBe(2);
  });

  it("hides only own pawns with 'own' (3 white pawns gone)", () => {
    const { container } = render(
      <ChessBoard fen={PAWN_FEN} playerSide="white" pawnHideMode="own" />
    );
    expect(countPieces(container)).toBe(7);
  });

  it("hides only opponent pawns with 'opponent' (5 black pawns gone)", () => {
    const { container } = render(
      <ChessBoard fen={PAWN_FEN} playerSide="white" pawnHideMode="opponent" />
    );
    expect(countPieces(container)).toBe(5);
  });

  it("'own' is relative to playerSide — black perspective hides the black pawns", () => {
    const { container } = render(
      <ChessBoard fen={PAWN_FEN} playerSide="black" pawnHideMode="own" />
    );
    // Own = black (5 pawns) → 10 - 5 = 5 remain.
    expect(countPieces(container)).toBe(5);
  });
});
