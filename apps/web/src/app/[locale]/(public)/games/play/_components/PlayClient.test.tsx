import { render, screen } from '@testing-library/react';
import { type Mock, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Locale } from '@/app/[locale]/_lib/types';

import { PlayClient } from './PlayClient';

// ---------------------------------------------------------------------------
// Characterization test. Pins the observable behaviour of PlayClient that the
// finished-game navigation extraction touches: which panel renders for each
// game state (skeleton / in-progress / finished), the redirect-to-result
// effect, the not-found short-circuit, and the auth-gated postmortem.
// ---------------------------------------------------------------------------

const replace = vi.fn();
const push = vi.fn();
let finishedParam: string | null;
const notFoundSpy = vi.fn();

let guardAction: Mock;
let isAuthModalOpen: boolean;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push }),
  useSearchParams: () => ({ get: (k: string) => (k === 'finished' ? finishedParam : null) }),
  notFound: () => notFoundSpy(),
}));

vi.mock('@blindfold-chess/features/chess-core/fen', () => ({
  fenToLichessUrl: () => 'https://lichess.org/analysis',
}));

vi.mock('@/app/[locale]/_hooks/use-auth-guard', () => ({
  useAuthGuard: () => ({
    guardAction,
    isModalOpen: isAuthModalOpen,
    closeModal: vi.fn(),
  }),
}));

vi.mock('../_hooks', () => ({
  useBoardFlip: () => ({ effectiveFlipped: false, toggleFlip: vi.fn() }),
  useConfirmationDialogs: () => ({
    restart: { openWithPosition: vi.fn() },
    resign: {},
    undo: {},
  }),
  useMoveNavigation: () => ({
    currentPosition: -1,
    displayFen: null,
    navigateToPosition: vi.fn(),
    navigateToStart: vi.fn(),
    navigatePrevious: vi.fn(),
    navigateNext: vi.fn(),
    navigateToEnd: vi.fn(),
    resetNavigation: vi.fn(),
  }),
}));

vi.mock('../_hooks/use-peek-state', () => ({
  usePeekState: () => ({ boardMasked: false, handleRevealBoard: vi.fn(), remask: vi.fn() }),
}));

vi.mock('../_hooks/use-play-client-preferences', () => ({
  usePlayClientPreferences: () => ({
    preferences: { boardVisibility: 'always', highlightLastMove: true },
    updatePreferences: vi.fn(),
    skeletonMode: 'text',
    skeletonHasModeSwitch: false,
  }),
}));

vi.mock('./AiReplyChip', () => ({
  AiReplyChip: () => <div data-testid="ai-reply-chip" />,
  useAiReplyChip: () => ({ active: false, thinking: false }),
}));

vi.mock('./BoardSettingsButton', () => ({ BoardSettingsButton: () => <div /> }));
vi.mock('./InlineBoardView', () => ({ InlineBoardView: () => <div data-testid="inline-board" /> }));
vi.mock('./MoveInputSkeleton', () => ({
  MoveInputSkeleton: () => <div data-testid="input-skeleton" />,
}));
vi.mock('./MovesPanel', () => ({ MovesPanel: () => <div data-testid="moves-panel" /> }));
vi.mock('./MovesPanelSkeleton', () => ({
  MovesPanelSkeleton: () => <div data-testid="moves-panel-skeleton" />,
}));
vi.mock('./PlayClientModals', () => ({ PlayClientModals: () => <div data-testid="modals" /> }));
vi.mock('./GameInProgressPanel', () => ({
  GameInProgressPanel: () => <div data-testid="in-progress-panel" />,
}));
vi.mock('./FinishedGamePanel', () => ({
  FinishedGamePanel: (props: { onPostmortem: () => void }) => (
    <button type="button" data-testid="finished-panel" onClick={props.onPostmortem}>
      finished
    </button>
  ),
}));
vi.mock('./skeletons', () => ({
  ActionRowSkeleton: () => <div data-testid="action-skeleton" />,
  AlwaysVisibleBoardSkeleton: () => <div data-testid="board-skeleton" />,
  IconButtonSkeleton: () => <div />,
  TextLinkSkeleton: () => <div />,
}));
vi.mock('@/app/[locale]/_components/AuthPromptModal', () => ({
  AuthPromptModal: () => <div data-testid="auth-modal" />,
}));

type GameSessionArg = Parameters<typeof PlayClient>[0]['gameSession'];

function buildGameSession(overrides: {
  gameStatus?: string;
  playerResult?: unknown;
  gameNotFound?: boolean;
  gameId?: string;
}): GameSessionArg {
  return {
    gameConfig: {
      playerSide: 'white',
      engineConfig: { kind: 'stockfish', skillLevel: 5 },
      startingFen: undefined,
      perGamePrefs: undefined,
      initialPerGamePrefs: {},
      preferenceChangeLog: [],
      gameId: overrides.gameId ?? 'game-1',
    },
    gameState: {
      gameStatus: overrides.gameStatus ?? 'in_progress',
      playerResult: overrides.playerResult ?? null,
      isPlayerTurn: true,
      isLoading: false,
      lastMove: null,
      gameNotFound: overrides.gameNotFound ?? false,
    },
    moveState: { moves: ['e4', 'e5'], currentFen: 'fen', formattedPgn: [] },
    moveInput: { value: '', setValue: vi.fn(), error: null, clearMoveError: vi.fn() },
    aiMoveError: { message: null, retry: vi.fn() },
    actions: {
      handleSubmitMove: vi.fn(),
      handleResign: vi.fn(),
      handleUndo: vi.fn(),
      handleRestartFromPosition: vi.fn(),
      handleNewGameFromPosition: vi.fn(),
      commitMoveLog: vi.fn(),
      recordPeek: vi.fn(),
      recordMovePeek: vi.fn(),
      recordInvalid: vi.fn(),
      setPerGamePref: vi.fn(),
    },
    operationLogs: [],
    isAiThinking: false,
    aiMoveNotation: null,
    aiMoveSignal: 0,
  } as unknown as GameSessionArg;
}

function renderPlay(gameSession: GameSessionArg, opts: { isInitializing?: boolean } = {}): void {
  render(
    <PlayClient
      locale={'en' as Locale}
      gameSession={gameSession}
      initialMoveInputHint={
        'text' as unknown as Parameters<typeof PlayClient>[0]['initialMoveInputHint']
      }
      initialBoardVisibility="peek"
      isInitializing={opts.isInitializing ?? false}
    />
  );
}

beforeEach(() => {
  replace.mockClear();
  push.mockClear();
  notFoundSpy.mockClear();
  finishedParam = null;
  isAuthModalOpen = false;
  guardAction = vi.fn();
});

describe('PlayClient — view selection', () => {
  it('renders skeletons while an in-progress game is initializing', () => {
    renderPlay(buildGameSession({ gameStatus: 'in_progress' }), { isInitializing: true });
    expect(screen.getByTestId('board-skeleton')).toBeInTheDocument();
    expect(screen.getByTestId('moves-panel-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('in-progress-panel')).not.toBeInTheDocument();
  });

  it('renders the in-progress panel + move list once initialized', () => {
    renderPlay(buildGameSession({ gameStatus: 'in_progress' }), { isInitializing: false });
    expect(screen.getByTestId('in-progress-panel')).toBeInTheDocument();
    expect(screen.getByTestId('moves-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('finished-panel')).not.toBeInTheDocument();
  });

  it('renders the finished panel when reviewing a finished game (finished=1)', () => {
    finishedParam = '1';
    renderPlay(buildGameSession({ gameStatus: 'checkmate', playerResult: 'win' }));
    expect(screen.getByTestId('finished-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('in-progress-panel')).not.toBeInTheDocument();
  });
});

describe('PlayClient — navigation behaviour', () => {
  it('redirects to the result page when a game ends outside review mode', () => {
    renderPlay(buildGameSession({ gameStatus: 'checkmate', playerResult: 'win', gameId: 'g9' }));
    expect(replace).toHaveBeenCalledWith('/en/games/play/result?gameId=g9');
  });

  it('does NOT redirect while reviewing a finished game (finished=1)', () => {
    finishedParam = '1';
    renderPlay(buildGameSession({ gameStatus: 'checkmate', playerResult: 'win' }));
    expect(replace).not.toHaveBeenCalled();
  });

  it('does NOT redirect an in-progress game', () => {
    renderPlay(buildGameSession({ gameStatus: 'in_progress' }));
    expect(replace).not.toHaveBeenCalled();
  });

  it('short-circuits to notFound when the game is missing', () => {
    renderPlay(buildGameSession({ gameNotFound: true }));
    expect(notFoundSpy).toHaveBeenCalled();
  });

  it('routes the postmortem button through the auth guard', () => {
    finishedParam = '1';
    renderPlay(buildGameSession({ gameStatus: 'checkmate', playerResult: 'win' }));
    screen.getByTestId('finished-panel').click();
    expect(guardAction).toHaveBeenCalledTimes(1);
  });
});
