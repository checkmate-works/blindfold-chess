import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SelectedTagCard } from './SelectedTagCard';

// Board rendering needs GamePreferencesContext; stub the themed thumbnail so
// the board branch is assertable without a provider.
vi.mock('@/lib/positions/ui/ThemedBoardThumbnail', () => ({
  ThemedBoardThumbnail: ({ fen }: { fen: string }) => <div data-testid="board" data-fen={fen} />,
}));

const baseProps = {
  kind: 'theme' as const,
  label: 'Decoy',
  description: null as string | null,
  badgeText: 'Theme',
  disabled: false,
  openDetailLabel: 'Show details for Decoy',
  removeLabel: 'Remove Decoy',
  onOpen: () => {},
  onRemove: () => {},
};

afterEach(() => cleanup());

describe('SelectedTagCard', () => {
  it('shows the "No Image" placeholder for a board-less tag (previewFen null)', () => {
    render(<SelectedTagCard {...baseProps} previewFen={null} />);

    expect(screen.getByText('No Image')).toBeInTheDocument();
    expect(screen.queryByTestId('board')).not.toBeInTheDocument();
  });

  it('shows the board thumbnail when a previewFen is present', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    render(<SelectedTagCard {...baseProps} previewFen={fen} />);

    expect(screen.getByTestId('board')).toHaveAttribute('data-fen', fen);
    expect(screen.queryByText('No Image')).not.toBeInTheDocument();
  });

  it('renders the description snippet when provided', () => {
    render(
      <SelectedTagCard
        {...baseProps}
        previewFen={null}
        description="Lure a piece to a bad square."
      />
    );

    expect(screen.getByText('Lure a piece to a bad square.')).toBeInTheDocument();
  });
});
