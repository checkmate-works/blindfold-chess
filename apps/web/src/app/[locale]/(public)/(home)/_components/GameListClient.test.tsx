import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createMockGames } from '@/lib/games/__test-support__/game-fixture';
import type { Game } from '@/lib/games/saved-game-types';

import { GameListClient } from './GameListClient';

// --- Mocks ---

const mockUseGameList = vi.fn();

vi.mock('../_hooks/use-game-list', () => ({
  useGameList: (...args: unknown[]) => mockUseGameList(...args),
}));

vi.mock('@/i18n/use-safe-translations');

vi.mock('@/i18n/routing');

vi.mock('@/app/[locale]/_contexts/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock('@/app/[locale]/_components/ConfirmationModal', () => ({
  ConfirmationModal: () => null,
}));

vi.mock('./EmptyGameList', () => ({
  EmptyGameList: () => <div data-testid="empty-game-list">No games</div>,
}));

vi.mock('./GameList', () => ({
  GameList: ({ games }: { games: Game[] }) => (
    <ul data-testid="game-list">
      {games.map((game) => (
        <li key={game.id} data-testid={`game-${game.id}`}>
          {game.id}
        </li>
      ))}
    </ul>
  ),
}));

vi.mock('./GameListSkeleton', () => ({
  GameListSkeleton: () => <div data-testid="game-list-skeleton">Loading...</div>,
}));

// --- Helpers ---

// --- Tests ---

describe('GameListClient', () => {
  describe('loading state', () => {
    it('should show skeleton while loading', () => {
      mockUseGameList.mockReturnValue({
        games: [],
        isLoading: true,
      });

      render(<GameListClient locale="en" />);

      expect(screen.getByTestId('game-list-skeleton')).toBeInTheDocument();
      expect(screen.queryByTestId('game-list')).toBeNull();
      expect(screen.queryByTestId('empty-game-list')).toBeNull();
    });
  });

  describe('0 games', () => {
    it('should show empty state when no games exist', () => {
      mockUseGameList.mockReturnValue({
        games: [],
        isLoading: false,
      });

      render(<GameListClient locale="en" />);

      expect(screen.getByTestId('empty-game-list')).toBeInTheDocument();
      expect(screen.queryByTestId('game-list')).toBeNull();
    });

    it('should not show the "more games" link', () => {
      mockUseGameList.mockReturnValue({
        games: [],
        isLoading: false,
      });

      render(<GameListClient locale="en" />);

      expect(screen.queryByText('moreGames')).toBeNull();
    });
  });

  describe('5 or fewer games (no "more games" link)', () => {
    it('should display all games when there is 1 game', () => {
      const games = createMockGames(1);
      mockUseGameList.mockReturnValue({ games, isLoading: false });

      render(<GameListClient locale="en" />);

      expect(screen.getAllByRole('listitem')).toHaveLength(1);
      expect(screen.queryByText('moreGames')).toBeNull();
    });

    it('should display all games when there are exactly 5', () => {
      const games = createMockGames(5);
      mockUseGameList.mockReturnValue({ games, isLoading: false });

      render(<GameListClient locale="en" />);

      expect(screen.getAllByRole('listitem')).toHaveLength(5);
      expect(screen.queryByText('moreGames')).toBeNull();
    });
  });

  describe('more than 5 games (shows "more games" link)', () => {
    it('should display only 5 games when there are 6', () => {
      const games = createMockGames(6);
      mockUseGameList.mockReturnValue({ games, isLoading: false });

      render(<GameListClient locale="en" />);

      const listItems = screen.getAllByRole('listitem');
      expect(listItems).toHaveLength(5);
    });

    it('should show the "more games" link pointing to /games when there are 6 games', () => {
      const games = createMockGames(6);
      mockUseGameList.mockReturnValue({ games, isLoading: false });

      render(<GameListClient locale="en" />);

      const moreLink = screen.getByText('moreGames');
      expect(moreLink).toBeInTheDocument();
      expect(moreLink.closest('a')).toHaveAttribute('href', '/games');
    });

    it('should display only 5 games when there are 10', () => {
      const games = createMockGames(10);
      mockUseGameList.mockReturnValue({ games, isLoading: false });

      render(<GameListClient locale="en" />);

      expect(screen.getAllByRole('listitem')).toHaveLength(5);
      expect(screen.getByText('moreGames')).toBeInTheDocument();
    });

    it('should display only 5 games when there are 20 (max)', () => {
      const games = createMockGames(20);
      mockUseGameList.mockReturnValue({ games, isLoading: false });

      render(<GameListClient locale="en" />);

      expect(screen.getAllByRole('listitem')).toHaveLength(5);
      expect(screen.getByText('moreGames')).toBeInTheDocument();
    });
  });

  describe('sort parameters', () => {
    it('should pass lastPlayed/desc to useGameList (default for home page)', () => {
      mockUseGameList.mockReturnValue({ games: [], isLoading: false });

      render(<GameListClient locale="en" />);

      expect(mockUseGameList).toHaveBeenCalledWith('lastPlayed', 'desc');
    });
  });
});
