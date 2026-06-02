/**
 * Tests for `MidGameSettingsModal` covering the two non-trivial wirings:
 *
 *   1. The bridge from `GameSettingsContent`'s `onSettingsChange(Partial)`
 *      → per-key `onPerGamePrefChange(key, value)` calls. Non-per-game keys
 *      emitted by the child (none expected today, defensive against future
 *      widening) must be silently filtered out.
 *
 *   2. The peek-mode picker visibility gate — shown only when
 *      `preferences.boardVisibility === 'peek'`, hidden under 'always' and
 *      'never'.
 *
 * `GameSettingsContent` is stubbed so the test focuses on
 * `MidGameSettingsModal` and does not couple to the underlying form's own
 * implementation (which has its own piece-shape auto-reset effect, etc.).
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  GamePreferences,
  PerGamePreferences,
} from '@/app/[locale]/_contexts/GamePreferencesContext';

import { MidGameSettingsModal } from './MidGameSettingsModal';

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => (key: string) => key,
}));

vi.mock('@/app/[locale]/_components/Modal', () => ({
  Modal: ({
    isOpen,
    children,
  }: {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    maxWidth?: string;
  }) => (isOpen ? <div data-testid="modal">{children}</div> : null),
}));

// Stub GameSettingsContent: surface its onSettingsChange via a button so
// tests can fire arbitrary updates without rendering the real form. Also
// renders the `afterBoardVisibility` slot so the modal's peek-mode picker
// (which is injected via that slot) shows up in the test DOM.
vi.mock('@/app/[locale]/(public)/preferences/_components/GameSettingsContent', () => ({
  GameSettingsContent: ({
    onSettingsChange,
    afterBoardVisibility,
  }: {
    onSettingsChange: (updates: Partial<GamePreferences>) => void;
    afterBoardVisibility?: React.ReactNode;
  }) => (
    <div data-testid="game-settings-content">
      <button
        type="button"
        data-testid="stub-emit-show-own-pieces"
        onClick={() => onSettingsChange({ showOwnPieces: false })}
      >
        emit showOwnPieces=false
      </button>
      <button
        type="button"
        data-testid="stub-emit-piece-shape"
        onClick={() => onSettingsChange({ pieceShapeMode: 'circles-all' })}
      >
        emit pieceShapeMode
      </button>
      <button
        type="button"
        data-testid="stub-emit-multi"
        onClick={() =>
          onSettingsChange({
            highlightLastMove: false,
            pieceColors: 'white-only',
          })
        }
      >
        emit multi-key
      </button>
      <button
        type="button"
        data-testid="stub-emit-non-per-game"
        onClick={() =>
          // Non-per-game key — must be ignored by the modal's filter.
          onSettingsChange({ showCoordinates: false })
        }
      >
        emit non-per-game key
      </button>
      {afterBoardVisibility}
    </div>
  ),
}));

const PREFS: GamePreferences = {
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
  peekMode: 'modal',
};

function renderModal(overrides?: {
  preferences?: Partial<GamePreferences>;
  onPerGamePrefChange?: <K extends keyof PerGamePreferences>(
    key: K,
    value: PerGamePreferences[K]
  ) => void;
}) {
  const onPerGamePrefChange = overrides?.onPerGamePrefChange ?? vi.fn();
  const result = render(
    <MidGameSettingsModal
      isOpen
      onClose={() => {}}
      preferences={{ ...PREFS, ...overrides?.preferences }}
      onPerGamePrefChange={onPerGamePrefChange}
    />
  );
  return { ...result, onPerGamePrefChange };
}

afterEach(() => {
  cleanup();
});

describe('MidGameSettingsModal — onSettingsChange → onPerGamePrefChange routing', () => {
  it('routes single-key per-game updates to onPerGamePrefChange', () => {
    const onPerGamePrefChange = vi.fn();
    renderModal({ onPerGamePrefChange });

    fireEvent.click(screen.getByTestId('stub-emit-show-own-pieces'));
    expect(onPerGamePrefChange).toHaveBeenCalledWith('showOwnPieces', false);
  });

  it('routes enum-key updates correctly', () => {
    const onPerGamePrefChange = vi.fn();
    renderModal({ onPerGamePrefChange });

    fireEvent.click(screen.getByTestId('stub-emit-piece-shape'));
    expect(onPerGamePrefChange).toHaveBeenCalledWith('pieceShapeMode', 'circles-all');
  });

  it('routes multi-key updates as separate per-key calls', () => {
    const onPerGamePrefChange = vi.fn();
    renderModal({ onPerGamePrefChange });

    fireEvent.click(screen.getByTestId('stub-emit-multi'));

    expect(onPerGamePrefChange).toHaveBeenCalledTimes(2);
    expect(onPerGamePrefChange).toHaveBeenCalledWith('highlightLastMove', false);
    expect(onPerGamePrefChange).toHaveBeenCalledWith('pieceColors', 'white-only');
  });

  it('filters out non-per-game keys silently', () => {
    const onPerGamePrefChange = vi.fn();
    renderModal({ onPerGamePrefChange });

    fireEvent.click(screen.getByTestId('stub-emit-non-per-game'));
    expect(onPerGamePrefChange).not.toHaveBeenCalled();
  });
});
