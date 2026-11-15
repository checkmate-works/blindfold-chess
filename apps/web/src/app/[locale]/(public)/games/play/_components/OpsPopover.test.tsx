// @vitest-environment jsdom
/**
 * The popover is rendered into `document.body`, outside the scrolling move
 * list, so the list cannot clip it; since it is placed in viewport
 * coordinates, a scroll anywhere closes it rather than leaving it adrift.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { OpsPopover } from './OpsPopover';

const LABELS = { peek: 'peek', undo: 'undo', hints: 'hints', invalid: 'invalid' };
const LOG = {
  inputMethod: 'text' as const,
  peekCount: 2,
  undoCount: 0,
  movePeekCount: 0,
  invalidCount: 0,
};

function renderInScrollingList(onClose = vi.fn()) {
  render(
    <div data-testid="list" style={{ overflowY: 'auto', maxHeight: 40 }}>
      <span data-testid="cell">
        <OpsPopover log={LOG} labels={LABELS} onClose={onClose} />
      </span>
    </div>
  );
  return onClose;
}

describe('OpsPopover', () => {
  it('renders outside the list it is opened from', () => {
    renderInScrollingList();

    const popover = screen.getByRole('dialog');
    expect(popover.parentElement).toBe(document.body);
    expect(screen.getByTestId('list').contains(popover)).toBe(false);
    expect(popover.textContent).toContain('peek');
  });

  it('closes when the list scrolls', () => {
    const onClose = renderInScrollingList();
    fireEvent.scroll(screen.getByTestId('list'));
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on Escape', async () => {
    const onClose = renderInScrollingList();
    // The key listener is attached one tick after opening.
    await new Promise((resolve) => setTimeout(resolve, 0));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
