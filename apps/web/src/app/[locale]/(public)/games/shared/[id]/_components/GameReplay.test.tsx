import { fireEvent, render, screen } from '@testing-library/react';
import { type Mock, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { GameReplay } from './GameReplay';

// ---------------------------------------------------------------------------
// Characterization test. Pins the observable behaviour of GameReplay — the
// board preferences handed to InlineBoardView, the initial-position selection,
// the comment/chunk tab default, the stats auth-gating, and the URL hash sync —
// so the subsequent hook extraction (useReplayPreferences / useReplayUrlSync /
// useReplayCommentTabs / useReplayStatsOverview) can be verified to preserve it.
// ---------------------------------------------------------------------------

const basePreferences = {
  showOwnPieces: false,
  showOpponentPieces: false,
  pieceShapeMode: 'circles-all',
  pieceColors: 'white-only',
  boardVisibility: 'never',
} as unknown as GamePreferences;

let mockMoves: string[];
let mockNav: {
  currentPosition: number;
  displayFen: string | null;
  latestFen: string;
  navigateToPosition: Mock;
  navigateToStart: Mock;
  navigatePrevious: Mock;
  navigateNext: Mock;
  navigateToEnd: Mock;
};
let mockFlip: { effectiveFlipped: boolean; toggleFlip: Mock };
let mockStats: { totalMoves: number };
let mockNotable: boolean;
let mockEffectiveSettings: Record<string, unknown> | null;
let inlineBoardProps: Record<string, unknown>;
const pushSpy = vi.fn();

vi.mock('@/app/[locale]/(public)/games/play/_hooks', () => ({
  useNotation: () => ({ moves: mockMoves, formattedPgn: 'PGN' }),
  useMoveNavigation: () => mockNav,
  useBoardFlip: () => mockFlip,
}));

vi.mock('@/app/[locale]/_contexts/GamePreferencesContext', () => ({
  useGamePreferences: () => ({ preferences: basePreferences }),
}));

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => Object.assign((key: string) => key, { has: () => true }),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushSpy }) }));

vi.mock('@/lib/games/compute-game-stats', () => ({ computeGameStats: () => mockStats }));

vi.mock('@/lib/games/play-settings-log', () => ({
  gameUsedNotablePlaySettings: () => mockNotable,
  playSettingsAtHalfMove: () => mockEffectiveSettings,
}));

vi.mock('@blindfold-chess/features/chess-core', async (orig) => {
  const actual = await (orig as () => Promise<Record<string, unknown>>)();
  return {
    ...actual,
    getLastMoveDetails: () => null,
    fenToLichessUrl: () => 'https://lichess.org/analysis',
  };
});

vi.mock('@/app/[locale]/(public)/games/play/_components/InlineBoardView', () => ({
  InlineBoardView: (props: Record<string, unknown>) => {
    inlineBoardProps = props;
    return <div data-testid="inline-board" />;
  },
}));

vi.mock('@/app/[locale]/(public)/games/play/_components/MovesPanel', () => ({
  MovesPanel: () => <div data-testid="moves-panel" />,
}));

vi.mock('@/app/[locale]/(public)/games/play/result/_components/GameStatsOverview', () => ({
  GameStatsOverview: () => <div data-testid="stats-overview" />,
}));

vi.mock('@/app/[locale]/(public)/games/play/result/_components/StatsAuthGate', () => ({
  StatsAuthGate: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-gate">{children}</div>
  ),
}));

vi.mock('./GameCommentThread', () => ({
  GameCommentThread: () => <div data-testid="comment-thread" />,
}));

vi.mock('./GameChunkSection', () => ({
  GameChunkSection: () => <div data-testid="chunk-section" />,
}));

vi.mock('./PlaySettingsIndicator', () => ({
  PlaySettingsIndicator: () => <div data-testid="play-settings" />,
}));

type ReplayProps = Parameters<typeof GameReplay>[0];

function baseProps(overrides: Partial<ReplayProps> = {}): ReplayProps {
  return {
    gameId: 'game-1',
    moves: mockMoves,
    startingFen: null,
    playerColor: 'white',
    engineConfig: { kind: 'stockfish', skillLevel: 5 } as ReplayProps['engineConfig'],
    operationLogs: null,
    playSettings: null,
    playSettingsLog: null,
    locale: 'en' as Locale,
    comments: [],
    gameChunks: [],
    availableChunks: [],
    currentUser: null,
    isGameOwner: false,
    ...overrides,
  };
}

beforeEach(() => {
  mockMoves = ['e4', 'e5', 'Nf3'];
  mockNav = {
    currentPosition: -2,
    displayFen: null,
    latestFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    navigateToPosition: vi.fn(),
    navigateToStart: vi.fn(),
    navigatePrevious: vi.fn(),
    navigateNext: vi.fn(),
    navigateToEnd: vi.fn(),
  };
  mockFlip = { effectiveFlipped: false, toggleFlip: vi.fn() };
  mockStats = { totalMoves: 0 };
  mockNotable = false;
  mockEffectiveSettings = null;
  inlineBoardProps = {};
  pushSpy.mockClear();
  window.location.hash = '';
});

afterEach(() => {
  vi.useRealTimers();
});

describe('GameReplay — initial position selection', () => {
  it('opens at the deep-linked comment move when highlightCommentId matches', () => {
    render(
      <GameReplay
        {...baseProps({
          comments: [{ id: 'c1', ply: 1, deletedAt: null } as ReplayProps['comments'][number]],
          highlightCommentId: 'c1',
        })}
      />
    );
    expect(mockNav.navigateToPosition).toHaveBeenCalledWith(1);
  });

  it('opens at the URL hash half-move when present and no highlight', () => {
    window.location.hash = '#3';
    render(<GameReplay {...baseProps()} />);
    expect(mockNav.navigateToPosition).toHaveBeenCalledWith(2);
  });

  it('opens at the overview board (-2) when neither highlight nor hash is present', () => {
    render(<GameReplay {...baseProps()} />);
    expect(mockNav.navigateToPosition).toHaveBeenCalledWith(-2);
  });
});

describe('GameReplay — board preferences (reproduce view)', () => {
  it('hands InlineBoardView fully-revealed preferences by default', () => {
    render(<GameReplay {...baseProps()} />);
    const prefs = inlineBoardProps.preferences as GamePreferences;
    expect(prefs.showOwnPieces).toBe(true);
    expect(prefs.showOpponentPieces).toBe(true);
    expect(prefs.pieceShapeMode).toBe('normal');
    expect(prefs.pieceColors).toBe('normal');
    expect(prefs.boardVisibility).toBe('always');
  });

  it('reflects the game play-settings on the board when reproduce view is toggled on', () => {
    mockNav.currentPosition = 0;
    mockNotable = true;
    mockEffectiveSettings = {
      showOwnPieces: true,
      showOpponentPieces: false,
      pieceShapeMode: 'circles-all',
      pieceColors: 'normal',
    };

    render(
      <GameReplay
        {...baseProps({
          playSettings: { showOwnPieces: true } as ReplayProps['playSettings'],
        })}
      />
    );

    // Default (reproduce off) → fully revealed.
    expect((inlineBoardProps.preferences as GamePreferences).showOpponentPieces).toBe(true);

    // Toggle reproduce view on.
    fireEvent.click(screen.getByRole('switch'));

    const prefs = inlineBoardProps.preferences as GamePreferences;
    expect(prefs.showOpponentPieces).toBe(false);
    expect(prefs.pieceShapeMode).toBe('circles-all');
  });
});

describe('GameReplay — comment / chunk tab default', () => {
  it('defaults to the comments tab on a move with comments', () => {
    mockNav.currentPosition = 0;
    render(
      <GameReplay
        {...baseProps({
          comments: [{ id: 'c1', ply: 0, deletedAt: null } as ReplayProps['comments'][number]],
        })}
      />
    );
    expect(screen.getByTestId('comment-thread').parentElement).not.toHaveClass('hidden');
    expect(screen.getByTestId('chunk-section').parentElement).toHaveClass('hidden');
  });

  it('opens straight to chunks on a move with chunks and no comments', () => {
    mockNav.currentPosition = 0;
    render(
      <GameReplay
        {...baseProps({
          gameChunks: [{ ply: 0 } as ReplayProps['gameChunks'][number]],
        })}
      />
    );
    expect(screen.getByTestId('chunk-section').parentElement).not.toHaveClass('hidden');
    expect(screen.getByTestId('comment-thread').parentElement).toHaveClass('hidden');
  });
});

describe('GameReplay — stats overview gating', () => {
  it('gates the stats overview behind StatsAuthGate for anonymous viewers', () => {
    mockStats = { totalMoves: 3 };
    render(<GameReplay {...baseProps({ currentUser: null })} />);
    expect(screen.getByTestId('auth-gate')).toBeInTheDocument();
    expect(screen.getByTestId('stats-overview')).toBeInTheDocument();
  });

  it('shows the stats overview directly for signed-in viewers', () => {
    mockStats = { totalMoves: 3 };
    render(
      <GameReplay {...baseProps({ currentUser: { id: 'u1' } as ReplayProps['currentUser'] })} />
    );
    expect(screen.queryByTestId('auth-gate')).not.toBeInTheDocument();
    expect(screen.getByTestId('stats-overview')).toBeInTheDocument();
  });
});

describe('GameReplay — URL hash sync', () => {
  it('writes the half-move to the URL hash once navigation settles', () => {
    vi.useFakeTimers();
    const replaceState = vi.spyOn(window.history, 'replaceState');

    const { rerender } = render(<GameReplay {...baseProps()} />);

    // syncReadyRef flips true on the next macrotask; before that, no write.
    replaceState.mockClear();

    vi.advanceTimersByTime(1);

    // A genuine navigation after settling writes the hash.
    mockNav = { ...mockNav, currentPosition: 1 };
    rerender(<GameReplay {...baseProps()} />);

    expect(replaceState).toHaveBeenCalled();
    const url = replaceState.mock.calls.at(-1)?.[2] as URL;
    expect(url.hash).toBe('#2');

    replaceState.mockRestore();
  });
});
