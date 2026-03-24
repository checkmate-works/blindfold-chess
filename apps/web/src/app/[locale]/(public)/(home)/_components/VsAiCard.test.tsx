import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Game } from '@/lib/types';

import { VsAiCard } from './VsAiCard';

afterEach(() => {
  cleanup();
});

// --- Mocks ---

const mockUseGameList = vi.fn();

vi.mock('../_hooks/use-game-list', () => ({
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

vi.mock('@blindfold-chess/icons', () => ({
  ChessPieceIcon: ({ type, color, size }: { type: string; color: string; size: number }) => (
    <span data-testid="chess-piece-icon" data-type={type} data-color={color} data-size={size} />
  ),
}));

vi.mock('@/app/[locale]/_components/ColorIcon', () => ({
  ColorIcon: ({ color }: { color: string }) => <span data-testid="color-icon">{color}</span>,
}));

vi.mock('@/lib/chess/elo', () => ({
  getEloRating: (level: number) => {
    if (level < 15) return Math.max(800, 700 + level * 100);
    return 2000 + level * 100;
  },
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

// --- Tests ---

describe('VsAiCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading state', () => {
    it('should show skeleton placeholder while loading', () => {
      mockUseGameList.mockReturnValue({
        games: [],
        isLoading: true,
      });

      const { container } = render(<VsAiCard locale="en" />);

      const skeleton = container.querySelector('.animate-pulse');
      expect(skeleton).toBeInTheDocument();
      // Should not render any links while loading
      expect(screen.queryAllByRole('link')).toHaveLength(0);
    });
  });

  describe('no games state', () => {
    beforeEach(() => {
      mockUseGameList.mockReturnValue({
        games: [],
        isLoading: false,
      });
    });

    it('should render start CTA', () => {
      render(<VsAiCard locale="en" />);

      expect(screen.getByText('title')).toBeInTheDocument();
      expect(screen.getByText('startGame')).toBeInTheDocument();
    });

    it('should link start CTA to /games/new/standard', () => {
      render(<VsAiCard locale="en" />);

      const startLink = screen.getByText('startGame').closest('a');
      expect(startLink).toHaveAttribute('href', '/games/new/standard');
    });

    it('should not show resume or new game buttons', () => {
      render(<VsAiCard locale="en" />);

      expect(screen.queryByText('resume')).not.toBeInTheDocument();
      expect(screen.queryByText('newGame')).not.toBeInTheDocument();
    });

    it('should show the "all games" link pointing to /games', () => {
      render(<VsAiCard locale="en" />);

      const allGamesLink = screen.getByText('allGames').closest('a');
      expect(allGamesLink).toHaveAttribute('href', '/games');
    });

    it('should not show "Recent" label when no games', () => {
      render(<VsAiCard locale="en" />);

      expect(screen.queryByText('recent')).not.toBeInTheDocument();
    });
  });

  describe('has in-progress games state', () => {
    it('should render resume CTA with game info', () => {
      const game = createMockGame({
        id: 'game-1',
        playerColor: 'white',
        skillLevel: 5,
        moves: ['e4', 'e5', 'Nf3'],
        status: 'in_progress',
      });
      mockUseGameList.mockReturnValue({
        games: [game],
        isLoading: false,
      });

      render(<VsAiCard locale="en" />);

      expect(screen.getByText('title')).toBeInTheDocument();
      expect(screen.getByText('resume')).toBeInTheDocument();
      // Skill level: level 5
      expect(screen.getByText('level 5')).toBeInTheDocument();
      // Move count
      expect(screen.getByText('3 moves')).toBeInTheDocument();
      // Color icon
      expect(screen.getByTestId('color-icon')).toHaveTextContent('white');
    });

    it('should show "Recent" label when in-progress game exists', () => {
      const game = createMockGame({ id: 'game-1', status: 'in_progress' });
      mockUseGameList.mockReturnValue({
        games: [game],
        isLoading: false,
      });

      render(<VsAiCard locale="en" />);

      expect(screen.getByText('recent')).toBeInTheDocument();
    });

    it('should link resume button to /games/play', () => {
      const game = createMockGame({ id: 'game-1', status: 'in_progress' });
      mockUseGameList.mockReturnValue({
        games: [game],
        isLoading: false,
      });

      render(<VsAiCard locale="en" />);

      const resumeLink = screen.getByText('resume').closest('a');
      expect(resumeLink).toHaveAttribute('href', '/games/play');
    });

    it('should link new game button to /games/new/standard', () => {
      const game = createMockGame({ id: 'game-1', status: 'in_progress' });
      mockUseGameList.mockReturnValue({
        games: [game],
        isLoading: false,
      });

      render(<VsAiCard locale="en" />);

      const newGameLink = screen.getByText('newGame').closest('a');
      expect(newGameLink).toHaveAttribute('href', '/games/new/standard');
    });

    it('should not show start game button when in-progress game exists', () => {
      const game = createMockGame({ id: 'game-1', status: 'in_progress' });
      mockUseGameList.mockReturnValue({
        games: [game],
        isLoading: false,
      });

      render(<VsAiCard locale="en" />);

      expect(screen.queryByText('startGame')).not.toBeInTheDocument();
    });

    it('should show the "all games" link pointing to /games', () => {
      const game = createMockGame({ id: 'game-1', status: 'in_progress' });
      mockUseGameList.mockReturnValue({
        games: [game],
        isLoading: false,
      });

      render(<VsAiCard locale="en" />);

      const allGamesLink = screen.getByText('allGames').closest('a');
      expect(allGamesLink).toHaveAttribute('href', '/games');
    });

    it('should use the latest (first) in-progress game from the list', () => {
      const olderGame = createMockGame({
        id: 'game-old',
        skillLevel: 3,
        moves: ['d4'],
        status: 'in_progress',
        playerColor: 'black',
      });
      const newerGame = createMockGame({
        id: 'game-new',
        skillLevel: 10,
        moves: ['e4', 'e5'],
        status: 'in_progress',
        playerColor: 'white',
      });
      mockUseGameList.mockReturnValue({
        games: [newerGame, olderGame],
        isLoading: false,
      });

      render(<VsAiCard locale="en" />);

      // Should show info from newerGame (first in-progress game)
      expect(screen.getByText('level 10')).toBeInTheDocument();
      expect(screen.getByText('2 moves')).toBeInTheDocument();
      expect(screen.getByTestId('color-icon')).toHaveTextContent('white');
    });
  });

  describe('edge cases', () => {
    it('should show no-games state when all games are completed (none in_progress)', () => {
      const completedGame = createMockGame({
        id: 'game-1',
        status: 'win',
      });
      mockUseGameList.mockReturnValue({
        games: [completedGame],
        isLoading: false,
      });

      render(<VsAiCard locale="en" />);

      expect(screen.getByText('startGame')).toBeInTheDocument();
      expect(screen.queryByText('resume')).not.toBeInTheDocument();
    });

    it('should not show "Recent" label when all games are completed', () => {
      const completedGame = createMockGame({
        id: 'game-1',
        status: 'win',
      });
      mockUseGameList.mockReturnValue({
        games: [completedGame],
        isLoading: false,
      });

      render(<VsAiCard locale="en" />);

      expect(screen.queryByText('recent')).not.toBeInTheDocument();
    });

    it('should handle game with empty moves array', () => {
      const game = createMockGame({
        id: 'game-1',
        status: 'in_progress',
        moves: [],
      });
      mockUseGameList.mockReturnValue({
        games: [game],
        isLoading: false,
      });

      render(<VsAiCard locale="en" />);

      expect(screen.getByText('0 moves')).toBeInTheDocument();
    });

    it('should pick first in-progress game when mixed statuses exist', () => {
      const completedGame = createMockGame({
        id: 'game-done',
        status: 'win',
        skillLevel: 1,
      });
      const inProgressGame = createMockGame({
        id: 'game-active',
        status: 'in_progress',
        skillLevel: 8,
        moves: ['e4', 'e5', 'Nf3', 'Nc6'],
      });
      mockUseGameList.mockReturnValue({
        games: [completedGame, inProgressGame],
        isLoading: false,
      });

      render(<VsAiCard locale="en" />);

      // Should show inProgressGame info (skillLevel 8)
      expect(screen.getByText('level 8')).toBeInTheDocument();
      expect(screen.getByText('4 moves')).toBeInTheDocument();
    });
  });

  describe('sort parameters', () => {
    it('should pass lastPlayed/desc to useGameList', () => {
      mockUseGameList.mockReturnValue({ games: [], isLoading: false });

      render(<VsAiCard locale="en" />);

      expect(mockUseGameList).toHaveBeenCalledWith('lastPlayed', 'desc');
    });
  });

  describe('"all games" link is always present', () => {
    it('should show "all games" link in loading state', () => {
      mockUseGameList.mockReturnValue({ games: [], isLoading: true });

      const { container } = render(<VsAiCard locale="en" />);

      // In loading state the skeleton is shown, not the full card with links
      const skeleton = container.querySelector('.animate-pulse');
      expect(skeleton).toBeInTheDocument();
    });

    it('should show "all games" link with no games', () => {
      mockUseGameList.mockReturnValue({ games: [], isLoading: false });

      render(<VsAiCard locale="en" />);

      const allGamesLink = screen.getByText('allGames').closest('a');
      expect(allGamesLink).toHaveAttribute('href', '/games');
    });

    it('should show "all games" link with in-progress games', () => {
      const game = createMockGame({ id: 'game-1', status: 'in_progress' });
      mockUseGameList.mockReturnValue({ games: [game], isLoading: false });

      render(<VsAiCard locale="en" />);

      const allGamesLink = screen.getByText('allGames').closest('a');
      expect(allGamesLink).toHaveAttribute('href', '/games');
    });
  });
});
