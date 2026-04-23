import type { AlgebraicNotation } from '@blindfold-chess/types';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
    onClick?: () => void;
    children: React.ReactNode;
  }) => (
    <a data-testid="view-result-link" href={href} onClick={onClick}>
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
      showBoardButtonInGame: true,
      peekMode: 'modal',
    },
    isLoaded: true,
    isHydrated: true,
    updatePreferences: () => {},
    resetPreferences: () => {},
  }),
}));

vi.mock('./PuzzleBoardPeekModal', () => ({
  PuzzleBoardPeekModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="peek-modal" /> : null,
}));

vi.mock('@/app/[locale]/_components/MoveInputPanel', () => ({
  MoveInputPanel: ({
    disabled,
    onSubmit,
    error,
    moveInput,
    onMoveInputChange,
    onErrorClear,
  }: {
    disabled?: boolean;
    onSubmit: (move: AlgebraicNotation) => boolean | void | Promise<void>;
    error?: string | null;
    moveInput?: string;
    onMoveInputChange?: (value: string) => void;
    onErrorClear?: () => void;
  }) => (
    <div
      data-testid="move-input-panel"
      data-disabled={disabled ? 'true' : 'false'}
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
const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const POSITION_ID = 'puzzle-123';

function toSolutionMoves(line: string) {
  return line
    .split(/\s+/)
    .filter(Boolean)
    .map((san) => ({ san, note: null }));
}

function renderSession(solutions: string[] = ['Nf3'], fen: string = STARTING_FEN) {
  const solutionMoves = solutions.map(toSolutionMoves);
  return render(
    <PuzzleSessionClient solutions={solutionMoves} positionId={POSITION_ID} fen={fen} />
  );
}

beforeEach(() => {
  mockPush.mockReset();
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
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

  describe('incorrect answer', () => {
    it('records the attempt and surfaces the incorrect-move message', () => {
      renderSession(['e4']);

      fireEvent.click(screen.getByTestId('stub-submit'));

      expect(screen.getByTestId('panel-error')).toHaveTextContent('incorrect');
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
    it('clears the incorrect-move error when the user edits the input (onErrorClear)', () => {
      renderSession(['e4']);

      fireEvent.click(screen.getByTestId('stub-submit'));
      expect(screen.getByTestId('panel-error')).toHaveTextContent('incorrect');

      fireEvent.click(screen.getByTestId('stub-clear-error'));

      expect(screen.queryByTestId('panel-error')).not.toBeInTheDocument();
    });

    it('ignores onErrorClear before any incorrect attempt (no-op when error is null)', () => {
      renderSession(['Nf3']);

      fireEvent.click(screen.getByTestId('stub-clear-error'));

      expect(screen.queryByTestId('panel-error')).not.toBeInTheDocument();
      expect(screen.queryByTestId('view-result-link')).not.toBeInTheDocument();
    });
  });

  describe('edge-case submissions', () => {
    it('treats a whitespace-only submit as a no-op (no attempt recorded, no error surfaced)', () => {
      renderSession(['Nf3']);

      (screen.getByTestId('stub-custom-move-value') as HTMLInputElement).value = '   ';
      fireEvent.click(screen.getByTestId('stub-custom-submit'));

      expect(screen.queryByTestId('panel-error')).not.toBeInTheDocument();
      expect(screen.queryByTestId('view-result-link')).not.toBeInTheDocument();
    });

    it('treats the empty string as a no-op (no attempt recorded)', () => {
      renderSession(['Nf3']);

      (screen.getByTestId('stub-custom-move-value') as HTMLInputElement).value = '';
      fireEvent.click(screen.getByTestId('stub-custom-submit'));

      expect(screen.queryByTestId('panel-error')).not.toBeInTheDocument();
      expect(screen.queryByTestId('view-result-link')).not.toBeInTheDocument();
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

      expect(screen.getByTestId('panel-error')).toHaveTextContent('incorrect');
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

  // Opponent status line — displays `"White plays Nh2"` after the player's
  // correct move triggers an opponent auto-play, mirroring the `aiPlayed`
  // pattern in `games/play`. Before the fix, the auto-play was silent and
  // the user had no cue that the position had advanced.
  describe('opponent status line', () => {
    const BLACK_TO_MOVE_FEN =
      'r2q1rk1/2pb1ppn/pp1p3p/6b1/2P1P1N1/1P1P3P/PB1N1RP1/R2Q2K1 b - - 4 16';

    it('does not render the opponent status line before the player has made a move', () => {
      renderSession(['h5 Nh2']);

      // translation keys are returned verbatim by the next-intl mock
      expect(screen.queryByText(/whitePlayed|blackPlayed/)).not.toBeInTheDocument();
    });

    it('shows `"White plays Nh2"` after the black player plays `h5` and the white reply auto-runs', () => {
      // Two-plies-deep line: black plays h5 (index 0), white auto-plays Nh2
      // (index 1). After the first player submit, the status line should
      // announce the white reply; the puzzle is NOT yet solved because there
      // is still a player slot at index 2 (but the fixture only has 2 SAN
      // tokens, so the player slot count is 1 and the puzzle IS solved
      // after this move — the status line must still render before the
      // auto-navigation fires).
      //
      // We use a 3-token fixture ["h5", "Nh2", "_"] shape via a 2-token
      // line to keep the test focused: 2 SAN tokens means 1 player slot
      // (`h5`) and 1 opponent reply (`Nh2`). After h5, `isSolved` becomes
      // true and the component suppresses the status line to get out of
      // the way of the "Correct!" confirmation — matching the design
      // choice in the JSX guard `!isSolved`. So we need a 3-token fixture
      // where the auto-played opponent reply is followed by another player
      // slot, to observe the status line while isSolved is still false.
      renderSession(['h5 Nh2 Bh4'], BLACK_TO_MOVE_FEN);

      (screen.getByTestId('stub-custom-move-value') as HTMLInputElement).value = 'h5';
      fireEvent.click(screen.getByTestId('stub-custom-submit'));

      // status line uses next-intl's `t('whitePlayed', { move: 'Nh2' })`;
      // the mock returns the key name, so we assert on the key.
      expect(screen.getByRole('status')).toHaveTextContent('whitePlayed');
    });

    it('hides the opponent status line once the puzzle is solved', () => {
      // 2-token line: black plays h5 (only player slot), puzzle solves
      // immediately. Even though an opponent reply index (1=Nh2) exists
      // and auto-plays, `isSolved` becomes true, so the status line is
      // suppressed to give the "Correct!" confirmation the spotlight.
      renderSession(['h5 Nh2'], BLACK_TO_MOVE_FEN);

      (screen.getByTestId('stub-custom-move-value') as HTMLInputElement).value = 'h5';
      fireEvent.click(screen.getByTestId('stub-custom-submit'));

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });
});
