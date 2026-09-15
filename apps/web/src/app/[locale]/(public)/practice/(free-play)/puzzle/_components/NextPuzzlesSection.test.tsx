import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NextPuzzlesSection } from './NextPuzzlesSection';

vi.mock('@/i18n/routing');

// Surface `prefetch` as a DOM attribute so the deferred-prefetch strategy the
// tiles rely on is assertable.
vi.mock('next/link', () => ({
  default: ({
    href,
    prefetch,
    children,
    ...props
  }: {
    href: string;
    prefetch?: boolean | null;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} data-prefetch={String(prefetch)} {...props}>
      {children}
    </a>
  ),
}));

// Board rendering needs GamePreferencesContext; stub the themed thumbnail.
vi.mock('@/lib/positions/ui/ThemedBoardThumbnail', () => ({
  ThemedBoardThumbnail: ({ fen }: { fen: string }) => <div data-testid="board" data-fen={fen} />,
}));

const WHITE_TO_MOVE = '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1';
const BLACK_TO_MOVE = '3r2k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1';

const labels = {
  sectionTitle: 'Next puzzles',
  whiteToMove: 'White to move',
  blackToMove: 'Black to move',
};

describe('NextPuzzlesSection', () => {
  it('renders nothing when there are no candidates', () => {
    const { container } = render(<NextPuzzlesSection puzzles={[]} locale="en" labels={labels} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('links each tile to the puzzle detail page with prefetch deferred', () => {
    render(
      <NextPuzzlesSection
        puzzles={[
          { id: 'p1', fen: WHITE_TO_MOVE, title: 'Back rank' },
          { id: 'p2', fen: BLACK_TO_MOVE, title: 'Rook lift' },
        ]}
        locale="ja"
        labels={labels}
      />
    );

    const tiles = screen.getAllByRole('link');
    expect(tiles.map((a) => a.getAttribute('href'))).toEqual([
      '/ja/practice/puzzle/p1',
      '/ja/practice/puzzle/p2',
    ]);
    for (const tile of tiles) {
      expect(tile).toHaveAttribute('data-prefetch', 'false');
    }
    expect(screen.getAllByTestId('board').map((b) => b.dataset.fen)).toEqual([
      WHITE_TO_MOVE,
      BLACK_TO_MOVE,
    ]);
  });

  it('labels the side-to-move dot from the FEN', () => {
    render(
      <NextPuzzlesSection
        puzzles={[
          { id: 'p1', fen: WHITE_TO_MOVE, title: 'Back rank' },
          { id: 'p2', fen: BLACK_TO_MOVE, title: 'Rook lift' },
        ]}
        locale="en"
        labels={labels}
      />
    );

    expect(screen.getByRole('img', { name: 'White to move' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Black to move' })).toBeInTheDocument();
  });

  it('renders the same-author link as the header action when given', () => {
    render(
      <NextPuzzlesSection
        puzzles={[{ id: 'p1', fen: WHITE_TO_MOVE, title: 'Back rank' }]}
        locale="en"
        labels={labels}
        authorLink={{ href: '/u/alice/problems/puzzles', label: 'More by this author' }}
      />
    );

    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent('Next puzzles');
    expect(screen.getByRole('link', { name: 'More by this author' })).toBeInTheDocument();
  });
});
