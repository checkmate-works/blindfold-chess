import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ChunkOption } from '@/lib/chunks/types';
import type { ThemeOption } from '@/lib/themes/types';

import { PreviewTags } from './PreviewTags';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// The card is a static (non-link) div in the preview, but RelatedTags still
// imports Link at module scope — stub the routing module so the import resolves.
vi.mock('@/i18n/routing', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

// Board rendering needs GamePreferencesContext; stub the thumbnail so the
// board-ful branch is assertable without a provider.
vi.mock('@/lib/positions/ui/ThemedBoardThumbnail', () => ({
  ThemedBoardThumbnail: ({ fen }: { fen: string }) => <div data-testid="board" data-fen={fen} />,
}));

const VALID_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('PreviewTags', () => {
  it('renders nothing when no tags are attached', () => {
    const { container } = render(
      <PreviewTags themes={[] as ThemeOption[]} chunks={[] as ChunkOption[]} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows "No Image" for a board-less theme and a board for a board-ful one', () => {
    const themes = [
      { id: 't-abstract', label: 'Pin', previewFen: null, definition: null },
      { id: 't-concrete', label: 'Fork', previewFen: VALID_FEN, definition: null },
    ] as unknown as ThemeOption[];

    render(<PreviewTags themes={themes} chunks={[] as ChunkOption[]} />);

    // The abstract (positionless) theme falls back to the No Image placeholder.
    expect(screen.getByText('No Image')).toBeInTheDocument();
    // The concrete theme renders its board thumbnail instead.
    expect(screen.getByTestId('board')).toHaveAttribute('data-fen', VALID_FEN);
    // Both labels still render regardless of the thumbnail branch.
    expect(screen.getByText('Pin')).toBeInTheDocument();
    expect(screen.getByText('Fork')).toBeInTheDocument();
  });

  it('renders a chunk card with its representative board (chunks always have a FEN)', () => {
    const chunks = [
      { id: 'c1', label: 'Greek gift', representativeFen: VALID_FEN, description: null },
    ] as unknown as ChunkOption[];

    render(<PreviewTags themes={[] as ThemeOption[]} chunks={chunks} />);

    expect(screen.getByTestId('board')).toHaveAttribute('data-fen', VALID_FEN);
    expect(screen.getByText('Greek gift')).toBeInTheDocument();
    expect(screen.queryByText('No Image')).not.toBeInTheDocument();
  });
});
