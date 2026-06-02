import type { AlgebraicNotation } from '@blindfold-chess/types';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { MoveInputPanel } from './MoveInputPanel';

// `useSafeTranslations` is used for the inline legal-moves hint etc. Return the
// key unchanged so the tests don't rely on real message bundles.
vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => (key: string) => key,
}));

// `getLegalMoves` is only invoked after a user opens the legal-moves hint,
// which these tests never trigger — stub it so we don't pull in `chess.js`.
vi.mock('@blindfold-chess/features/chess-core', () => ({
  getLegalMoves: () => [],
}));

// The inner input components each have their own dependency graph. Stub them
// with minimal placeholders so the only interactive control under test is
// the mode-switch button rendered directly by `MoveInputPanel`.
vi.mock('@/app/[locale]/(public)/games/play/_components/ButtonInput', () => ({
  ButtonInput: ({
    disabled,
    onSubmit,
  }: {
    disabled?: boolean;
    onSubmit?: (move: AlgebraicNotation) => void;
  }) => (
    <div data-testid="button-input" data-disabled={disabled ? 'true' : 'false'}>
      <button
        type="button"
        data-testid="stub-invalid-submit"
        onClick={() => onSubmit?.('??' as AlgebraicNotation)}
      >
        stub-submit
      </button>
    </div>
  ),
}));
vi.mock('@/app/[locale]/(public)/games/play/_components/MoveInput', () => ({
  MoveInput: ({ disabled }: { disabled?: boolean }) => (
    <div data-testid="move-input" data-disabled={disabled ? 'true' : 'false'} />
  ),
}));
vi.mock('@/app/[locale]/(public)/games/play/_components/MoveSelect', () => ({
  MoveSelect: ({ disabled }: { disabled?: boolean }) => (
    <div data-testid="move-select" data-disabled={disabled ? 'true' : 'false'} />
  ),
}));

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// Preferences with 2+ enabled modes so the mode-switch button renders.
const preferences: GamePreferences = {
  showCoordinates: true,
  highlightLastMove: true,
  boardTheme: 'monotone',
  showOwnPieces: true,
  showOpponentPieces: true,
  pieceShapeMode: 'normal',
  pieceColors: 'normal',
  moveInputMode: 'button',
  enabledMoveInputModes: ['button', 'text'],
  buttonInputPieceLabel: 'icon',
  enableAutoComplete: true,
  boardVisibility: 'peek',
};

const TOGGLE_TITLE = 'switchInputMode';

afterEach(() => {
  cleanup();
});

function renderPanel(disabled: boolean) {
  return render(
    <MoveInputPanel
      preferences={preferences}
      updatePreferences={() => {}}
      currentFen={STARTING_FEN}
      moveInput=""
      onMoveInputChange={() => {}}
      error={null}
      onErrorClear={() => {}}
      onSubmit={() => {}}
      disabled={disabled}
      toggleTitle={TOGGLE_TITLE}
    />
  );
}

describe('MoveInputPanel mode-switch button', () => {
  it('is disabled when disabled=true', () => {
    renderPanel(true);

    expect(screen.getByRole('button', { name: TOGGLE_TITLE })).toBeDisabled();
  });

  it('is enabled when disabled=false', () => {
    renderPanel(false);

    expect(screen.getByRole('button', { name: TOGGLE_TITLE })).not.toBeDisabled();
  });
});

describe('MoveInputPanel legal-moves hint', () => {
  /**
   * Render with `onSubmit` always returning `false` (invalid submission) so
   * the internal invalid-attempt counter reliably advances on each click of
   * the stubbed ButtonInput submit button. The `error` prop is kept non-null
   * because the hint only appears while an error is actively displayed.
   */
  function renderWithInvalidOnSubmit(showLegalMovesHint?: boolean) {
    return render(
      <MoveInputPanel
        preferences={preferences}
        updatePreferences={() => {}}
        currentFen={STARTING_FEN}
        moveInput=""
        onMoveInputChange={() => {}}
        error="invalid move"
        onErrorClear={() => {}}
        onSubmit={() => false}
        toggleTitle={TOGGLE_TITLE}
        showLegalMovesHint={showLegalMovesHint}
      />
    );
  }

  it('shows the "show legal moves" affordance after 3 invalid attempts by default', () => {
    renderWithInvalidOnSubmit();

    const submit = screen.getByTestId('stub-invalid-submit');
    fireEvent.click(submit);
    fireEvent.click(submit);
    fireEvent.click(submit);

    expect(screen.getByRole('button', { name: 'showLegalMoves' })).toBeInTheDocument();
  });

  it('does not show the "show legal moves" affordance when showLegalMovesHint={false}', () => {
    renderWithInvalidOnSubmit(false);

    const submit = screen.getByTestId('stub-invalid-submit');
    fireEvent.click(submit);
    fireEvent.click(submit);
    fireEvent.click(submit);

    expect(screen.queryByRole('button', { name: 'showLegalMoves' })).not.toBeInTheDocument();
  });

  it('does not show the "show legal moves" affordance before the 3rd invalid attempt (default props)', () => {
    // Threshold is `INVALID_ATTEMPTS_THRESHOLD === 3`; at 2 consecutive
    // invalid attempts the hint must still be suppressed. This guards the
    // boundary between "not yet frustrated" and "offer help" states.
    renderWithInvalidOnSubmit();

    const submit = screen.getByTestId('stub-invalid-submit');
    fireEvent.click(submit);
    fireEvent.click(submit);

    expect(screen.queryByRole('button', { name: 'showLegalMoves' })).not.toBeInTheDocument();
  });

  it('keeps the "show legal moves" affordance hidden even after many invalid attempts when showLegalMovesHint={false}', () => {
    // Regression guard for the puzzle surface: no matter how many times the
    // user submits an incorrect answer, the legal-move list must never
    // appear (it would effectively give the puzzle away).
    renderWithInvalidOnSubmit(false);

    const submit = screen.getByTestId('stub-invalid-submit');
    for (let i = 0; i < 10; i++) {
      fireEvent.click(submit);
    }

    expect(screen.queryByRole('button', { name: 'showLegalMoves' })).not.toBeInTheDocument();
    // The full legal-move list UI is also never rendered.
    expect(screen.queryByText('legalMovesList')).not.toBeInTheDocument();
  });
});
