import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AttachedFenCard } from './AttachedFenCard';
import type { AttachedFenCardData } from './AttachedFenCard';

afterEach(() => {
  cleanup();
});

// MiniBoard pulls in chess-pieces / icons / GamePreferencesContext, none of
// which are relevant here. Stub it to a marker div so we can assert the FEN
// is forwarded without exercising the chessboard rendering stack.
vi.mock('@/lib/positions/ui/MiniBoard', () => ({
  MiniBoard: ({ fen }: { fen: string }) => <div data-testid="mini-board" data-fen={fen} />,
}));

const fixture = (overrides: Partial<AttachedFenCardData> = {}): AttachedFenCardData => ({
  id: 'fen-id-1',
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  caption: null,
  ...overrides,
});

describe('AttachedFenCard', () => {
  it('forwards the FEN string to MiniBoard', () => {
    const { getByTestId } = render(<AttachedFenCard attachment={fixture()} />);
    const board = getByTestId('mini-board');
    expect(board.getAttribute('data-fen')).toBe(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    );
  });

  it('renders the caption when present', () => {
    const { container } = render(
      <AttachedFenCard attachment={fixture({ caption: 'Sicilian after 1.e4 c5' })} />
    );
    expect(container.textContent).toContain('Sicilian after 1.e4 c5');
  });

  it('omits caption rendering when null', () => {
    const { container } = render(<AttachedFenCard attachment={fixture({ caption: null })} />);
    // No paragraph other than the FEN-string fallback should appear.
    expect(container.textContent).not.toMatch(/Sicilian/);
  });

  it('always renders the FEN string in the body for transparency', () => {
    const fen = '8/8/8/8/4k3/8/4K3/8 w - - 0 1';
    const { container } = render(<AttachedFenCard attachment={fixture({ fen })} />);
    expect(container.textContent).toContain(fen);
  });
});
