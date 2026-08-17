import { act, fireEvent, render, screen } from '@testing-library/react';
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
/** What the (stubbed) chess-core reports as the move reaching any position. */
let mockLastMove: { from: string; to: string } | null;
let mockStats: { totalMoves: number };
let mockNotable: boolean;
let mockEffectiveSettings: Record<string, unknown> | null;
/** The `board` prop group GameReview handed InlineBoardView on the last render. */
let inlineBoardProps: Record<string, unknown>;
/** Props GameReview handed the (stubbed) thread on the last render. */
let moveContributionsProps: Record<string, unknown>;
let boardViewModalProps: Record<string, unknown>;
/** moves[] index the stubbed "By Move" strip opens the quick-peek modal at. */
let quickPeekTarget: number;
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
    getLastMoveDetails: () => mockLastMove,
    fenToLichessUrl: () => 'https://lichess.org/analysis',
  };
});

vi.mock('@/app/[locale]/(public)/games/play/_components/InlineBoardView', () => ({
  InlineBoardView: ({ board }: { board: Record<string, unknown> }) => {
    inlineBoardProps = board;
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

// Stands in for the "By Move" strip: one button that opens the quick-peek modal
// at `quickPeekTarget`, which is all these tests need from the overview.
vi.mock('@/app/[locale]/(public)/games/play/result/_components/GameStatsOverview', () => ({
  GameStatsOverview: ({ onSelectMove }: { onSelectMove: (movesIndex: number) => void }) => (
    <button
      type="button"
      data-testid="stats-overview"
      onClick={() => onSelectMove(quickPeekTarget)}
    />
  ),
}));

vi.mock('@/app/[locale]/(public)/games/play/_components/BoardViewModal', () => ({
  BoardViewModal: (props: Record<string, unknown>) => {
    boardViewModalProps = props;
    return props.isOpen ? <div data-testid="board-view-modal" /> : null;
  },
}));

vi.mock('@/app/[locale]/(public)/games/play/result/_components/StatsAuthGate', () => ({
  StatsAuthGate: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-gate">{children}</div>
  ),
}));

vi.mock('./GameMoveContributions', () => ({
  GameMoveContributions: (props: Record<string, unknown>) => {
    moveContributionsProps = props;
    return <div data-testid="move-contributions" />;
  },
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

// Pulls in next-intl routing (Link) and the Stockfish generation hook; its
// own behaviour is covered by AiReviewPanel.test.tsx. Props are recorded so
// the page's half of the contract — what it hands the panel back after the
// panel has been unmounted and re-created — can be asserted here.
type AiPanelProps = {
  initialReview: unknown;
  onReviewGenerated?: (review: unknown) => void;
};
let aiPanelProps: AiPanelProps | null = null;
vi.mock('./AiReviewPanel', () => ({
  AiReviewPanel: (props: AiPanelProps) => {
    aiPanelProps = props;
    return <div data-testid="ai-review-panel" />;
  },
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
    discussionContent: () => <div data-testid="local-discussion" />,
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
  mockLastMove = null;
  mockStats = { totalMoves: 0 };
  mockNotable = false;
  mockEffectiveSettings = null;
  inlineBoardProps = {};
  moveContributionsProps = {};
  boardViewModalProps = {};
  quickPeekTarget = 2;
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

describe('GameReview — contributions', () => {
  it('renders the contributions panel on a move position', () => {
    mockNav.currentPosition = 0;
    render(<GameReview {...baseProps()} />);
    expect(screen.getByTestId('move-contributions')).toBeInTheDocument();
  });

  it('renders the whole-game thread at the initial (overview) position', () => {
    // No stats recorded → no Summary side → the discussion view (whole-game
    // thread + per-move index) renders directly, without a tab row.
    mockNav.currentPosition = -2;
    render(<GameReview {...baseProps()} />);
    expect(screen.getByTestId('move-contributions')).toBeInTheDocument();
    expect(screen.getByTestId('discussion-feed')).toBeInTheDocument();
    expect(screen.queryByRole('tab')).toBeNull();
  });

  it('keeps the whole-game thread behind the Discussion tab when a summary exists', () => {
    mockStats = { totalMoves: 3 };
    mockNav.currentPosition = -2;
    render(<GameReview {...baseProps({ social: liveSocial({ isAuthenticated: true }) })} />);
    // No comments → Summary is the default tab; the tab row shows regardless.
    expect(screen.queryByTestId('move-contributions')).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'overview.discussionTab' }));
    expect(screen.getByTestId('move-contributions')).toBeInTheDocument();
  });
});

describe('GameReview — overview tabs on a move position', () => {
  // The whole point of the tab row: the Summary and the AI Review describe the
  // game, not a position, so stepping onto a move must not strand them on the
  // opening board (it used to replace the entire block with the move's thread).
  const onMove = (overrides: Partial<LiveSocial> = {}) => {
    mockStats = { totalMoves: 3 };
    mockNav.currentPosition = 0;
    return baseProps({
      aiReview: { initial: null, generation: { kind: 'allowed' } },
      social: liveSocial({
        isAuthenticated: true,
        comments: [{ id: 'c1', ply: 1, deletedAt: null } as LiveSocial['comments'][number]],
        ...overrides,
      }),
    });
  };

  it('keeps the tab row rendered while a move is on the board', () => {
    render(<GameReview {...onMove()} />);
    expect(screen.getAllByRole('tab').map((el) => el.textContent)).toEqual([
      'overview.summaryTab',
      'overview.discussionTab (1)',
      'aiReview.tab',
    ]);
  });

  it('shows the thread of the move on the board under the Discussion tab', () => {
    render(<GameReview {...onMove()} />);
    // A game with comments leads with the discussion, which on a move position
    // is that move's own thread — not the whole-game one.
    expect(screen.getByTestId('move-contributions')).toBeInTheDocument();
    expect(screen.queryByTestId('discussion-feed')).toBeNull();
  });

  it('reaches the Summary and the AI Review without returning to the opening board', () => {
    render(<GameReview {...onMove()} />);

    fireEvent.click(screen.getByRole('tab', { name: 'overview.summaryTab' }));
    expect(screen.getByTestId('stats-overview')).toBeInTheDocument();
    expect(screen.queryByTestId('move-contributions')).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: 'aiReview.tab' }));
    expect(screen.getByTestId('ai-review-panel')).toBeInTheDocument();
  });

  // The tab row renders one panel at a time, so leaving the AI Review tab
  // destroys the panel and everything it knows. A review generated in this
  // session exists nowhere on the server prop until the next server render, so
  // the page has to hand its own copy back — otherwise the author returns to
  // the tab and is asked to generate the review they just paid for.
  it('hands a review generated in this session back to the panel after a tab switch', () => {
    const generated = {
      moments: [],
      content: { momentComments: [] },
      createdAt: '2026-08-16T00:00:00.000Z',
    } as unknown as NonNullable<ReplayProps['aiReview']>['initial'];
    render(<GameReview {...onMove()} />);

    fireEvent.click(screen.getByRole('tab', { name: 'aiReview.tab' }));
    expect(aiPanelProps?.initialReview).toBeNull();

    act(() => aiPanelProps!.onReviewGenerated!(generated));

    fireEvent.click(screen.getByRole('tab', { name: 'overview.summaryTab' }));
    expect(screen.queryByTestId('ai-review-panel')).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'aiReview.tab' }));

    expect(aiPanelProps?.initialReview).toBe(generated);
  });
});

describe('GameReview — AI review grade on the board', () => {
  const withMoment = (ply: number) =>
    baseProps({
      aiReview: {
        initial: {
          moments: [{ ply, judgment: 'blunder' }],
          content: { momentComments: [] },
        } as unknown as NonNullable<ReplayProps['aiReview']>['initial'],
        generation: null,
      },
    });

  it('marks the graded move on the square it landed on', () => {
    mockNav.currentPosition = 1;
    mockLastMove = { from: 'g8', to: 'f6' };
    render(<GameReview {...withMoment(1)} />);
    expect(inlineBoardProps.evaluationMark).toEqual({ square: 'f6', judgment: 'blunder' });
    // The glyph means nothing aloud, so the grade's name rides along.
    expect(inlineBoardProps.evaluationMarkLabel).toBe('aiReview.judgments.blunder');
  });

  it('leaves every ply the review did not grade unmarked', () => {
    mockNav.currentPosition = 0;
    mockLastMove = { from: 'e2', to: 'e4' };
    render(<GameReview {...withMoment(1)} />);
    expect(inlineBoardProps.evaluationMark).toBeNull();
  });

  const REVIEWED = {
    moments: [
      {
        ply: 1,
        san: 'Nf6',
        moveNumber: 1,
        color: 'black',
        evalBefore: 30,
        evalAfter: -170,
        cpLoss: 200,
        bestMoveSan: 'd5',
        judgment: 'blunder',
      },
    ],
    content: {
      momentComments: [{ ply: 1, explanation: 'Hung the knight.', lesson: 'Count first.' }],
    },
    createdAt: '2026-08-14T00:00:00.000Z',
  } as unknown as NonNullable<ReplayProps['aiReview']>['initial'];

  const onReviewedMove = (position: number) => {
    mockStats = { totalMoves: 3 };
    mockNav.currentPosition = position;
    return baseProps({
      social: liveSocial({
        isAuthenticated: true,
        comments: [{ id: 'c1', ply: position, deletedAt: null } as LiveSocial['comments'][number]],
      }),
      aiReview: { initial: REVIEWED, generation: null },
    });
  };

  it("hands the review's take on the move to that move's thread", () => {
    render(<GameReview {...onReviewedMove(1)} />);

    const handed = moveContributionsProps.aiReviewMoment as {
      moment: { ply: number; judgment: string };
      comment: { explanation: string };
      createdAt: Date;
    };
    expect(handed.moment).toMatchObject({ ply: 1, judgment: 'blunder' });
    expect(handed.comment.explanation).toBe('Hung the knight.');
    // The review's own timestamp stands in for a posting time.
    expect(handed.createdAt.toISOString()).toBe('2026-08-14T00:00:00.000Z');
  });

  it('hands nothing to a move the review passed over', () => {
    render(<GameReview {...onReviewedMove(2)} />);
    expect(moveContributionsProps.aiReviewMoment).toBeUndefined();
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

  // The quick-peek modal scrubs independently of the live board, so it needs the
  // mark resolved for ITS position — the summary's By Move strip opens it from
  // the overview board (-2), where the live board carries no mark at all.
  it('marks the final position in the By Move quick-peek modal', () => {
    mockNav.latestFen = MATE_FEN;
    mockNav.currentPosition = -2; // overview board, where the By Move strip lives
    mockStats = { totalMoves: 3 };
    quickPeekTarget = 2; // the last ply

    render(<GameReview {...baseProps({ result: 'win', playerColor: 'white' })} />);
    fireEvent.click(screen.getByTestId('stats-overview'));

    expect(boardViewModalProps.isOpen).toBe(true);
    expect(boardViewModalProps.terminationMark).toEqual({ square: 'e8', kind: 'checkmate' });
    expect(boardViewModalProps.terminationMarkLabel).toBe('termination.checkmate');
    // The board behind it is on the overview position and stays unmarked.
    expect(inlineBoardProps.terminationMark).toBeNull();
  });

  it('leaves a mid-game position unmarked in the quick-peek modal', () => {
    mockNav.latestFen = MATE_FEN;
    mockNav.currentPosition = -2;
    mockStats = { totalMoves: 3 };
    quickPeekTarget = 0; // the first ply — the game had not ended there

    render(<GameReview {...baseProps({ result: 'win', playerColor: 'white' })} />);
    fireEvent.click(screen.getByTestId('stats-overview'));

    expect(boardViewModalProps.terminationMark).toBeNull();
  });
});
