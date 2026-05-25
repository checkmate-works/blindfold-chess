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
// tests can fire arbitrary updates without rendering the real form.
vi.mock('@/app/[locale]/(public)/preferences/_components/GameSettingsContent', () => ({
  GameSettingsContent: ({
    onSettingsChange,
  }: {
    onSettingsChange: (updates: Partial<GamePreferences>) => void;
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

describe('MidGameSettingsModal — peek-mode picker visibility', () => {
  it('shows the peek-mode picker when boardVisibility is "peek"', () => {
    renderModal({ preferences: { boardVisibility: 'peek' } });

    // The picker uses the Preferences.controls namespace; with the
    // namespace-stripping mock, button labels resolve to bare keys.
    expect(screen.getByText('controls.peekModes.modal')).toBeInTheDocument();
    expect(screen.getByText('controls.peekModes.inline')).toBeInTheDocument();
  });

  it('hides the peek-mode picker when boardVisibility is "always"', () => {
    renderModal({ preferences: { boardVisibility: 'always' } });

    expect(screen.queryByText('controls.peekModes.modal')).not.toBeInTheDocument();
    expect(screen.queryByText('controls.peekModes.inline')).not.toBeInTheDocument();
  });

  it('hides the peek-mode picker when boardVisibility is "never"', () => {
    renderModal({ preferences: { boardVisibility: 'never' } });

    expect(screen.queryByText('controls.peekModes.modal')).not.toBeInTheDocument();
    expect(screen.queryByText('controls.peekModes.inline')).not.toBeInTheDocument();
  });

  it('clicking a peek-mode button routes through onPerGamePrefChange', () => {
    const onPerGamePrefChange = vi.fn();
    renderModal({
      preferences: { boardVisibility: 'peek', peekMode: 'modal' },
      onPerGamePrefChange,
    });

    fireEvent.click(screen.getByText('controls.peekModes.inline'));
    expect(onPerGamePrefChange).toHaveBeenCalledWith('peekMode', 'inline');
  });
});
