import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Game } from '@/lib/games/saved-game-types';

import { GamesPageClient } from './GamesPageClient';

// --- Mocks ---

const mockUseGameList = vi.fn();

vi.mock('../../(home)/_hooks/use-game-list', () => ({
  useGameList: (...args: unknown[]) => mockUseGameList(...args),
}));

// Default: signed out — the publish nudge stays hidden and every pre-existing
// assertion is unaffected. Individual tests flip this to exercise the nudge.
const authState = vi.hoisted(() => ({
  user: null as { id: string } | null,
  hasProfile: false,
  isLoading: false,
}));
vi.mock('@/app/[locale]/_contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

// Default: the user has not earned the rank the game satisfies, so the
// server echoes the qualification back. Tests override to simulate an
// already-promoted user (null) or the dan-holder fallback ('1kyu').
const mockGetPublishPromotionTarget = vi.fn();
vi.mock('@/app/[locale]/(public)/dojo/ranks/_actions/getPublishPromotionTarget', () => ({
  getPublishPromotionTarget: (...args: unknown[]) => mockGetPublishPromotionTarget(...args),
}));

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => {
    // Mirror the subset of next-intl's `t` the component uses: plain calls
    // return the key; `t.rich` does too (the limit-warning banner renders
    // it once 25-game fixtures push past the warning threshold).
    const t = (key: string) => key;
    t.rich = (key: string) => key;
    return t;
  },
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
    engineConfig: { kind: 'stockfish', skillLevel: 1 },
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
    window.localStorage.clear();
    authState.user = null;
    authState.hasProfile = false;
    authState.isLoading = false;
    mockGetPublishPromotionTarget.mockImplementation((qualification: unknown) =>
      Promise.resolve(qualification)
    );
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

  describe('publish nudge (skip-grant catch-all)', () => {
    // A finished win whose settings satisfy the 1dan game requirement.
    const qualifyingGame = () =>
      createMockGame({
        id: 'game-dan',
        status: 'win',
        moves: ['e4' as Game['moves'][number]],
        gamePreferences: {
          boardVisibility: 'never',
          showOwnPieces: true,
          showOpponentPieces: true,
          pieceShapeMode: 'normal',
          pieceColors: 'normal',
          pawnHideMode: 'none',
        } as Game['gamePreferences'],
        operationLogs: [],
      });

    function signIn() {
      authState.user = { id: 'user-1' };
      authState.hasProfile = true;
    }

    it('shows the black-belt nudge with a publish CTA for a signed-in user', async () => {
      signIn();
      mockUseGameList.mockReturnValue({ games: [qualifyingGame()], isLoading: false });

      render(<GamesPageClient locale="en" />);

      expect(await screen.findByText('publishNudge.body1dan')).toBeInTheDocument();
      expect(mockGetPublishPromotionTarget).toHaveBeenCalledWith('1dan');
      const cta = screen.getByText('publishNudge.cta');
      expect(cta.closest('a')).toHaveAttribute('href', '/games/shared/new?gameId=game-dan');
    });

    it('uses the 1kyu wording when the server downgrades the promise (dan already held)', async () => {
      signIn();
      mockGetPublishPromotionTarget.mockResolvedValue('1kyu');
      mockUseGameList.mockReturnValue({ games: [qualifyingGame()], isLoading: false });

      render(<GamesPageClient locale="en" />);

      expect(await screen.findByText('publishNudge.body1kyu')).toBeInTheDocument();
      expect(screen.queryByText('publishNudge.body1dan')).toBeNull();
    });

    it('stays hidden when the user already holds every rank the game satisfies', async () => {
      signIn();
      mockGetPublishPromotionTarget.mockResolvedValue(null);
      mockUseGameList.mockReturnValue({ games: [qualifyingGame()], isLoading: false });

      render(<GamesPageClient locale="en" />);

      // Flush the resolved-null promotion promise.
      await screen.findByTestId('game-list');
      expect(screen.queryByText('publishNudge.body1dan')).toBeNull();
      expect(screen.queryByText('publishNudge.body1kyu')).toBeNull();
    });

    it('stays hidden for signed-out viewers — the finish modal owns their pitch', () => {
      mockUseGameList.mockReturnValue({ games: [qualifyingGame()], isLoading: false });

      render(<GamesPageClient locale="en" />);

      expect(screen.queryByText('publishNudge.body1dan')).toBeNull();
      expect(mockGetPublishPromotionTarget).not.toHaveBeenCalled();
    });

    it('stays hidden when no game qualifies (unfinished / unconstrained fixtures)', () => {
      signIn();
      mockUseGameList.mockReturnValue({ games: createMockGames(3), isLoading: false });

      render(<GamesPageClient locale="en" />);

      expect(screen.queryByText('publishNudge.body1dan')).toBeNull();
      expect(screen.queryByText('publishNudge.body1kyu')).toBeNull();
    });

    it('skips games this browser already published', () => {
      signIn();
      // shared-game-store's real localStorage record marks game-dan published.
      window.localStorage.setItem(
        'blindfold_chess_shared_games',
        JSON.stringify({ 'game-dan': { publishedId: 'pub-1' } })
      );
      mockUseGameList.mockReturnValue({ games: [qualifyingGame()], isLoading: false });

      render(<GamesPageClient locale="en" />);

      expect(screen.queryByText('publishNudge.body1dan')).toBeNull();
    });
  });
});
