// @vitest-environment jsdom
/**
 * A scrolling move list keeps the shown move in view: the latest move at the
 * latest position, the top at the start, and the highlighted move otherwise —
 * scrolling only the list, never the page. jsdom has no layout, so the list's
 * scroll metrics and the rows' boxes are stubbed.
 */
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { VerticalMoveList } from './VerticalMoveList';

const PGN = Array.from({ length: 20 }, (_, i) => ({
  moveNumber: i + 1,
  whiteMove: 'Nf3',
  whiteMoveIndex: i * 2,
  blackMove: 'Nf6',
  blackMoveIndex: i * 2 + 1,
}));

/** Stub a 100px-tall list over 400px of content, showing content [scrollTop, scrollTop + 100). */
function stubScrollingList(list: HTMLElement) {
  Object.defineProperty(list, 'scrollHeight', { configurable: true, value: 400 });
  Object.defineProperty(list, 'clientHeight', { configurable: true, value: 100 });
  vi.spyOn(list, 'getBoundingClientRect').mockReturnValue({ top: 0, bottom: 100 } as DOMRect);
}

function renderList(currentPosition: number, scrollTop = 0) {
  const props = { formattedPgn: PGN, onNavigateToPosition: vi.fn(), className: 'scroll' };
  // Mounted at another position first (jsdom has no layout then, so the
  // effect is a no-op), so the rerender below is a cursor change.
  const view = render(
    <VerticalMoveList {...props} currentPosition={currentPosition === 7 ? 9 : 7} />
  );
  const list = view.container.firstElementChild as HTMLElement;
  stubScrollingList(list);
  list.scrollTop = scrollTop;
  // Each row is 20px tall: move i's row sits at [20i, 20i + 20) in content.
  list.querySelectorAll('button').forEach((button, i) => {
    const row = Math.floor(i / 2) * 20 - list.scrollTop;
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
      top: row,
      bottom: row + 20,
    } as DOMRect);
  });
  view.rerender(<VerticalMoveList {...props} currentPosition={currentPosition} />);
  return list;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('VerticalMoveList scrolling', () => {
  it('scrolls to the last move at the latest position', () => {
    expect(renderList(-1).scrollTop).toBe(400);
  });

  it('scrolls to the top at the start', () => {
    expect(renderList(-2, 150).scrollTop).toBe(0);
  });

  it('scrolls a highlighted move below the fold up into view', () => {
    // Move index 20 is White's 11th move: row 10, content [200, 220).
    expect(renderList(20, 0).scrollTop).toBe(120);
  });

  it('scrolls a highlighted move above the fold down into view', () => {
    // Move index 2 is White's 2nd move: row 1, content [20, 40).
    expect(renderList(2, 200).scrollTop).toBe(20);
  });

  it('leaves the list alone when the highlighted move is already visible', () => {
    // Row 3, content [60, 80), inside [0, 100).
    expect(renderList(6, 0).scrollTop).toBe(0);
  });
});
