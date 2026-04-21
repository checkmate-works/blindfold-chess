import type { AlgebraicNotation } from '@blindfold-chess/types';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PuzzleAnswerForm } from './PuzzleAnswerForm';

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

// `useGamePreferences` reads from context + localStorage. Provide a minimal
// stub covering the fields the form actually consumes.
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

// `PuzzleBoardPeekModal` pulls in `ChessBoard`, which isn't relevant here.
vi.mock('./PuzzleBoardPeekModal', () => ({
  PuzzleBoardPeekModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="peek-modal" /> : null,
}));

// Stub `MoveInputPanel` with a harness that exposes:
//   - the `disabled` prop via `data-disabled`
//   - the current `moveInput` prop via `data-move-input` (lets tests assert
//     whether the parent cleared the input buffer after submit)
//   - a "seed" button that calls `onMoveInputChange('Nf3')` so tests can
//     simulate the user having typed a move before submitting
//   - a stub "submit" button that calls `onSubmit('Nf3')` to simulate a
//     user-entered move without depending on the inner input UIs.
// Tests can swap what gets submitted per-test by re-mocking, but all tests
// here use a single move (`Nf3`) and the solution set is controlled per-test.
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
      {/**
       * Free-form move submitter: tests set the desired move text via the
       * adjacent hidden input (`stub-custom-move-value`), then click
       * `stub-custom-submit` to invoke `onSubmit` with that exact string.
       * Lets us cover empty / whitespace-padded / arbitrary-SAN cases
       * without proliferating per-move mock buttons.
       */}
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

// FEN with white to move (any legal-looking FEN suffices — the form only
// reads side-to-move via `isBlackToMoveFromFen`).
const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const POSITION_ID = 'puzzle-123';

function renderForm(solutions: string[] = ['Nf3']) {
  return render(
    <PuzzleAnswerForm solutions={solutions} positionId={POSITION_ID} fen={STARTING_FEN} />
  );
}

beforeEach(() => {
  mockPush.mockReset();
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe('PuzzleAnswerForm', () => {
  describe('correct answer', () => {
    it('navigates to the result page ~1s after a correct submit', () => {
      vi.useFakeTimers();
      try {
        renderForm(['Nf3']);

        fireEvent.click(screen.getByTestId('stub-submit'));

        // Push is deferred by ~1s to let the success feedback show.
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
      renderForm(['Nf3 Nc6']);

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

    it('disables the input panel after a correct submit', () => {
      renderForm(['Nf3']);

      fireEvent.click(screen.getByTestId('stub-submit'));

      expect(screen.getByTestId('move-input-panel')).toHaveAttribute('data-disabled', 'true');
    });

    it('clears the moveInput buffer on a correct submit', () => {
      renderForm(['Nf3']);

      // Seed the input buffer as if the user had typed `Nf3`.
      fireEvent.click(screen.getByTestId('stub-seed'));
      expect(screen.getByTestId('move-input-panel')).toHaveAttribute('data-move-input', 'Nf3');

      fireEvent.click(screen.getByTestId('stub-submit'));

      expect(screen.getByTestId('move-input-panel')).toHaveAttribute('data-move-input', '');
    });
  });

  describe('incorrect answer', () => {
    it('records the attempt and surfaces the incorrect-move message', () => {
      // Solution is something other than 'Nf3', so our stub-submit is wrong.
      renderForm(['e4']);

      fireEvent.click(screen.getByTestId('stub-submit'));

      expect(screen.getByTestId('panel-error')).toHaveTextContent('incorrect');
      // Input remains enabled so the user can try again.
      expect(screen.getByTestId('move-input-panel')).toHaveAttribute('data-disabled', 'false');
      // "View result" link is available once the user has at least one
      // incorrect attempt.
      expect(screen.getByTestId('view-result-link')).toBeInTheDocument();
    });

    it('preserves the moveInput buffer on an incorrect submit so the user can edit their prior attempt', () => {
      // Solution is something other than 'Nf3', so our stub-submit is wrong.
      renderForm(['e4']);

      // Seed the input buffer as if the user had typed `Nf3`.
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
      renderForm(['Nf3']);

      // Peek twice before answering.
      const peekButton = screen.getByRole('button', { name: 'showBoard' });
      fireEvent.click(peekButton);
      // The modal's onClose is driven by the form, so the peek count stays
      // at 2 regardless of modal open/close toggling.
      fireEvent.click(peekButton);

      // Correct answer
      fireEvent.click(screen.getByTestId('stub-submit'));

      const parsed = JSON.parse(sessionStorage.getItem(`puzzle_result_${POSITION_ID}`)!);
      expect(parsed.peekCount).toBe(2);
    });

    it('persists peekCount to sessionStorage when the user bails out via the "view result" link after incorrect attempts', () => {
      // Solution is something other than 'Nf3', so the stub-submit is wrong
      // and the "view result" link is revealed.
      renderForm(['e4']);

      // Peek once before answering.
      const peekButton = screen.getByRole('button', { name: 'showBoard' });
      fireEvent.click(peekButton);

      // Incorrect answer → surfaces the "view result" link.
      fireEvent.click(screen.getByTestId('stub-submit'));

      // Click the link — the Link mock fires its `onClick` synchronously, and
      // the form's `onClick` handler writes the interim result payload
      // (including the peekCount collected so far) to sessionStorage.
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
      renderForm(['e4']);

      // Trigger an incorrect attempt so the panel error is surfaced.
      fireEvent.click(screen.getByTestId('stub-submit'));
      expect(screen.getByTestId('panel-error')).toHaveTextContent('incorrect');

      // Simulate the MoveInputPanel telling the form to clear the error
      // (this is what happens on any subsequent keystroke / mode change).
      fireEvent.click(screen.getByTestId('stub-clear-error'));

      // The error message should disappear because `result` was reset to null.
      expect(screen.queryByTestId('panel-error')).not.toBeInTheDocument();
    });

    it('ignores onErrorClear before any incorrect attempt (no-op when result is null)', () => {
      renderForm(['Nf3']);

      // Fire the panel's onErrorClear without any prior submission. This
      // must not crash and must not surface any unexpected UI changes.
      fireEvent.click(screen.getByTestId('stub-clear-error'));

      expect(screen.queryByTestId('panel-error')).not.toBeInTheDocument();
      // View-result link should still be hidden since no attempts were made.
      expect(screen.queryByTestId('view-result-link')).not.toBeInTheDocument();
    });
  });

  describe('edge-case submissions', () => {
    it('treats a whitespace-only submit as a no-op (no attempt recorded, no error surfaced)', () => {
      renderForm(['Nf3']);

      // Set the custom submitter to whitespace-only and fire it.
      (screen.getByTestId('stub-custom-move-value') as HTMLInputElement).value = '   ';
      fireEvent.click(screen.getByTestId('stub-custom-submit'));

      // `handleSubmit` early-returns false for empty input, so no attempt is
      // appended and `result` remains null → no "incorrect" panel error and
      // no "view result" link.
      expect(screen.queryByTestId('panel-error')).not.toBeInTheDocument();
      expect(screen.queryByTestId('view-result-link')).not.toBeInTheDocument();
    });

    it('treats the empty string as a no-op (no attempt recorded)', () => {
      renderForm(['Nf3']);

      (screen.getByTestId('stub-custom-move-value') as HTMLInputElement).value = '';
      fireEvent.click(screen.getByTestId('stub-custom-submit'));

      expect(screen.queryByTestId('panel-error')).not.toBeInTheDocument();
      expect(screen.queryByTestId('view-result-link')).not.toBeInTheDocument();
    });

    it('trims surrounding whitespace before comparing against the solution', () => {
      vi.useFakeTimers();
      try {
        renderForm(['Nf3']);

        // `  Nf3  ` must match the solution `Nf3` after trim.
        (screen.getByTestId('stub-custom-move-value') as HTMLInputElement).value = '  Nf3  ';
        fireEvent.click(screen.getByTestId('stub-custom-submit'));

        // Correct path → panel becomes disabled and the navigate timer starts.
        expect(screen.getByTestId('move-input-panel')).toHaveAttribute('data-disabled', 'true');

        act(() => {
          vi.advanceTimersByTime(1000);
        });
        expect(mockPush).toHaveBeenCalledWith(`/practice/puzzle/${POSITION_ID}/result`);

        // The stored attempt should record the trimmed move, not the
        // whitespace-padded one.
        const parsed = JSON.parse(sessionStorage.getItem(`puzzle_result_${POSITION_ID}`)!);
        expect(parsed.attempts).toEqual([{ move: 'Nf3', isCorrect: true }]);
      } finally {
        vi.useRealTimers();
      }
    });

    it('accumulates repeated incorrect attempts (same move submitted twice records two attempts)', () => {
      renderForm(['e4']);

      // Submit `Nf3` twice — both are incorrect for a solution of `e4`.
      fireEvent.click(screen.getByTestId('stub-submit'));
      fireEvent.click(screen.getByTestId('stub-submit'));

      // Click the "view result" link to flush attempts to sessionStorage.
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
        // Two independent solutions; user submits the second one.
        renderForm(['e4 e5', 'Nf3 d5']);

        (screen.getByTestId('stub-custom-move-value') as HTMLInputElement).value = 'Nf3';
        fireEvent.click(screen.getByTestId('stub-custom-submit'));

        act(() => {
          vi.advanceTimersByTime(1000);
        });

        const parsed = JSON.parse(sessionStorage.getItem(`puzzle_result_${POSITION_ID}`)!);
        // The solutionLine recorded must be the line whose first move matched,
        // not just `solutions[0]`.
        expect(parsed.solutionLine).toBe('Nf3 d5');
        expect(parsed.attempts).toEqual([{ move: 'Nf3', isCorrect: true }]);
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
