import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Game } from '@/lib/types';

import { GamesPageClient } from './GamesPageClient';

afterEach(() => {
  cleanup();
});

// --- Mocks ---

const mockUseGameList = vi.fn();

vi.mock('../../(home)/_hooks/use-game-list', () => ({
  useGameList: (...args: unknown[]) => mockUseGameList(...args),
}));

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => (key: string) => key,
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/en/games',
}));

vi.mock('@/i18n/routing', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/app/[locale]/_contexts/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock('@/app/[locale]/_components/ConfirmationModal', () => ({
  ConfirmationModal: () => null,
}));

vi.mock('../../(home)/_components/EmptyGameList', () => ({
  EmptyGameList: () => <div data-testid="empty-game-list">No games</div>,
}));

vi.mock('../../(home)/_components/GameList', () => ({
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

vi.mock('../../(home)/_components/GameListSkeleton', () => ({
  GameListSkeleton: ({ rows }: { rows?: number }) => (
    <div data-testid="game-list-skeleton" data-rows={rows}>
      Loading...
    </div>
  ),
}));

vi.mock('./SortButton', () => ({
  SortButton: ({
    onSortChange,
  }: {
    sortBy: string;
    sortDirection: string;
    onSortChange: (value: string) => void;
  }) => (
    <button data-testid="sort-button" onClick={() => onSortChange('created-asc')}>
      Sort
    </button>
  ),
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

describe('GamesPageClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading state', () => {
    it('should show skeleton with 10 rows while loading', () => {
      mockUseGameList.mockReturnValue({ games: [], isLoading: true });

      render(<GamesPageClient locale="en" />);

      const skeleton = screen.getByTestId('game-list-skeleton');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveAttribute('data-rows', '10');
    });

    it('should not show sort button while loading', () => {
      mockUseGameList.mockReturnValue({ games: [], isLoading: true });

      render(<GamesPageClient locale="en" />);

      expect(screen.queryByTestId('sort-button')).toBeNull();
    });
  });

  describe('0 games', () => {
    it('should show empty state when no games exist', () => {
      mockUseGameList.mockReturnValue({ games: [], isLoading: false });

      render(<GamesPageClient locale="en" />);

      expect(screen.getByTestId('empty-game-list')).toBeInTheDocument();
      expect(screen.queryByTestId('sort-button')).toBeNull();
    });
  });

  describe('game display with sort and bulk delete', () => {
    it('should display all games up to 20', () => {
      const games = createMockGames(10);
      mockUseGameList.mockReturnValue({ games, isLoading: false });

      render(<GamesPageClient locale="en" />);

      expect(screen.getAllByRole('listitem')).toHaveLength(10);
    });

    it('should limit display to 20 games maximum', () => {
      const games = createMockGames(25);
      mockUseGameList.mockReturnValue({ games, isLoading: false });

      render(<GamesPageClient locale="en" />);

      expect(screen.getAllByRole('listitem')).toHaveLength(20);
    });

    it('should show sort button when games exist', () => {
      const games = createMockGames(3);
      mockUseGameList.mockReturnValue({ games, isLoading: false });

      render(<GamesPageClient locale="en" />);

      expect(screen.getByTestId('sort-button')).toBeInTheDocument();
    });

    it('should show bulk delete link when games exist', () => {
      const games = createMockGames(3);
      mockUseGameList.mockReturnValue({ games, isLoading: false });

      render(<GamesPageClient locale="en" />);

      const bulkDeleteLink = screen.getByText('bulkDelete');
      expect(bulkDeleteLink).toBeInTheDocument();
      expect(bulkDeleteLink.closest('a')).toHaveAttribute('href', '/games/bulk-delete');
    });
  });

  describe('sort interaction', () => {
    it('should update sort params when sort button is used', () => {
      const games = createMockGames(3);
      mockUseGameList.mockReturnValue({ games, isLoading: false });

      render(<GamesPageClient locale="en" />);

      // Initial call with default sort
      expect(mockUseGameList).toHaveBeenCalledWith('lastPlayed', 'desc');

      // Click sort button (mocked to trigger created-asc)
      fireEvent.click(screen.getByTestId('sort-button'));

      // After sort change, useGameList should be called with new params
      expect(mockUseGameList).toHaveBeenCalledWith('created', 'asc');
    });
  });

  describe('no sort button when empty', () => {
    it('should not show sort button when loading completes with no games', () => {
      mockUseGameList.mockReturnValue({ games: [], isLoading: false });

      render(<GamesPageClient locale="en" />);

      expect(screen.queryByTestId('sort-button')).toBeNull();
      expect(screen.queryByText('bulkDelete')).toBeNull();
    });
  });
});
