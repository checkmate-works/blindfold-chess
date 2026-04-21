import type { AlgebraicNotation } from '@blindfold-chess/types';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import type { ConfirmationDialogs } from '../_hooks';
import { GameInProgressPanel } from './GameInProgressPanel';

// Stub next-intl so all translation keys resolve to the key itself — this
// makes `title` / `aria-label` values deterministic for role queries.
vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => (key: string) => key,
}));
vi.mock('@/i18n/routing', () => ({
  Link: ({ children, ...props }: { children: React.ReactNode }) => <a {...props}>{children}</a>,
}));

// `MoveInputPanel` is covered by its own test. Stub it with a minimal marker
// so we don't pull in chess.js / the full input graph.
vi.mock('@/app/[locale]/_components/MoveInputPanel', () => ({
  MoveInputPanel: ({ disabled }: { disabled?: boolean }) => (
    <div data-testid="move-input-panel" data-disabled={disabled ? 'true' : 'false'} />
  ),
}));

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function makeConfirmationDialogs(): ConfirmationDialogs {
  const makeDialog = () => ({
    isOpen: false,
    open: vi.fn(),
    close: vi.fn(),
    confirm: vi.fn(),
  });
  return {
    resign: makeDialog(),
    undo: makeDialog(),
    restart: {
      ...makeDialog(),
      position: null,
      openWithPosition: vi.fn(),
    },
  };
}

const preferences: GamePreferences = {
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
  showBoardButtonInGame: false,
  peekMode: 'modal',
};

type Overrides = {
  isPlayerTurn?: boolean;
  isLoading?: boolean;
  isAiThinking?: boolean;
  moves?: AlgebraicNotation[];
};

function renderPanel(overrides: Overrides = {}) {
  return render(
    <GameInProgressPanel
      isPlayerTurn={overrides.isPlayerTurn ?? true}
      isLoading={overrides.isLoading ?? false}
      isAiThinking={overrides.isAiThinking ?? false}
      preferences={preferences}
      updatePreferences={() => {}}
      currentFen={STARTING_FEN}
      moveInput=""
      setMoveInput={() => {}}
      error={null}
      onErrorClear={() => {}}
      handleSubmitMove={() => undefined}
      moves={overrides.moves ?? []}
      confirmationDialogs={makeConfirmationDialogs()}
      onShowBoard={() => {}}
      aiMoveError={null}
    />
  );
}

afterEach(() => {
  cleanup();
});

describe('GameInProgressPanel action bar', () => {
  describe('Undo button', () => {
    it('is disabled when isAiThinking=true, regardless of moves.length', () => {
      // 4 moves would normally enable Undo, but the AI-thinking predicate
      // takes precedence.
      renderPanel({
        isAiThinking: true,
        moves: ['e4', 'e5', 'Nf3', 'Nc6'] as AlgebraicNotation[],
      });

      expect(screen.getByRole('button', { name: 'undo' })).toBeDisabled();
    });

    it('is disabled when isAiThinking=true and moves.length < 2', () => {
      renderPanel({ isAiThinking: true, moves: [] });

      expect(screen.getByRole('button', { name: 'undo' })).toBeDisabled();
    });

    it('is enabled when isAiThinking=false and moves.length >= 2', () => {
      renderPanel({
        isAiThinking: false,
        moves: ['e4', 'e5'] as AlgebraicNotation[],
      });

      expect(screen.getByRole('button', { name: 'undo' })).not.toBeDisabled();
    });
  });

  describe('Resign button', () => {
    it('is disabled when isAiThinking=true', () => {
      renderPanel({ isAiThinking: true });

      expect(screen.getByRole('button', { name: 'resign' })).toBeDisabled();
    });

    it('is enabled when isAiThinking=false', () => {
      renderPanel({ isAiThinking: false });

      expect(screen.getByRole('button', { name: 'resign' })).not.toBeDisabled();
    });
  });
});
