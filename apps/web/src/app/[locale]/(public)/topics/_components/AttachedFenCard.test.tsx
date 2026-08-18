import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AttachedFenCard } from './AttachedFenCard';
import type { AttachedFenCardData } from './AttachedFenCard';

// `BoardReviewModal` (rendered by the card) reads its labels through
// next-intl, which needs a provider this test has no use for. Echo the key.
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// MiniBoard pulls in chess-pieces / icons / GamePreferencesContext, none of
// which are relevant here. Stub it to a marker div so we can assert the FEN
// is forwarded without exercising the chessboard rendering stack.
vi.mock('@/lib/positions/ui/MiniBoard', () => ({
  MiniBoard: ({ fen }: { fen: string }) => <div data-testid="mini-board" data-fen={fen} />,
}));

// `BoardReviewModal` resolves the viewer's board-display preferences (coordinates,
// last-move highlight) through this hook. The card's markup is what's under test,
// so hand it a fixed answer rather than standing up a preferences provider.
vi.mock('@/app/[locale]/_hooks/use-board-display', () => ({
  useBoardDisplay: () => ({ showCoordinates: true, boardTheme: 'monotone', lastMove: null }),
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

  // ─── Renderer pins ────────────────────────────────────────────────────

  it('renders empty caption gracefully when caption is an empty string', () => {
    // The component branches on `attachment.caption &&`, so an empty
    // string is also falsy and must not produce an empty <p>. Pin the
    // contract: only the card-title and FEN-string fallback paragraphs
    // are present; the BoardReviewModal stays mounted but `isOpen=false`
    // so it returns null and contributes no paragraphs.
    const { container } = render(<AttachedFenCard attachment={fixture({ caption: '' })} />);
    const ps = container.querySelectorAll('p');
    // 1: card title + 1: FEN font-mono fallback = exactly 2 paragraphs.
    // (No caption paragraph for falsy caption.)
    expect(ps.length).toBe(2);
  });

  it('wraps the thumbnail in a button so tapping it opens the enlarge modal', () => {
    const { container } = render(<AttachedFenCard attachment={fixture()} />);
    const board = container.querySelector('[data-testid="mini-board"]');
    expect(board).not.toBeNull();
    const thumbnailButton = board?.closest('button');
    expect(thumbnailButton).not.toBeNull();
    expect(thumbnailButton?.getAttribute('aria-label')).toMatch(/enlarge|position/i);
  });

  it('opens the BoardReviewModal when the thumbnail is clicked', () => {
    const { container } = render(<AttachedFenCard attachment={fixture()} />);
    // No dialog before the click.
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    const thumbnailButton = container
      .querySelector('[data-testid="mini-board"]')
      ?.closest('button') as HTMLButtonElement;
    fireEvent.click(thumbnailButton);
    // Click renders the modal (BoardReviewModal renders an aria-modal
    // dialog). Two boards now exist: the card thumbnail and the modal
    // body. Both share the FEN since FEN cards display a single position.
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(document.querySelectorAll('[data-testid="mini-board"]').length).toBe(2);
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
    expect(container.textContent).toContain('attachment.card.positionLabel');
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
