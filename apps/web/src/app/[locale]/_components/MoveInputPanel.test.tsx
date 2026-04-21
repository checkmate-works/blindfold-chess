import { cleanup, render, screen } from '@testing-library/react';
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
  ButtonInput: ({ disabled }: { disabled?: boolean }) => (
    <div data-testid="button-input" data-disabled={disabled ? 'true' : 'false'} />
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
  showBoardButtonInGame: true,
  peekMode: 'modal',
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
