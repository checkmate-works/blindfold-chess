import { fireEvent, render, screen } from '@testing-library/react';
import { type Mock, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { GameReview } from './GameReview';

// ---------------------------------------------------------------------------
// Characterization test. Pins the observable behaviour of GameReview (live
// mode) — the board preferences handed to InlineBoardView, the initial-position
// selection, the comment/chunk tab default, the stats auth-gating, and the URL
// hash sync — so refactors preserve it. Local (result) mode is covered by the
// result screen's own tests.
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

// Only the two position-resolving reads are stubbed; `foldBoardVisibility`
// stays real so this exercises the actual hidden-board rule rather than a
// re-statement of it.
vi.mock('@/lib/games/play-settings-log', async (orig) => {
  const actual = await (orig as () => Promise<Record<string, unknown>>)();
  return {
    ...actual,
    gameUsedNotablePlaySettings: () => mockNotable,
    playSettingsAtHalfMove: () => mockEffectiveSettings,
  };
});

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

vi.mock('@/app/[locale]/(public)/games/play/_components/MoveOpsDetail', () => ({
  MoveOpsDetail: (props: { title?: string }) => (
    <div data-testid="move-ops-detail" data-title={props.title} />
  ),
}));

vi.mock('@/app/[locale]/(public)/games/play/result/_components/GameStatsOverview', () => ({
  GameStatsOverview: () => <div data-testid="stats-overview" />,
}));

vi.mock('@/app/[locale]/(public)/games/play/result/_components/StatsAuthGate', () => ({
  StatsAuthGate: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-gate">{children}</div>
  ),
}));

vi.mock('./GameMoveContributions', () => ({
  GameMoveContributions: () => <div data-testid="move-contributions" />,
}));

vi.mock('./GameDiscussionFeed', () => ({
  GameDiscussionFeed: () => <div data-testid="discussion-feed" />,
}));

vi.mock('@/app/[locale]/_components/HelpTourButton', () => ({
  HelpTourButton: () => <button type="button" data-testid="help-tour" />,
}));

vi.mock('./PlaySettingsIndicator', () => ({
  PlaySettingsIndicator: () => <div data-testid="play-settings" />,
}));

type ReplayProps = Parameters<typeof GameReview>[0];
type LiveSocial = Extract<ReplayProps['social'], { mode: 'live' }>;
type LocalSocial = Extract<ReplayProps['social'], { mode: 'local' }>;

function liveSocial(overrides: Partial<LiveSocial> = {}): LiveSocial {
  return {
    mode: 'live',
    isAuthenticated: false,
    gameId: 'game-1',
    comments: [],
    gameChunks: [],
    availableChunks: [],
    currentUser: null,
    isGameOwner: false,
    ...overrides,
  };
}

function localSocial(overrides: Partial<LocalSocial> = {}): LocalSocial {
  return {
    mode: 'local',
    isAuthenticated: true,
    discussionContent: <div data-testid="local-discussion" />,
    ...overrides,
  };
}

function baseProps(overrides: Partial<ReplayProps> = {}): ReplayProps {
  return {
    moves: mockMoves,
    startingFen: null,
    playerColor: 'white',
    result: 'win',
    detectedOpening: null,
    engineConfig: { kind: 'stockfish', skillLevel: 5 } as ReplayProps['engineConfig'],
    operationLogs: null,
    playSettings: null,
    playSettingsLog: null,
    locale: 'en' as Locale,
    social: liveSocial(),
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

describe('GameReview — initial position selection', () => {
  it('opens at the deep-linked comment move when highlightCommentId matches', () => {
    render(
      <GameReview
        {...baseProps({
          social: liveSocial({
            comments: [{ id: 'c1', ply: 1, deletedAt: null } as LiveSocial['comments'][number]],
            highlightCommentId: 'c1',
          }),
        })}
      />
    );
    expect(mockNav.navigateToPosition).toHaveBeenCalledWith(1);
  });

  it('opens at the URL hash half-move when present and no highlight', () => {
    window.location.hash = '#3';
    render(<GameReview {...baseProps()} />);
    expect(mockNav.navigateToPosition).toHaveBeenCalledWith(2);
  });

  it('opens at the overview board (-2) when neither highlight nor hash is present', () => {
    render(<GameReview {...baseProps()} />);
    expect(mockNav.navigateToPosition).toHaveBeenCalledWith(-2);
  });
});

describe('GameReview — board preferences (reproduce view)', () => {
  it('hands InlineBoardView fully-revealed preferences by default', () => {
    render(<GameReview {...baseProps()} />);
    const prefs = inlineBoardProps.preferences as GamePreferences;
    expect(prefs.showOwnPieces).toBe(true);
    expect(prefs.showOpponentPieces).toBe(true);
    expect(prefs.pieceShapeMode).toBe('normal');
    expect(prefs.pieceColors).toBe('normal');
    expect(prefs.boardVisibility).toBe('always');
  });

  it('defaults to "as played" (reflects the game settings) and reveals when toggled off', () => {
    mockNav.currentPosition = 0;
    mockNotable = true;
    mockEffectiveSettings = {
      showOwnPieces: true,
      showOpponentPieces: false,
      pieceShapeMode: 'circles-all',
      pieceColors: 'normal',
    };

    render(
      <GameReview
        {...baseProps({
          playSettings: { showOwnPieces: true } as ReplayProps['playSettings'],
        })}
      />
    );

    // Default (reproduce ON) → board reflects the player's settings.
    const reflected = inlineBoardProps.preferences as GamePreferences;
    expect(reflected.showOpponentPieces).toBe(false);
    expect(reflected.pieceShapeMode).toBe('circles-all');

    // Toggle reproduce view off → fully revealed.
    fireEvent.click(screen.getByRole('switch'));
    expect((inlineBoardProps.preferences as GamePreferences).showOpponentPieces).toBe(true);
  });
});

describe('GameReview — per-move contributions', () => {
  it('renders the contributions panel on a move position', () => {
    mockNav.currentPosition = 0;
    render(<GameReview {...baseProps()} />);
    expect(screen.getByTestId('move-contributions')).toBeInTheDocument();
  });

  it('hides the contributions panel at the initial (overview) position', () => {
    mockNav.currentPosition = -2;
    render(<GameReview {...baseProps()} />);
    expect(screen.queryByTestId('move-contributions')).toBeNull();
  });
});

describe('GameReview — stats overview gating', () => {
  it('gates the stats overview behind StatsAuthGate for anonymous viewers', () => {
    mockStats = { totalMoves: 3 };
    render(<GameReview {...baseProps({ social: liveSocial({ isAuthenticated: false }) })} />);
    expect(screen.getByTestId('auth-gate')).toBeInTheDocument();
    expect(screen.getByTestId('stats-overview')).toBeInTheDocument();
  });

  it('shows the stats overview directly for signed-in viewers', () => {
    mockStats = { totalMoves: 3 };
    render(
      <GameReview
        {...baseProps({
          social: liveSocial({
            isAuthenticated: true,
            currentUser: { id: 'u1' } as LiveSocial['currentUser'],
          }),
        })}
      />
    );
    expect(screen.queryByTestId('auth-gate')).not.toBeInTheDocument();
    expect(screen.getByTestId('stats-overview')).toBeInTheDocument();
  });

  it('shows the stats to a signed-in viewer even without a comment profile', () => {
    // Auth is driven by `isAuthenticated`, not the presence of `currentUser`
    // (the comment profile), so a member whose profile isn't loaded still sees
    // the stats rather than the sign-up gate.
    mockStats = { totalMoves: 3 };
    render(
      <GameReview
        {...baseProps({ social: liveSocial({ isAuthenticated: true, currentUser: null }) })}
      />
    );
    expect(screen.queryByTestId('auth-gate')).not.toBeInTheDocument();
    expect(screen.getByTestId('stats-overview')).toBeInTheDocument();
  });
});

describe('GameReview — local (result) mode per-move ops detail', () => {
  it('renders the shared MoveOpsDetail on a move position, so a rejected board move shows here too', () => {
    mockNav = { ...mockNav, currentPosition: 0 }; // a move (ply 0), not the overview board
    render(<GameReview {...baseProps({ social: localSocial() })} />);

    const ops = screen.getByTestId('move-ops-detail');
    expect(ops).toBeInTheDocument();
    // Given a move title so it can stand alone (no surrounding move chrome locally).
    expect(ops).toHaveAttribute('data-title');
  });

  it('does not render the per-move ops detail on the overview (initial) board', () => {
    mockNav = { ...mockNav, currentPosition: -2 }; // overview board → no current ply
    render(<GameReview {...baseProps({ social: localSocial() })} />);

    expect(screen.queryByTestId('move-ops-detail')).not.toBeInTheDocument();
  });
});

describe('GameReview — URL hash sync', () => {
  it('writes the half-move to the URL hash once navigation settles', () => {
    vi.useFakeTimers();
    const replaceState = vi.spyOn(window.history, 'replaceState');

    const { rerender } = render(<GameReview {...baseProps()} />);

    // syncReadyRef flips true on the next macrotask; before that, no write.
    replaceState.mockClear();

    vi.advanceTimersByTime(1);

    // A genuine navigation after settling writes the hash.
    mockNav = { ...mockNav, currentPosition: 1 };
    rerender(<GameReview {...baseProps()} />);

    expect(replaceState).toHaveBeenCalled();
    const url = replaceState.mock.calls.at(-1)?.[2] as URL;
    expect(url.hash).toBe('#2');

    replaceState.mockRestore();
  });
});

describe('GameReview — end-of-game mark', () => {
  // Scholar's mate: black is mated with its king still on e8.
  const MATE_FEN = 'r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4';
  // The same game one move earlier — decisive result, but not mate on the board.
  const PLAYABLE_FEN = 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 3';

  beforeEach(() => {
    mockNav.currentPosition = -1;
  });

  it('marks the mated king on the final position', () => {
    mockNav.latestFen = MATE_FEN;
    render(<GameReview {...baseProps({ result: 'win', playerColor: 'white' })} />);

    expect(inlineBoardProps.terminationMark).toEqual({ square: 'e8', kind: 'checkmate' });
  });

  it('reads a decisive result on a still-playable position as a resignation', () => {
    mockNav.latestFen = PLAYABLE_FEN;
    render(<GameReview {...baseProps({ result: 'loss', playerColor: 'white' })} />);

    // The player lost without being mated — their own king carries the flag.
    expect(inlineBoardProps.terminationMark).toEqual({ square: 'e1', kind: 'resignation' });
  });

  it('marks nothing on a draw', () => {
    mockNav.latestFen = PLAYABLE_FEN;
    render(<GameReview {...baseProps({ result: 'draw' })} />);

    expect(inlineBoardProps.terminationMark).toBeNull();
  });

  it('drops the mark while the viewer is stepping through history', () => {
    mockNav.latestFen = MATE_FEN;
    mockNav.currentPosition = 1;
    render(<GameReview {...baseProps({ result: 'win', playerColor: 'white' })} />);

    expect(inlineBoardProps.terminationMark).toBeNull();
  });

  it('marks the last ply when it is addressed by index (a #N deep link)', () => {
    mockNav.latestFen = MATE_FEN;
    // mockMoves has 3 plies, so the final one is index 2 — the position a
    // shared "…#3" link opens at, which is not the `-1` latest sentinel.
    mockNav.currentPosition = 2;
    render(<GameReview {...baseProps({ result: 'win', playerColor: 'white' })} />);

    expect(inlineBoardProps.terminationMark).toEqual({ square: 'e8', kind: 'checkmate' });
  });
});
