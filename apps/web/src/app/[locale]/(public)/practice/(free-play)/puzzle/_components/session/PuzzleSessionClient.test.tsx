import { STARTING_FEN } from '@blindfold-chess/features/chess-core/fen';
import type { AlgebraicNotation } from '@blindfold-chess/types';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MoveSquares } from '@/lib/board/move-squares';

import { PuzzleSessionClient } from './PuzzleSessionClient';

// `useRouter` is provided by the i18n routing wrapper, which is just a thin
// wrapper around `next-intl`'s navigation helpers. Mock the wrapper directly
// to expose `router.push` as a spy.
const mockPush = vi.fn();
vi.mock('@/i18n/routing', () => ({
  Link: ({
    href,
    onClick,
    children,
  }: {
    href: string;
    onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
    children: React.ReactNode;
  }) => (
    // preventDefault mimics next/link's client-side navigation, so jsdom
    // does not queue a `setTimeout(0)` "navigation to another Document"
    // that fires after the test and pollutes stderr.
    <a
      data-testid="view-result-link"
      href={href}
      onClick={(e) => {
        e.preventDefault();
        onClick?.(e);
      }}
    >
      {children}
    </a>
  ),
  useRouter: () => ({ push: mockPush }),
}));

// Return translation keys unchanged so assertions can target deterministic
// strings without depending on locale bundles.
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/app/[locale]/_contexts/GamePreferencesContext', () => ({
  useGamePreferences: () => ({
    preferences: {
      showCoordinates: true,
      highlightLastMove: true,
      boardTheme: 'monotone',
      showOwnPieces: true,
      showOpponentPieces: true,
      pieceShapeMode: 'normal',
      pieceColors: 'normal',
      moveInputMode: 'button',
      enabledMoveInputModes: ['button'],
      buttonInputPieceLabel: 'icon',
      enableAutoComplete: true,
      boardVisibility: 'peek',
    },
    isLoaded: true,
    isHydrated: true,
    updatePreferences: () => {},
    resetPreferences: () => {},
  }),
}));

vi.mock('@/app/[locale]/(public)/games/play/_components/InlineBoardView', () => ({
  // The puzzle's single peek style is the inline accordion. Expose its `onPeek`
  // as a clickable "showBoard" button so the peek-count tests can trigger a peek.
  // `fen` / `lastMove` are surfaced as data attributes so the opponent-reply
  // reveal tests can assert what the board is painting at each phase.
  InlineBoardView: ({
    board,
    visibility,
    slots,
  }: {
    board: {
      fen?: string;
      lastMove?: MoveSquares | null;
      onMove?: (san: string) => void;
    };
    visibility: { kind: string; onPeek?: () => void };
    slots?: { boardBadge?: React.ReactNode };
  }) => {
    const { fen, lastMove, onMove } = board;
    const boardBadge = slots?.boardBadge;
    return (
      <div data-testid="inline-board-view-wrapper">
        <button
          type="button"
          aria-label="showBoard"
          data-testid="inline-board-view"
          data-fen={fen}
          data-last-move={lastMove ? `${lastMove.from}-${lastMove.to}` : ''}
          onClick={visibility.onPeek}
        >
          showBoard
        </button>
        {/* Stand-in for a drag/click move on the real board — submits 'e4' so the
            board-sourced feedback path can be exercised. Present only while the
            real board is interactive (`onMove` defined). */}
        {onMove && (
          <button type="button" data-testid="stub-board-move" onClick={() => onMove('e4')}>
            board move
          </button>
        )}
        {boardBadge}
      </div>
    );
  },
}));

// Mock the EXP-grant Server Action so the session component does not attempt
// to call into server-only modules (auth, db) from a jsdom test. The default
// resolution returns `{ success: true }` WITHOUT an `expEventId`, which keeps
// the navigation URL grant-less — that matches every existing assertion that
// checks `router.push('/practice/puzzle/<id>/result')`. The dedicated EXP-grant
// describe block below overrides this default to assert the grant-param path.
const mockSavePuzzleResult = vi.fn();
vi.mock('../../_actions/savePuzzleResult', () => ({
  savePuzzleResult: (...args: unknown[]) => mockSavePuzzleResult(...args),
}));

vi.mock('@/app/[locale]/_components/MoveInputPanel', () => ({
  MoveInputPanel: ({
    disabled,
    onSubmit,
    error,
    success,
    moveInput,
    onMoveInputChange,
    onErrorClear,
  }: {
    disabled?: boolean;
    onSubmit: (move: AlgebraicNotation) => boolean | void | Promise<void>;
    error?: string | null;
    success?: boolean;
    moveInput?: string;
    onMoveInputChange?: (value: string) => void;
    onErrorClear?: () => void;
  }) => (
    <div
      data-testid="move-input-panel"
      data-disabled={disabled ? 'true' : 'false'}
      data-success={success ? 'true' : 'false'}
      data-move-input={moveInput ?? ''}
    >
      {error && <p data-testid="panel-error">{error}</p>}
      <button
        type="button"
        data-testid="stub-seed"
        onClick={() => {
          onMoveInputChange?.('Nf3');
        }}
      />
      <button
        type="button"
        data-testid="stub-submit"
        onClick={() => {
          onSubmit('Nf3' as AlgebraicNotation);
        }}
      />
      <input type="hidden" data-testid="stub-custom-move-value" defaultValue="" />
      <button
        type="button"
        data-testid="stub-custom-submit"
        onClick={(e) => {
          const input = (e.currentTarget as HTMLElement).parentElement?.querySelector(
            '[data-testid="stub-custom-move-value"]'
          ) as HTMLInputElement | null;
          onSubmit((input?.value ?? '') as AlgebraicNotation);
        }}
      />
      <button
        type="button"
        data-testid="stub-clear-error"
        onClick={() => {
          onErrorClear?.();
        }}
      />
    </div>
  ),
}));

// FEN with white to move (any legal-looking FEN suffices — the component only
// reads side-to-move via `isBlackToMoveFromFen`).
const POSITION_ID = 'puzzle-123';
const POSITION_TITLE = 'Sample Puzzle';

function toSolutionMoves(line: string) {
  return line
    .split(/\s+/)
    .filter(Boolean)
    .map((san) => ({ san, note: null }));
}

function renderSession(solutions: string[] = ['Nf3'], fen: string = STARTING_FEN) {
  const solutionMoves = solutions.map(toSolutionMoves);
  return render(
    <PuzzleSessionClient
      solutions={solutionMoves}
      positionId={POSITION_ID}
      fen={fen}
      positionTitle={POSITION_TITLE}
      piecesInfo={<div data-testid="stub-pieces-info" />}
      breadcrumb={<nav data-testid="stub-breadcrumb" />}
    />
  );
}

beforeEach(() => {
  mockPush.mockReset();
  mockSavePuzzleResult.mockReset();
  // Default: report a successful grant with NO `expEventId`, so the URL the
  // session pushes stays `/practice/puzzle/<id>/result` (no `?grant=...`).
  // Tests that exercise the grant-URL path override this in their own block.
  mockSavePuzzleResult.mockResolvedValue({ success: true });
  sessionStorage.clear();
});

describe('PuzzleSessionClient', () => {
  describe('correct answer', () => {
    it('navigates to the result page ~1s after the final player move', () => {
      vi.useFakeTimers();
      try {
        renderSession(['Nf3']);

        fireEvent.click(screen.getByTestId('stub-submit'));

        expect(mockPush).not.toHaveBeenCalled();

        act(() => {
          vi.advanceTimersByTime(1000);
        });

        expect(mockPush).toHaveBeenCalledWith(`/practice/puzzle/${POSITION_ID}/result`);
      } finally {
        vi.useRealTimers();
      }
    });

    it('writes the result payload to sessionStorage with the expected shape', () => {
      // Solution: player plays Nf3, opponent replies Nc6 — the solve completes
      // once the single player slot is filled.
      renderSession(['Nf3 Nc6']);

      fireEvent.click(screen.getByTestId('stub-submit'));

      const raw = sessionStorage.getItem(`puzzle_result_${POSITION_ID}`);
      expect(raw).not.toBeNull();

      const parsed = JSON.parse(raw!);
      expect(parsed).toEqual({
        attempts: [{ move: 'Nf3', isCorrect: true }],
        solutionLine: 'Nf3 Nc6',
        fen: STARTING_FEN,
        peekCount: 0,
      });
    });

    it('disables the input panel after the final correct submit', () => {
      renderSession(['Nf3']);

      fireEvent.click(screen.getByTestId('stub-submit'));

      expect(screen.getByTestId('move-input-panel')).toHaveAttribute('data-disabled', 'true');
    });

    it('clears the moveInput buffer on a correct submit', () => {
      renderSession(['Nf3']);

      fireEvent.click(screen.getByTestId('stub-seed'));
      expect(screen.getByTestId('move-input-panel')).toHaveAttribute('data-move-input', 'Nf3');

      fireEvent.click(screen.getByTestId('stub-submit'));

      expect(screen.getByTestId('move-input-panel')).toHaveAttribute('data-move-input', '');
    });
  });

  // ---------------------------------------------------------------------------
  // Opponent reply reveal
  //
  // A correct move paints the player's move on the board immediately, then the
  // opponent's auto-reply is revealed a beat later (highlighted) instead of
  // both landing at once — so the player can see which piece the opponent
  // moved. Input is locked during that window.
  // ---------------------------------------------------------------------------
  describe('opponent reply reveal', () => {
    it('paints the player move immediately then reveals the highlighted opponent reply after a beat, locking input in between', () => {
      vi.useFakeTimers();
      try {
        // Two player slots (e4, Nf3) so the first correct move is NOT the solve
        // — the opponent reply e5 auto-plays and the puzzle continues.
        renderSession(['e4 e5 Nf3']);

        (screen.getByTestId('stub-custom-move-value') as HTMLInputElement).value = 'e4';
        act(() => {
          fireEvent.click(screen.getByTestId('stub-custom-submit'));
        });

        const board = screen.getByTestId('inline-board-view');
        // Phase 1: player's move is on the board (highlighted); input locked
        // while the reply is pending.
        expect(board).toHaveAttribute('data-last-move', 'e2-e4');
        expect(screen.getByTestId('move-input-panel')).toHaveAttribute('data-disabled', 'true');

        // Phase 2: after the reveal delay the opponent's reply is shown and
        // highlighted, and input is unlocked for the next move.
        act(() => {
          vi.advanceTimersByTime(1000);
        });

        expect(screen.getByTestId('inline-board-view')).toHaveAttribute('data-last-move', 'e7-e5');
        expect(screen.getByTestId('move-input-panel')).toHaveAttribute('data-disabled', 'false');
      } finally {
        vi.useRealTimers();
      }
    });

    it('rings the input green on an intermediate correct move, clearing it as the opponent replies', () => {
      vi.useFakeTimers();
      try {
        // Two player slots (e4, Nf3): the first correct move is not the solve,
        // so it gets the plain "correct" ring while the opponent reply pends.
        renderSession(['e4 e5 Nf3']);

        (screen.getByTestId('stub-custom-move-value') as HTMLInputElement).value = 'e4';
        act(() => {
          fireEvent.click(screen.getByTestId('stub-custom-submit'));
        });

        // Green ring on while the reply is pending; input locked meanwhile.
        expect(screen.getByTestId('move-input-panel')).toHaveAttribute('data-success', 'true');
        expect(screen.getByTestId('move-input-panel')).toHaveAttribute('data-disabled', 'true');

        act(() => {
          vi.advanceTimersByTime(1000);
        });

        // Reply landed → ring cleared, input usable again for the next move.
        expect(screen.getByTestId('move-input-panel')).toHaveAttribute('data-success', 'false');
        expect(screen.getByTestId('move-input-panel')).toHaveAttribute('data-disabled', 'false');
      } finally {
        vi.useRealTimers();
      }
    });

    it('highlights the final player move when the solving line ends without an opponent reply', () => {
      renderSession(['Nf3']);

      fireEvent.click(screen.getByTestId('stub-submit'));

      // Nf3 = g1→f3. No opponent reply, so the board rests on the player's
      // winning move, highlighted, with no reveal lockout.
      expect(screen.getByTestId('inline-board-view')).toHaveAttribute('data-last-move', 'g1-f3');
    });
  });

  // ---------------------------------------------------------------------------
  // Feedback placement by input source
  //
  // A rejected move surfaces its feedback next to where it was entered: a chip
  // over the board for a drag/click, the panel's recall-style ring + inline
  // message for a typed/selected move — so it lands where the player is looking.
  // ---------------------------------------------------------------------------
  describe('drag-and-drop feedback placement', () => {
    it('flashes the incorrect chip over the board (not the panel) for a wrong board move', () => {
      renderSession(['Nf3']);

      // Stub board move submits 'e4' from the start position — legal but not
      // the solution, so it is rejected via the board-sourced path.
      fireEvent.click(screen.getByTestId('stub-board-move'));

      expect(screen.getByTestId('submit-feedback-incorrect-board')).toBeInTheDocument();
      // The panel feedback stays quiet for a board-sourced miss.
      expect(screen.queryByTestId('panel-error')).not.toBeInTheDocument();
    });

    it('surfaces the incorrect feedback on the input panel (not the board) for a wrong typed move', () => {
      renderSession(['Nf3']);

      (screen.getByTestId('stub-custom-move-value') as HTMLInputElement).value = 'e4';
      fireEvent.click(screen.getByTestId('stub-custom-submit'));

      // Typed/selected input uses the panel's own recall-style feedback (red
      // ring + inline message, surfaced here as `panel-error`), not the board.
      expect(screen.getByTestId('panel-error')).toBeInTheDocument();
      expect(screen.queryByTestId('submit-feedback-incorrect-board')).not.toBeInTheDocument();
    });
  });

  describe('incorrect answer', () => {
    it('records the attempt and surfaces the incorrect-move panel feedback', () => {
      renderSession(['e4']);

      fireEvent.click(screen.getByTestId('stub-submit'));

      // A wrong typed move drives the panel's recall-style feedback (red ring +
      // inline `panel-error` message + one-shot shake); the input stays enabled
      // so the user can retry.
      expect(screen.getByTestId('panel-error')).toBeInTheDocument();
      expect(screen.getByTestId('move-input-panel')).toHaveAttribute('data-disabled', 'false');
      expect(screen.getByTestId('view-result-link')).toBeInTheDocument();
    });

    it('preserves the moveInput buffer on an incorrect submit so the user can edit their prior attempt', () => {
      renderSession(['e4']);

      fireEvent.click(screen.getByTestId('stub-seed'));
      expect(screen.getByTestId('move-input-panel')).toHaveAttribute('data-move-input', 'Nf3');

      fireEvent.click(screen.getByTestId('stub-submit'));

      // Buffer is intentionally NOT cleared on failure — clearing would force
      // the user to retype the whole move from scratch instead of editing
      // their prior attempt.
      expect(screen.getByTestId('move-input-panel')).toHaveAttribute('data-move-input', 'Nf3');
    });
  });

  describe('board peek', () => {
    it('increments peekCount and persists it to sessionStorage on a subsequent correct submit', () => {
      renderSession(['Nf3']);

      const peekButton = screen.getByRole('button', { name: 'showBoard' });
      fireEvent.click(peekButton);
      fireEvent.click(peekButton);

      fireEvent.click(screen.getByTestId('stub-submit'));

      const parsed = JSON.parse(sessionStorage.getItem(`puzzle_result_${POSITION_ID}`)!);
      expect(parsed.peekCount).toBe(2);
    });

    it('persists peekCount to sessionStorage when the user bails out via the "view result" link after incorrect attempts', () => {
      renderSession(['e4']);

      const peekButton = screen.getByRole('button', { name: 'showBoard' });
      fireEvent.click(peekButton);

      fireEvent.click(screen.getByTestId('stub-submit'));
      fireEvent.click(screen.getByTestId('view-result-link'));

      const parsed = JSON.parse(sessionStorage.getItem(`puzzle_result_${POSITION_ID}`)!);
      expect(parsed.peekCount).toBe(1);
      expect(parsed.attempts).toEqual([{ move: 'Nf3', isCorrect: false }]);
      expect(parsed.solutionLine).toBe('e4');
      expect(parsed.fen).toBe(STARTING_FEN);
    });
  });

  describe('input lifecycle', () => {
    it('auto-dismisses the incorrect-move panel feedback after the feedback duration elapses', () => {
      vi.useFakeTimers();
      try {
        renderSession(['e4']);

        fireEvent.click(screen.getByTestId('stub-submit'));
        expect(screen.getByTestId('panel-error')).toBeInTheDocument();

        // The auto-clear timer is what keeps the surface from going stale.
        // Advance past the timer and the feedback should be gone. 1500 > the
        // FEEDBACK_DURATION_MS constant; we deliberately pick a value larger
        // than the timer so this test is robust against minor tuning of the
        // duration without needing a re-export.
        act(() => {
          vi.advanceTimersByTime(1500);
        });

        expect(screen.queryByTestId('panel-error')).not.toBeInTheDocument();
      } finally {
        vi.useRealTimers();
      }
    });

    it('does not surface a feedback chip before any submit', () => {
      renderSession(['Nf3']);

      expect(screen.queryByTestId('submit-feedback-incorrect')).not.toBeInTheDocument();
    });

    it('offers the give-up link from the start, before any attempt', () => {
      renderSession(['Nf3']);

      // The bail-out link is no longer gated on a prior wrong move — a player
      // can give up (and reveal the answer) at any time.
      expect(screen.getByTestId('view-result-link')).toBeInTheDocument();
    });
  });

  describe('edge-case submissions', () => {
    it('treats a whitespace-only submit as a no-op (no attempt recorded, no error surfaced)', () => {
      renderSession(['Nf3']);

      (screen.getByTestId('stub-custom-move-value') as HTMLInputElement).value = '   ';
      fireEvent.click(screen.getByTestId('stub-custom-submit'));

      expect(screen.queryByTestId('panel-error')).not.toBeInTheDocument();
      // No rejected-attempt chip → the whitespace submit was a true no-op.
      expect(screen.queryByTestId('submit-feedback-incorrect')).not.toBeInTheDocument();
    });

    it('treats the empty string as a no-op (no attempt recorded)', () => {
      renderSession(['Nf3']);

      (screen.getByTestId('stub-custom-move-value') as HTMLInputElement).value = '';
      fireEvent.click(screen.getByTestId('stub-custom-submit'));

      expect(screen.queryByTestId('panel-error')).not.toBeInTheDocument();
      expect(screen.queryByTestId('submit-feedback-incorrect')).not.toBeInTheDocument();
    });

    it('trims surrounding whitespace before comparing against the solution', () => {
      vi.useFakeTimers();
      try {
        renderSession(['Nf3']);

        (screen.getByTestId('stub-custom-move-value') as HTMLInputElement).value = '  Nf3  ';
        fireEvent.click(screen.getByTestId('stub-custom-submit'));

        expect(screen.getByTestId('move-input-panel')).toHaveAttribute('data-disabled', 'true');

        act(() => {
          vi.advanceTimersByTime(1000);
        });
        expect(mockPush).toHaveBeenCalledWith(`/practice/puzzle/${POSITION_ID}/result`);

        const parsed = JSON.parse(sessionStorage.getItem(`puzzle_result_${POSITION_ID}`)!);
        expect(parsed.attempts).toEqual([{ move: 'Nf3', isCorrect: true }]);
      } finally {
        vi.useRealTimers();
      }
    });

    it('accumulates repeated incorrect attempts (same move submitted twice records two attempts)', () => {
      renderSession(['e4']);

      fireEvent.click(screen.getByTestId('stub-submit'));
      fireEvent.click(screen.getByTestId('stub-submit'));

      fireEvent.click(screen.getByTestId('view-result-link'));

      const parsed = JSON.parse(sessionStorage.getItem(`puzzle_result_${POSITION_ID}`)!);
      expect(parsed.attempts).toEqual([
        { move: 'Nf3', isCorrect: false },
        { move: 'Nf3', isCorrect: false },
      ]);
    });

    it('accepts a different correct move from a multi-solution puzzle and records the matching solution line', () => {
      vi.useFakeTimers();
      try {
        renderSession(['e4 e5', 'Nf3 d5']);

        (screen.getByTestId('stub-custom-move-value') as HTMLInputElement).value = 'Nf3';
        fireEvent.click(screen.getByTestId('stub-custom-submit'));

        act(() => {
          vi.advanceTimersByTime(1000);
        });

        const parsed = JSON.parse(sessionStorage.getItem(`puzzle_result_${POSITION_ID}`)!);
        expect(parsed.solutionLine).toBe('Nf3 d5');
        expect(parsed.attempts).toEqual([{ move: 'Nf3', isCorrect: true }]);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  // Regression guard for the black-to-move matcher bug where the session
  // client used `getPlayerMovesFromSequence(moves, 'b')` from chess-core. That
  // helper is a PGN utility that assumes index 0 is always a white move, so
  // for a black-to-move puzzle solution stored as `['h5', 'Nh2', 'Bg3']` it
  // returned `['Nh2']` and rejected the correct first move `h5` as invalid.
  //
  // Puzzle solutions always begin with the player's move, so player slots are
  // at indices 0, 2, 4, … regardless of which side the puzzle is set up for.
  describe('black-to-move puzzle', () => {
    // Real puzzle surfaced by a user: 276e36fb-9d43-4e6c-80f1-98ec47d1ac17
    const BLACK_TO_MOVE_FEN =
      'r2q1rk1/2pb1ppn/pp1p3p/6b1/2P1P1N1/1P1P3P/PB1N1RP1/R2Q2K1 b - - 4 16';

    it("accepts the black player's first move `h5` as correct", () => {
      renderSession(['h5 Nh2 Bg3'], BLACK_TO_MOVE_FEN);

      (screen.getByTestId('stub-custom-move-value') as HTMLInputElement).value = 'h5';
      fireEvent.click(screen.getByTestId('stub-custom-submit'));

      expect(screen.queryByTestId('panel-error')).not.toBeInTheDocument();
    });

    it("rejects the opponent's SAN `Nh2` when submitted as the first player move", () => {
      renderSession(['h5 Nh2 Bg3'], BLACK_TO_MOVE_FEN);

      (screen.getByTestId('stub-custom-move-value') as HTMLInputElement).value = 'Nh2';
      fireEvent.click(screen.getByTestId('stub-custom-submit'));

      expect(screen.getByTestId('panel-error')).toBeInTheDocument();
    });

    it('solves a single-move black-to-move puzzle and records the payload with the black-side FEN', () => {
      // Single-move variant: black plays `h5`, puzzle complete. This isolates
      // the regression (matcher accepts index 0 as the player's move for a
      // black-to-move puzzle) from any board-legality concerns on deeper
      // plies, which are exercised separately by the first case above.
      vi.useFakeTimers();
      try {
        renderSession(['h5'], BLACK_TO_MOVE_FEN);

        (screen.getByTestId('stub-custom-move-value') as HTMLInputElement).value = 'h5';
        fireEvent.click(screen.getByTestId('stub-custom-submit'));

        act(() => {
          vi.advanceTimersByTime(1000);
        });

        expect(mockPush).toHaveBeenCalledWith(`/practice/puzzle/${POSITION_ID}/result`);

        const parsed = JSON.parse(sessionStorage.getItem(`puzzle_result_${POSITION_ID}`)!);
        expect(parsed.solutionLine).toBe('h5');
        expect(parsed.attempts).toEqual([{ move: 'h5', isCorrect: true }]);
        expect(parsed.fen).toBe(BLACK_TO_MOVE_FEN);
      } finally {
        vi.useRealTimers();
      }
    });

    it('auto-plays the white opponent reply after the black player move in a multi-move line', () => {
      // Black plays h5, opponent reply Nh2 is auto-played, puzzle continues.
      // This exercises the interleave fix in the opponent-reply logic
      // (`justPlayedSanIndex = (playerMoveCount - 1) * 2` instead of the
      // `playerColor === 'w' ? 0 : 1` branch), verifying the opponent SAN at
      // index 1 is the one that gets fed into executeMove.
      renderSession(['h5 Nh2'], BLACK_TO_MOVE_FEN);

      (screen.getByTestId('stub-custom-move-value') as HTMLInputElement).value = 'h5';
      fireEvent.click(screen.getByTestId('stub-custom-submit'));

      // After the player's one and only move, the puzzle should now be solved
      // (the opponent reply auto-plays, but there are no more player slots).
      expect(screen.queryByTestId('panel-error')).not.toBeInTheDocument();
      expect(screen.getByTestId('move-input-panel')).toHaveAttribute('data-disabled', 'true');
    });
  });

  // Opponent status surfaced via the PageTitle — mirrors the `aiPlayed`
  // pattern from `games/play/_components/PlayPageClient.tsx`, which swaps
  // its `<PageTitle>` content between the default heading and transient
  // "AI played X" announcements. For puzzles the PageTitle carries the
  // puzzle's title by default and switches to "⚪ White plays Nh2" while
  // the opponent reply is the freshest context, reverting to the title
  // once `isSolved` flips so the "Correct!" confirmation takes focus.
  describe('opponent status in PageTitle', () => {
    const BLACK_TO_MOVE_FEN =
      'r2q1rk1/2pb1ppn/pp1p3p/6b1/2P1P1N1/1P1P3P/PB1N1RP1/R2Q2K1 b - - 4 16';

    it('renders the puzzle title in the PageTitle before any player move', () => {
      renderSession(['h5 Nh2']);

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent(POSITION_TITLE);
      // The opponent-status span only appears after the first opponent
      // auto-play, so the `data-testid` hook used by the other assertions
      // in this block must be absent here.
      expect(screen.queryByTestId('opponent-status')).not.toBeInTheDocument();
    });

    it('swaps the PageTitle to `"White plays Nh2"` after the black player plays `h5`', () => {
      // 3-token line so the second player slot (index 2 = Bh4) still
      // exists after Nh2 auto-plays — keeps `isSolved=false` so the
      // opponent-status branch renders. `Bh4` is a legal follow-up from
      // the chess.js repro the fix block already covers; the stub matcher
      // doesn't need to execute it, so its legality is incidental.
      renderSession(['h5 Nh2 Bh4'], BLACK_TO_MOVE_FEN);

      (screen.getByTestId('stub-custom-move-value') as HTMLInputElement).value = 'h5';
      fireEvent.click(screen.getByTestId('stub-custom-submit'));

      const heading = screen.getByRole('heading', { level: 1 });
      // next-intl mock returns key names, so `t('whitePlayed', {move})`
      // comes back as the literal key "whitePlayed".
      expect(heading).toHaveTextContent('whitePlayed');
      expect(screen.getByTestId('opponent-status')).toBeInTheDocument();
      // Puzzle title is suppressed while the opponent-status slot is active.
      expect(heading).not.toHaveTextContent(POSITION_TITLE);
    });

    it('appends progress `(done/total)` to the opponent status after a correct player move', () => {
      // The puzzle session is unique vs games/play in that the opponent
      // reply lands instantly with no perceivable latency — so the user
      // can lose track of how far through the puzzle they are. Surfacing
      // the (done/total) counter alongside the opponent status gives
      // explicit progress without having to count moves themselves.
      renderSession(['h5 Nh2 Bh4'], BLACK_TO_MOVE_FEN);

      (screen.getByTestId('stub-custom-move-value') as HTMLInputElement).value = 'h5';
      fireEvent.click(screen.getByTestId('stub-custom-submit'));

      // 1 of 2 player slots solved (the puzzle has 2 player moves: h5 and Bh4).
      expect(screen.getByTestId('opponent-progress')).toHaveTextContent('(1/2)');
    });

    it('marks the opponent status text with the title-highlight animation class', () => {
      // The animation class is gated on `motion-safe:` so users who set
      // `prefers-reduced-motion` see no animation. Asserting the class
      // presence is enough — the actual one-shot animation behaviour is a
      // CSS detail tested by the keyframe definition in globals.css.
      renderSession(['h5 Nh2 Bh4'], BLACK_TO_MOVE_FEN);

      (screen.getByTestId('stub-custom-move-value') as HTMLInputElement).value = 'h5';
      fireEvent.click(screen.getByTestId('stub-custom-submit'));

      expect(screen.getByTestId('opponent-status-text').className).toContain(
        'motion-safe:animate-title-highlight'
      );
    });

    it('swaps the PageTitle to the Loading... placeholder once the puzzle is solved and navigation starts', () => {
      // 2-token line: h5 is the only player slot, so submitting it flips
      // `isSolved` to true AND kicks off `finishSolve`, which sets
      // `isNavigatingToResult` before the 1s auto-navigate. In that window
      // the PageTitle should render the loading placeholder (mirroring the
      // `isInitializing → t('loading')` branch in games/play) — not the
      // opponent-status slot and not the puzzle title.
      renderSession(['h5 Nh2'], BLACK_TO_MOVE_FEN);

      (screen.getByTestId('stub-custom-move-value') as HTMLInputElement).value = 'h5';
      fireEvent.click(screen.getByTestId('stub-custom-submit'));

      const heading = screen.getByRole('heading', { level: 1 });
      // `useTranslations('play')` is mocked to return the key verbatim, so
      // `tPlay('loading')` comes back as the literal `'loading'`.
      expect(heading).toHaveTextContent('loading');
      expect(screen.queryByTestId('opponent-status')).not.toBeInTheDocument();
      expect(screen.getByTestId('loading-title')).toBeInTheDocument();
      expect(heading).not.toHaveTextContent(POSITION_TITLE);
    });
  });

  // ---------------------------------------------------------------------------
  // Submit feedback
  //
  // Typed/selected input rides the panel's own recall-style feedback (red ring
  // + inline `panel-error` message on a miss). The final correct move pops a
  // celebratory "Correct! 🎉" chip; board drag/clicks flash their chip over the
  // board. All of it auto-dismisses after ~1.2s.
  // ---------------------------------------------------------------------------
  describe('submit feedback', () => {
    it('shows no feedback before any submit', () => {
      renderSession(['Nf3']);
      expect(screen.queryByTestId('panel-error')).not.toBeInTheDocument();
      expect(screen.queryByTestId('submit-feedback-solved')).not.toBeInTheDocument();
    });

    it('pops the celebratory solved chip (not the incorrect chip) on the final correct submit', () => {
      // Intermediate correct moves still show no chip (the PageTitle's
      // opponent-status highlight is the signal there), but the FINAL move —
      // which otherwise leaves the screen looking frozen during the ~1s before
      // the result page loads — gets a "Correct! 🎉" chip.
      renderSession(['Nf3']);

      fireEvent.click(screen.getByTestId('stub-submit'));

      expect(screen.getByTestId('submit-feedback-solved')).toBeInTheDocument();
      expect(screen.queryByTestId('submit-feedback-incorrect')).not.toBeInTheDocument();
    });

    it('flashes a correct chip over the board on an intermediate correct board move, clearing it as the opponent replies', () => {
      vi.useFakeTimers();
      try {
        // Two player slots: the stub board move ('e4') is correct but not the
        // solve, so the board gets the plain "correct" chip while the reply pends.
        renderSession(['e4 e5 Nf3']);

        act(() => {
          fireEvent.click(screen.getByTestId('stub-board-move'));
        });

        expect(screen.getByTestId('submit-feedback-correct-board')).toBeInTheDocument();
        // It is not the celebratory solved chip, and it stays off the input panel.
        expect(screen.queryByTestId('submit-feedback-solved-board')).not.toBeInTheDocument();

        act(() => {
          vi.advanceTimersByTime(1000);
        });

        // The chip clears as the opponent's reply lands on the board.
        expect(screen.queryByTestId('submit-feedback-correct-board')).not.toBeInTheDocument();
      } finally {
        vi.useRealTimers();
      }
    });

    it('routes the solved chip to the board when the final move was a board drag/click', () => {
      // Board-sourced solve: the celebration lands over the board, matching
      // where the incorrect chip goes for a wrong board move.
      renderSession(['e4']); // stub-board-move submits 'e4' → the solving move

      fireEvent.click(screen.getByTestId('stub-board-move'));

      expect(screen.getByTestId('submit-feedback-solved-board')).toBeInTheDocument();
      expect(screen.queryByTestId('submit-feedback-solved')).not.toBeInTheDocument();
    });

    it('surfaces the panel feedback after an incorrect submit', () => {
      renderSession(['Nf3']);

      (screen.getByTestId('stub-custom-move-value') as HTMLInputElement).value = 'e4';
      fireEvent.click(screen.getByTestId('stub-custom-submit'));

      expect(screen.getByTestId('panel-error')).toBeInTheDocument();
    });

    it('clears the stale incorrect feedback immediately on the next correct submit', () => {
      // Sequence: wrong → panel feedback appears → correct → it is cleared even
      // before the auto-clear timer would have fired. Without this explicit
      // clear, a red "Incorrect" ring would briefly linger alongside an
      // already-accepted move, which would lie to the user.
      renderSession(['Nf3']);

      (screen.getByTestId('stub-custom-move-value') as HTMLInputElement).value = 'e4';
      fireEvent.click(screen.getByTestId('stub-custom-submit'));
      expect(screen.getByTestId('panel-error')).toBeInTheDocument();

      (screen.getByTestId('stub-custom-move-value') as HTMLInputElement).value = 'Nf3';
      fireEvent.click(screen.getByTestId('stub-custom-submit'));

      expect(screen.queryByTestId('panel-error')).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Lenient SAN matching
  //
  // The puzzle session feeds the user's input through chess.js and matches
  // against the canonical SAN it returns, NOT against the user's literal
  // string. This means decorative marks (`x`, `+`, `#`) can be omitted when
  // chess.js can still uniquely determine the move from the position. End
  // users should not have to type `Qxe6+` to solve a puzzle whose stored
  // solution is `Qxe6+` — `Qe6` works because chess.js normalizes it.
  // ---------------------------------------------------------------------------
  describe('lenient SAN matching', () => {
    // White Q on f5, black bishop on e6, black king on e8: Qxe6+ is a legal
    // capture-with-check. Plenty of legal alternatives exist (Qxe6+ is not
    // forced) so chess.js's lenient parser cannot pick this move ambiguously
    // from a partial input — any acceptance must be because the canonical
    // SAN of the user's input happens to be `Qxe6+`.
    const CAPTURE_CHECK_FEN = '4k3/8/4b3/5Q2/8/8/8/4K3 w - - 0 1';

    function setCustomInputAndSubmit(value: string) {
      (screen.getByTestId('stub-custom-move-value') as HTMLInputElement).value = value;
      fireEvent.click(screen.getByTestId('stub-custom-submit'));
    }

    it('accepts the move when the user omits the capture mark `x` (Qe6+ for Qxe6+)', () => {
      renderSession(['Qxe6+'], CAPTURE_CHECK_FEN);
      setCustomInputAndSubmit('Qe6+');
      expect(screen.queryByTestId('panel-error')).not.toBeInTheDocument();
      expect(screen.getByTestId('move-input-panel')).toHaveAttribute('data-disabled', 'true');
    });

    it('accepts the move when the user omits the check mark `+` (Qxe6 for Qxe6+)', () => {
      renderSession(['Qxe6+'], CAPTURE_CHECK_FEN);
      setCustomInputAndSubmit('Qxe6');
      expect(screen.queryByTestId('panel-error')).not.toBeInTheDocument();
      expect(screen.getByTestId('move-input-panel')).toHaveAttribute('data-disabled', 'true');
    });

    it('accepts the move when the user omits both `x` and `+` (Qe6 for Qxe6+)', () => {
      renderSession(['Qxe6+'], CAPTURE_CHECK_FEN);
      setCustomInputAndSubmit('Qe6');
      expect(screen.queryByTestId('panel-error')).not.toBeInTheDocument();
      expect(screen.getByTestId('move-input-panel')).toHaveAttribute('data-disabled', 'true');
    });

    it("preserves the user's raw input in the recorded attempt even when it differs from the canonical SAN", () => {
      // The result page lists the SAN the user actually typed; correctness
      // is judged on the canonical SAN but display semantics show input.
      renderSession(['Qxe6+'], CAPTURE_CHECK_FEN);
      setCustomInputAndSubmit('Qe6');

      const parsed = JSON.parse(sessionStorage.getItem(`puzzle_result_${POSITION_ID}`)!);
      expect(parsed.attempts).toEqual([{ move: 'Qe6', isCorrect: true }]);
      // Solution line in storage is still the canonical form from the DB.
      expect(parsed.solutionLine).toBe('Qxe6+');
    });

    it('rejects an illegal move outright (cannot be normalized into the solution)', () => {
      // From the starting position, the white knight on b1 cannot reach e5.
      // chess.js rejects the input, so the attempt records as incorrect
      // without any normalization shenanigans.
      renderSession(['Nf3']);
      setCustomInputAndSubmit('Ne5');
      expect(screen.getByTestId('panel-error')).toBeInTheDocument();
      expect(screen.getByTestId('move-input-panel')).toHaveAttribute('data-disabled', 'false');
    });

    it("rejects a legal move that does not match the solution's canonical SAN", () => {
      // From the starting position, e4 and Nf3 are both legal. The puzzle
      // solution accepts only Nf3, so chess.js accepts e4 (canonical=`e4`)
      // but the canonical SAN does not equal the solution `Nf3` and the
      // attempt is incorrect.
      renderSession(['Nf3']);
      setCustomInputAndSubmit('e4');
      expect(screen.getByTestId('panel-error')).toBeInTheDocument();
    });

    it('still accepts the move when the user types the strict, fully-decorated SAN', () => {
      // Regression guard: the lenient path must not bounce strict input.
      renderSession(['Qxe6+'], CAPTURE_CHECK_FEN);
      setCustomInputAndSubmit('Qxe6+');
      expect(screen.queryByTestId('panel-error')).not.toBeInTheDocument();
      expect(screen.getByTestId('move-input-panel')).toHaveAttribute('data-disabled', 'true');
    });

    // -------------------------------------------------------------------------
    // Solution SAN canonicalization
    //
    // The earlier fix only canonicalized the user's input but compared
    // against the raw stored solution SAN. That broke any puzzle whose
    // stored SAN is missing decorations chess.js would insert (most often
    // `+` for check). The fix runs both sides through chess.js so the
    // comparison is symmetric. The FEN below is the actual position from
    // the bug report (puzzle d4f46cc3-…), where the stored solution is
    // `Rxd8` but chess.js canonicalizes the same move to `Rxd8+` because
    // the rook capture also delivers check.
    // -------------------------------------------------------------------------
    const UNDECORATED_SOLUTION_FEN = '2rr2k1/n1pR1pp1/1p2p2p/pP1bP3/P7/5N2/1BP3PP/3R2K1 w - - 3 21';

    it('accepts the user input when the stored solution SAN is missing the check mark', () => {
      // Stored solution is `Rxd8` (no `+`); chess.js canonical is `Rxd8+`.
      // User typing the literal stored string must still be accepted.
      renderSession(['Rxd8'], UNDECORATED_SOLUTION_FEN);
      setCustomInputAndSubmit('Rxd8');
      expect(screen.queryByTestId('panel-error')).not.toBeInTheDocument();
      // Single-move solution → solved immediately.
      expect(screen.getByTestId('move-input-panel')).toHaveAttribute('data-disabled', 'true');
    });

    it('accepts the user input when both sides are missing different decorations', () => {
      // Stored solution `Rxd8` (no `+`), user input `Rd8` (no `x`, no `+`):
      // both canonicalize to `Rxd8+` against the position, so they match.
      renderSession(['Rxd8'], UNDECORATED_SOLUTION_FEN);
      setCustomInputAndSubmit('Rd8');
      expect(screen.queryByTestId('panel-error')).not.toBeInTheDocument();
      expect(screen.getByTestId('move-input-panel')).toHaveAttribute('data-disabled', 'true');
    });
  });

  // ---------------------------------------------------------------------------
  // EXP-grant Server Action wiring
  //
  // The session component fires `savePuzzleResult` on solve and, if the action
  // resolves with an `expEventId` before the auto-navigate timer fires, appends
  // it to the `/result` URL as a `?grant=<id>` query param. The result page
  // uses that param to refetch the granted EXP and surface the gain banner.
  // ---------------------------------------------------------------------------
  describe('EXP grant', () => {
    /**
     * Wait for queued microtasks to drain. With fake timers, advancing the
     * timer triggers the auto-navigate callback, but the closure-captured
     * `expEventId` is set by the savePuzzleResult promise's `.then`, which is
     * a microtask. Awaiting `Promise.resolve()` once flushes the microtask
     * queue so the assignment lands before the timer runs.
     */
    async function flushMicrotasks() {
      await act(async () => {});
    }

    it('appends ?grant=<id> to the result URL when the action resolves with an expEventId before the auto-navigate timer', async () => {
      mockSavePuzzleResult.mockResolvedValueOnce({
        success: true,
        expEventId: 'evt-puzzle-abc',
      });

      vi.useFakeTimers();
      try {
        renderSession(['Nf3']);

        await act(async () => {
          fireEvent.click(screen.getByTestId('stub-submit'));
        });
        // Drain the savePuzzleResult `.then` microtask so the closure-captured
        // expEventId is set before the auto-navigate timer fires.
        await flushMicrotasks();

        act(() => {
          vi.advanceTimersByTime(1000);
        });

        expect(mockPush).toHaveBeenCalledWith(
          `/practice/puzzle/${POSITION_ID}/result?grant=evt-puzzle-abc`
        );
      } finally {
        vi.useRealTimers();
      }
    });

    it('navigates without ?grant= when the action returns success but no expEventId (e.g., guest user)', async () => {
      mockSavePuzzleResult.mockResolvedValueOnce({ success: true });

      vi.useFakeTimers();
      try {
        renderSession(['Nf3']);

        await act(async () => {
          fireEvent.click(screen.getByTestId('stub-submit'));
        });
        await flushMicrotasks();

        act(() => {
          vi.advanceTimersByTime(1000);
        });

        expect(mockPush).toHaveBeenCalledWith(`/practice/puzzle/${POSITION_ID}/result`);
        expect(mockPush).not.toHaveBeenCalledWith(expect.stringContaining('grant='));
      } finally {
        vi.useRealTimers();
      }
    });

    it('navigates without ?grant= when the action rejects (Sentry-logged failure)', async () => {
      mockSavePuzzleResult.mockRejectedValueOnce(new Error('db_down'));

      vi.useFakeTimers();
      try {
        renderSession(['Nf3']);

        await act(async () => {
          fireEvent.click(screen.getByTestId('stub-submit'));
        });
        await flushMicrotasks();

        act(() => {
          vi.advanceTimersByTime(1000);
        });

        expect(mockPush).toHaveBeenCalledWith(`/practice/puzzle/${POSITION_ID}/result`);
      } finally {
        vi.useRealTimers();
      }
    });

    it('passes incorrectAttempts (count of wrong submits before solve) and peekCount to savePuzzleResult', async () => {
      // Solution accepts 'Nf3'. The stub-submit button always submits 'Nf3',
      // so we can not generate wrong submits with it; use a multi-solution
      // line where a wrong move can be submitted via the custom-submit path
      // before the correct one.
      vi.useFakeTimers();
      try {
        renderSession(['Nf3']);

        const peekButton = screen.getByRole('button', { name: 'showBoard' });
        fireEvent.click(peekButton);
        fireEvent.click(peekButton);

        // One wrong submit, then the correct one.
        (screen.getByTestId('stub-custom-move-value') as HTMLInputElement).value = 'e4';
        await act(async () => {
          fireEvent.click(screen.getByTestId('stub-custom-submit'));
        });

        (screen.getByTestId('stub-custom-move-value') as HTMLInputElement).value = 'Nf3';
        await act(async () => {
          fireEvent.click(screen.getByTestId('stub-custom-submit'));
        });

        expect(mockSavePuzzleResult).toHaveBeenCalledTimes(1);
        expect(mockSavePuzzleResult).toHaveBeenCalledWith({
          playerMoveCount: 1,
          incorrectAttempts: 1,
          peekCount: 2,
        });
      } finally {
        vi.useRealTimers();
      }
    });

    it('does NOT invoke savePuzzleResult when the user bails out via "view result" without solving', async () => {
      renderSession(['e4']); // wrong submit since stub submits Nf3

      // One incorrect submit
      fireEvent.click(screen.getByTestId('stub-submit'));
      // Bail out via the view-result link
      fireEvent.click(screen.getByTestId('view-result-link'));

      expect(mockSavePuzzleResult).not.toHaveBeenCalled();
    });

    it('invokes savePuzzleResult at most once even if the solve commit re-runs', async () => {
      vi.useFakeTimers();
      try {
        renderSession(['Nf3']);

        await act(async () => {
          fireEvent.click(screen.getByTestId('stub-submit'));
        });
        // Second click after solve — disabled MoveInputPanel still allows the
        // stub to invoke onSubmit, but the session is locked (`isSolved`).
        await act(async () => {
          fireEvent.click(screen.getByTestId('stub-submit'));
        });

        expect(mockSavePuzzleResult).toHaveBeenCalledTimes(1);
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
