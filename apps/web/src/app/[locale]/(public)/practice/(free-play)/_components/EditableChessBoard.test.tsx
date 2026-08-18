/**
 * Tests for `EditableChessBoard`'s piece-placement interactions:
 *   - Tap-to-place / tap-to-remove (pre-existing behavior, unchanged).
 *   - Pointer-based drag-and-drop (new): palette → board, board → board,
 *     and board → off-board (remove), mirroring the pattern established by
 *     `ChessBoard.test.tsx`'s "pointer drag" suite (pointerdown → pointermove
 *     on `window` → pointerup on the destination).
 *   - The synthetic click that trails a completed drag must not double-apply
 *     the drop as a second tap action.
 */
import { fenToBoardFlat } from '@blindfold-chess/features/chess-core/fen';
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { EditableChessBoard } from './EditableChessBoard';

const EMPTY_BOARD_FEN = '8/8/8/8/8/8/8/8 w - - 0 1';
const LABELS = {
  whitePieces: 'White pieces',
  blackPieces: 'Black pieces',
  removePieceMode: 'Remove piece mode',
  placingPiece: 'Placing',
};

function squareEl(container: HTMLElement, index: number): HTMLElement {
  const el = container.querySelector<HTMLElement>(`[data-square="${index}"]`);
  if (!el) throw new Error(`Square ${index} not found`);
  return el;
}

function paletteButton(container: HTMLElement, piece: string): HTMLElement {
  // jsdom's querySelector matches `[data-x="N"]` case-insensitively against
  // the attribute value (unlike real browsers), which would otherwise match
  // the wrong color's button (white 'N' vs black 'n') — filter in JS instead.
  const el = Array.from(container.querySelectorAll<HTMLElement>('[data-palette-piece]')).find(
    (candidate) => candidate.dataset.palettePiece === piece
  );
  if (!el) throw new Error(`Palette piece ${piece} not found`);
  return el;
}

/** The board array (index 0..63) decoded from the latest onFenChange call. */
function lastBoard(onFenChange: ReturnType<typeof vi.fn>): string[] {
  const calls = onFenChange.mock.calls;
  const lastFen = calls[calls.length - 1]![0] as string;
  return fenToBoardFlat(lastFen) as string[];
}

function dragPalette(
  container: HTMLElement,
  piece: string,
  toIndex: number,
  opts: { endX?: number; endY?: number } = {}
) {
  const { endX = 200, endY = 200 } = opts;
  fireEvent.pointerDown(paletteButton(container, piece), { button: 0, clientX: 10, clientY: 10 });
  fireEvent.pointerMove(window, { clientX: endX, clientY: endY });
  fireEvent.pointerUp(squareEl(container, toIndex), { clientX: endX, clientY: endY });
}

function dragSquare(
  container: HTMLElement,
  fromIndex: number,
  target: HTMLElement,
  opts: { endX?: number; endY?: number } = {}
) {
  const { endX = 200, endY = 200 } = opts;
  fireEvent.pointerDown(squareEl(container, fromIndex), { button: 0, clientX: 10, clientY: 10 });
  fireEvent.pointerMove(window, { clientX: endX, clientY: endY });
  fireEvent.pointerUp(target, { clientX: endX, clientY: endY });
}

describe('EditableChessBoard — tap-to-place (unchanged)', () => {
  it('selecting a palette piece then clicking a square places it', () => {
    const onFenChange = vi.fn();
    const { container } = render(
      <EditableChessBoard
        fen={EMPTY_BOARD_FEN}
        onFenChange={onFenChange}
        labels={LABELS}
        editable
      />
    );

    fireEvent.click(paletteButton(container, 'N'));
    fireEvent.click(squareEl(container, 5));

    expect(onFenChange).toHaveBeenCalledTimes(1);
    expect(lastBoard(onFenChange)[5]).toBe('N');
  });

  it('clicking the same piece again toggles it off', () => {
    const onFenChange = vi.fn();
    const { container } = render(
      <EditableChessBoard
        fen={EMPTY_BOARD_FEN}
        onFenChange={onFenChange}
        labels={LABELS}
        editable
      />
    );

    fireEvent.click(paletteButton(container, 'N'));
    fireEvent.click(squareEl(container, 5));
    fireEvent.click(squareEl(container, 5));

    expect(lastBoard(onFenChange)[5]).toBe('');
  });
});

describe('EditableChessBoard — drag-and-drop', () => {
  it('dragging a palette piece onto an empty square places it', () => {
    const onFenChange = vi.fn();
    const { container } = render(
      <EditableChessBoard
        fen={EMPTY_BOARD_FEN}
        onFenChange={onFenChange}
        labels={LABELS}
        editable
      />
    );

    dragPalette(container, 'Q', 12);

    expect(onFenChange).toHaveBeenCalledTimes(1);
    expect(lastBoard(onFenChange)[12]).toBe('Q');
  });

  it('dragging a board piece to another square moves it (clears the source)', () => {
    const onFenChange = vi.fn();
    const { container } = render(
      <EditableChessBoard
        fen={EMPTY_BOARD_FEN}
        onFenChange={onFenChange}
        labels={LABELS}
        editable
      />
    );

    // Place a piece first via tap, then drag it elsewhere.
    fireEvent.click(paletteButton(container, 'R'));
    fireEvent.click(squareEl(container, 3));
    onFenChange.mockClear();

    dragSquare(container, 3, squareEl(container, 40));

    expect(onFenChange).toHaveBeenCalledTimes(1);
    const board = lastBoard(onFenChange);
    expect(board[40]).toBe('R');
    expect(board[3]).toBe('');
  });

  it('dragging a board piece onto an occupied square overwrites the destination', () => {
    const onFenChange = vi.fn();
    const { container } = render(
      <EditableChessBoard
        fen={EMPTY_BOARD_FEN}
        onFenChange={onFenChange}
        labels={LABELS}
        editable
      />
    );

    fireEvent.click(paletteButton(container, 'B'));
    fireEvent.click(squareEl(container, 1));
    fireEvent.click(paletteButton(container, 'P'));
    fireEvent.click(squareEl(container, 9));
    onFenChange.mockClear();

    dragSquare(container, 1, squareEl(container, 9));

    const board = lastBoard(onFenChange);
    expect(board[9]).toBe('B');
    expect(board[1]).toBe('');
  });

  it('dragging a board piece off the board removes it', () => {
    const onFenChange = vi.fn();
    const { container } = render(
      <EditableChessBoard
        fen={EMPTY_BOARD_FEN}
        onFenChange={onFenChange}
        labels={LABELS}
        editable
      />
    );

    fireEvent.click(paletteButton(container, 'K'));
    fireEvent.click(squareEl(container, 27));
    onFenChange.mockClear();

    // Release over `document.body` — outside any [data-square] element.
    fireEvent.pointerDown(squareEl(container, 27), { button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(window, { clientX: 9999, clientY: 9999 });
    fireEvent.pointerUp(document.body, { clientX: 9999, clientY: 9999 });

    expect(onFenChange).toHaveBeenCalledTimes(1);
    expect(lastBoard(onFenChange)[27]).toBe('');
  });

  it('dragging a palette piece off the board is a no-op (cancel)', () => {
    const onFenChange = vi.fn();
    render(
      <EditableChessBoard
        fen={EMPTY_BOARD_FEN}
        onFenChange={onFenChange}
        labels={LABELS}
        editable
      />
    );

    const palette = paletteButton(document.body, 'Q');
    fireEvent.pointerDown(palette, { button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(window, { clientX: 9999, clientY: 9999 });
    fireEvent.pointerUp(document.body, { clientX: 9999, clientY: 9999 });

    expect(onFenChange).not.toHaveBeenCalled();
  });

  it('a drag shorter than the movement threshold is treated as a tap, not a drag', () => {
    const onFenChange = vi.fn();
    const { container } = render(
      <EditableChessBoard
        fen={EMPTY_BOARD_FEN}
        onFenChange={onFenChange}
        labels={LABELS}
        editable
      />
    );

    // Select Knight via tap, then "drag" it 1px onto an empty square — this
    // should resolve as a plain click-to-place using the selected piece,
    // not a drag-from-palette (which never armed, since movement never
    // crossed DRAG_THRESHOLD_PX). Real browsers dispatch a genuine `click`
    // after a sub-threshold pointerdown/up; fireEvent doesn't do this for
    // us, so it's simulated explicitly here.
    fireEvent.click(paletteButton(container, 'N'));
    dragPalette(container, 'N', 30, { endX: 11, endY: 10 });
    fireEvent.click(squareEl(container, 30));

    expect(lastBoard(onFenChange)[30]).toBe('N');
  });

  it('the trailing click after a completed drag does not double-apply the drop', () => {
    const onFenChange = vi.fn();
    const { container } = render(
      <EditableChessBoard
        fen={EMPTY_BOARD_FEN}
        onFenChange={onFenChange}
        labels={LABELS}
        editable
      />
    );

    dragPalette(container, 'Q', 12);
    // Browsers fire a synthetic click on the release target right after
    // pointerup for a completed drag — simulate it explicitly.
    fireEvent.click(squareEl(container, 12));

    // Toggling the same piece via a second "click" would have cleared it —
    // assert it's still there, i.e. the trailing click was swallowed.
    expect(onFenChange).toHaveBeenCalledTimes(1);
    expect(lastBoard(onFenChange)[12]).toBe('Q');
  });

  it('does not arm a drag when the board is not editable', () => {
    const onFenChange = vi.fn();
    const { container } = render(
      <EditableChessBoard fen={EMPTY_BOARD_FEN} onFenChange={onFenChange} labels={LABELS} />
    );

    // Read-only mode renders no `data-square` attributes at all (they're
    // only wired when editable), so grab raw grid cells by DOM position.
    const cells = container.querySelectorAll('.grid.grid-cols-8 > div');
    expect(cells.length).toBe(64);

    fireEvent.pointerDown(cells[0]!, { button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(window, { clientX: 200, clientY: 200 });
    fireEvent.pointerUp(cells[10]!, { clientX: 200, clientY: 200 });

    expect(onFenChange).not.toHaveBeenCalled();
  });
});
