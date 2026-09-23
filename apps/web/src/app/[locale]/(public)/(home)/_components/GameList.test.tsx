import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { NativeAdView } from '@/lib/ads/ad';
import { createMockGames } from '@/lib/games/__test-support__/game-fixture';

import { GameList } from './GameList';

vi.mock('./GameListItem', () => ({
  GameListItem: ({ game }: { game: { id: string } }) => <li data-testid="game-row">{game.id}</li>,
}));

vi.mock('@/app/[locale]/_components/NativeAdCard', () => ({
  NativeAdCard: ({
    creative,
    as: Wrapper = 'div',
  }: {
    creative: NativeAdView;
    as?: 'div' | 'li';
  }) => <Wrapper data-testid="ad-row">{creative.title}</Wrapper>,
}));

const creative = { title: 'Master games' } as NativeAdView;

describe('GameList', () => {
  it('interleaves ad rows as list items of the same <ul>', () => {
    render(
      <GameList
        games={createMockGames(6)}
        locale="en"
        onDeleteGame={vi.fn()}
        nativeAdCreatives={[creative]}
      />
    );

    const rows = screen.getByRole('list').children;
    expect(rows).toHaveLength(8);
    expect(rows[0]).toHaveAttribute('data-testid', 'ad-row');
    expect(rows[0].tagName).toBe('LI');
    expect(rows[6]).toHaveAttribute('data-testid', 'ad-row');
  });

  it('renders only the games when the pool is empty', () => {
    render(<GameList games={createMockGames(6)} locale="en" onDeleteGame={vi.fn()} />);

    expect(screen.queryByTestId('ad-row')).toBeNull();
    expect(screen.getAllByTestId('game-row')).toHaveLength(6);
  });
});
