import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ThemeOption } from '@/lib/themes/types';

import { RelatedTags } from './RelatedTags';

vi.mock('@/i18n/routing');

// Board rendering needs GamePreferencesContext; stub the themed thumbnail so
// the board branch is assertable without a provider.
vi.mock('@/lib/positions/ui/ThemedBoardThumbnail', () => ({
  ThemedBoardThumbnail: ({ fen }: { fen: string }) => <div data-testid="board" data-fen={fen} />,
}));

const VALID_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const labels = {
  sectionTitle: (count: number) => `Related (${count})`,
  badgeTheme: 'Theme',
  badgeChunk: 'Chunk',
};

describe('RelatedTags', () => {
  it('renders nothing when there are no themes or chunks', () => {
    const { container } = render(
      <RelatedTags themes={[]} chunks={[]} locale="en" labels={labels} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the "No Image" placeholder for a board-less theme on detail pages', () => {
    // Regression guard: abstract themes (attraction, clearance, ...) have no
    // example position. The detail-page card must show the shared "No Image"
    // placeholder — not a blank box — matching every other tag surface.
    const themes = [
      {
        id: 't-abstract',
        slug: 'attraction',
        label: 'Attraction',
        previewFen: null,
        definition: null,
      },
    ] as unknown as ThemeOption[];

    render(<RelatedTags themes={themes} chunks={[]} locale="en" labels={labels} />);

    expect(screen.getByText('No Image')).toBeInTheDocument();
    expect(screen.queryByTestId('board')).not.toBeInTheDocument();
  });

  it('shows the board thumbnail for a theme with a preview position', () => {
    const themes = [
      { id: 't-concrete', slug: 'fork', label: 'Fork', previewFen: VALID_FEN, definition: null },
    ] as unknown as ThemeOption[];

    render(<RelatedTags themes={themes} chunks={[]} locale="en" labels={labels} />);

    expect(screen.getByTestId('board')).toHaveAttribute('data-fen', VALID_FEN);
    expect(screen.queryByText('No Image')).not.toBeInTheDocument();
  });

  it('renders a chunk card with its representative board', () => {
    const chunks = [
      {
        id: 'c1',
        slug: 'greek-gift',
        title: 'Greek gift',
        description: 'Classic bishop sacrifice on h7.',
        representativeFen: VALID_FEN,
      },
    ];

    render(<RelatedTags themes={[]} chunks={chunks} locale="en" labels={labels} />);

    expect(screen.getByTestId('board')).toHaveAttribute('data-fen', VALID_FEN);
    expect(screen.getByText('Greek gift')).toBeInTheDocument();
    expect(screen.getByText('Classic bishop sacrifice on h7.')).toBeInTheDocument();
  });
});
