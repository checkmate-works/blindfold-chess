import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NEXT_PUZZLE_COUNT } from '@/lib/positions/next-puzzles';

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

// The real thumb renderer needs GamePreferencesContext and next-intl too.
vi.mock('@/app/[locale]/_components/NativeAdThumb', () => ({
  NativeAdThumb: ({ creative }: { creative: { id: string; href: string; title: string } }) => (
    <a data-testid="ad-thumb" href={creative.href}>
      {creative.title}
    </a>
  ),
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

  describe('native ad thumb', () => {
    const creative = {
      id: 'ad1',
      href: 'https://example.test/book',
      title: 'A book about calculation',
      thumbnail: { fen: WHITE_TO_MOVE },
    };
    const puzzles = Array.from({ length: NEXT_PUZZLE_COUNT }, (_, i) => ({
      id: `p${i}`,
      fen: WHITE_TO_MOVE,
      title: `Puzzle ${i}`,
    }));

    it('takes the first cell and keeps the grid at NEXT_PUZZLE_COUNT cells', () => {
      // A fifth cell would sit alone on a second row at both breakpoints and
      // push the result screen's action buttons down, so the last puzzle is
      // what gives way — not the grid's width.
      const { container } = render(
        <NextPuzzlesSection
          puzzles={puzzles}
          locale="en"
          labels={labels}
          nativeAdCreatives={[creative]}
        />
      );

      const cells = Array.from(container.querySelectorAll('li'));
      expect(cells).toHaveLength(NEXT_PUZZLE_COUNT);
      expect(cells[0].querySelector('[data-testid="ad-thumb"]')).not.toBeNull();
      expect(screen.queryByText(`Puzzle ${NEXT_PUZZLE_COUNT - 1}`)).not.toBeInTheDocument();
    });

    it('shows every puzzle when the pool is empty', () => {
      // How an ad-free reader and an unfilled slot both arrive.
      const { container } = render(
        <NextPuzzlesSection puzzles={puzzles} locale="en" labels={labels} nativeAdCreatives={[]} />
      );

      expect(container.querySelectorAll('li')).toHaveLength(NEXT_PUZZLE_COUNT);
      expect(screen.queryByTestId('ad-thumb')).not.toBeInTheDocument();
      expect(screen.getByText(`Puzzle ${NEXT_PUZZLE_COUNT - 1}`)).toBeInTheDocument();
    });

    it('stays hidden on a section that has no puzzles to offer', () => {
      // An ad alone is not a "next puzzles" section.
      const { container } = render(
        <NextPuzzlesSection
          puzzles={[]}
          locale="en"
          labels={labels}
          nativeAdCreatives={[creative]}
        />
      );

      expect(container).toBeEmptyDOMElement();
    });
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
