import { fireEvent, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BoardAnnotationEditor } from './BoardAnnotationEditor';
import { type BoardAnnotations, EMPTY_BOARD_ANNOTATIONS } from './types';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/**
 * jsdom does not lay out elements, so `getBoundingClientRect()` returns a
 * zero-sized rect by default and `pointerToSquare` rightfully bails out.
 * We stub it on the interactive container's parent so the test can issue
 * pointer events at known coordinates.
 */
function stubBoardRect(container: HTMLElement) {
  // The interactive div is the first child with `role` set by us — easier to
  // grab it via the rendered tree. It's a `<div class="relative select-none touch-none">`.
  const board = container.querySelector('.select-none') as HTMLElement;
  vi.spyOn(board, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    right: 800,
    bottom: 800,
    width: 800,
    height: 800,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  return board;
}

describe('BoardAnnotationEditor', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('emits an arrow on right-click drag (no modifiers → green)', () => {
    const onChange = vi.fn<(next: BoardAnnotations) => void>();
    const { container } = render(
      <BoardAnnotationEditor fen={START_FEN} value={EMPTY_BOARD_ANNOTATIONS} onChange={onChange} />
    );
    const board = stubBoardRect(container);

    // e2 (file 4, rank 2): col=4, row=6 → x=450, y=650 within 800×800
    // e4 (file 4, rank 4): col=4, row=4 → x=450, y=450
    fireEvent.pointerDown(board, { button: 2, clientX: 450, clientY: 650 });
    fireEvent.pointerUp(board, { button: 2, clientX: 450, clientY: 450 });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({
      arrows: [{ from: 'e2', to: 'e4', color: 'green' }],
      circles: [],
    });
  });

  it('emits a circle when down and up land on the same square', () => {
    const onChange = vi.fn<(next: BoardAnnotations) => void>();
    const { container } = render(
      <BoardAnnotationEditor fen={START_FEN} value={EMPTY_BOARD_ANNOTATIONS} onChange={onChange} />
    );
    const board = stubBoardRect(container);

    // d5 → col=3, row=3 → x=350, y=350
    fireEvent.pointerDown(board, { button: 2, clientX: 350, clientY: 350 });
    fireEvent.pointerUp(board, { button: 2, clientX: 351, clientY: 351 });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({
      arrows: [],
      circles: [{ square: 'd5', color: 'green' }],
    });
  });

  it('uses modifier keys to pick a non-default color', () => {
    const onChange = vi.fn<(next: BoardAnnotations) => void>();
    const { container } = render(
      <BoardAnnotationEditor fen={START_FEN} value={EMPTY_BOARD_ANNOTATIONS} onChange={onChange} />
    );
    const board = stubBoardRect(container);

    fireEvent.pointerDown(board, { button: 2, clientX: 350, clientY: 350 });
    fireEvent.pointerUp(board, { button: 2, clientX: 350, clientY: 350, shiftKey: true });

    expect(onChange).toHaveBeenCalledWith({
      arrows: [],
      circles: [{ square: 'd5', color: 'red' }],
    });
  });

  it('ignores left-button events', () => {
    const onChange = vi.fn<(next: BoardAnnotations) => void>();
    const { container } = render(
      <BoardAnnotationEditor fen={START_FEN} value={EMPTY_BOARD_ANNOTATIONS} onChange={onChange} />
    );
    const board = stubBoardRect(container);

    fireEvent.pointerDown(board, { button: 0, clientX: 350, clientY: 350 });
    fireEvent.pointerUp(board, { button: 0, clientX: 350, clientY: 350 });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('clears all when the button is pressed', () => {
    const onChange = vi.fn<(next: BoardAnnotations) => void>();
    const start: BoardAnnotations = {
      arrows: [{ from: 'e2', to: 'e4', color: 'green' }],
      circles: [{ square: 'd5', color: 'red' }],
    };
    const { getByText } = render(
      <BoardAnnotationEditor fen={START_FEN} value={start} onChange={onChange} />
    );

    fireEvent.click(getByText('Clear all'));
    expect(onChange).toHaveBeenCalledWith(EMPTY_BOARD_ANNOTATIONS);
  });

  it('disables the clear button when there is nothing to clear', () => {
    const { getByText } = render(
      <BoardAnnotationEditor fen={START_FEN} value={EMPTY_BOARD_ANNOTATIONS} onChange={vi.fn()} />
    );
    expect((getByText('Clear all') as HTMLButtonElement).disabled).toBe(true);
  });

  it('does nothing when disabled', () => {
    const onChange = vi.fn<(next: BoardAnnotations) => void>();
    const { container } = render(
      <BoardAnnotationEditor
        fen={START_FEN}
        value={EMPTY_BOARD_ANNOTATIONS}
        onChange={onChange}
        disabled
      />
    );
    const board = stubBoardRect(container);

    fireEvent.pointerDown(board, { button: 2, clientX: 350, clientY: 350 });
    fireEvent.pointerUp(board, { button: 2, clientX: 350, clientY: 350 });
    expect(onChange).not.toHaveBeenCalled();
  });
});
