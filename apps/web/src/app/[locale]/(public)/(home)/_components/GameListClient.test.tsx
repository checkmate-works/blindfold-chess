import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Game } from '@/lib/types';

import { GameListClient } from './GameListClient';

afterEach(() => {
  cleanup();
});

// --- Mocks ---

const mockUseGameList = vi.fn();

vi.mock('../_hooks/useGameList', () => ({
  useGameList: (...args: unknown[]) => mockUseGameList(...args),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/i18n/routing', () => ({
  Link: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    locale?: string;
    className?: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

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

function createMockGame(overrides: Partial<Game> & { id: string }): Game {
  return {
    date: new Date('2024-01-01').toISOString(),
    lastPlayed: new Date('2024-01-02').toISOString(),
    moves: [],
    playerColor: 'white',
    skillLevel: 1,
    status: 'in_progress',
    ...overrides,
  };
}

function createMockGames(count: number): Game[] {
  return Array.from({ length: count }, (_, i) => createMockGame({ id: `game-${i + 1}` }));
}

// --- Tests ---

describe('GameListClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
