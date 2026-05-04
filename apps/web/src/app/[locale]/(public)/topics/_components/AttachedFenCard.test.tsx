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

  // ─── Renderer pins (Tester Phase 1) ────────────────────────────────────

  it('renders empty caption gracefully when caption is an empty string', () => {
    // The component branches on `attachment.caption &&`, so an empty
    // string is also falsy and must not produce an empty <p>. Pin the
    // contract: only the FEN-string fallback paragraph is present.
    const { container } = render(<AttachedFenCard attachment={fixture({ caption: '' })} />);
    const ps = container.querySelectorAll('p');
    // 1: card title + 1: FEN font-mono fallback = exactly 2 paragraphs.
    // (No caption paragraph for falsy caption.)
    expect(ps.length).toBe(2);
  });

  it('renders caption text as a React text child (XSS-relevant chars are escaped)', () => {
    const { container } = render(
      <AttachedFenCard attachment={fixture({ caption: '<img src=x onerror=alert(1)>' })} />
    );
    // The caption text is forwarded verbatim as text but no <img> tag
    // should appear in the DOM other than the chess preview's. (We
    // mocked MiniBoard, so no real <img> exists.)
    expect(container.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(container.querySelector('img')).toBeNull();
  });

  it('passes the canonical FEN unchanged to MiniBoard (including atypical positions)', () => {
    // The renderer must not mutate the FEN — `MiniBoard` validates &
    // renders. Pin a non-starting position to catch any accidental
    // canonicalization in the renderer.
    const fen = 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 5 12';
    const { getByTestId } = render(<AttachedFenCard attachment={fixture({ fen })} />);
    expect(getByTestId('mini-board').getAttribute('data-fen')).toBe(fen);
  });

  it('renders the card title even when caption is missing', () => {
    const { container } = render(<AttachedFenCard attachment={fixture({ caption: null })} />);
    expect(container.textContent).toContain('Attached position');
  });

  it('renders both caption and FEN string when caption is present (independent paragraphs)', () => {
    const { container } = render(
      <AttachedFenCard attachment={fixture({ caption: 'Italian opening' })} />
    );
    expect(container.textContent).toContain('Italian opening');
    expect(container.textContent).toContain(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    );
  });
});
