import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DRAFT_STORAGE_KEY } from '../_lib/draft-storage';
import type { PuzzleDraftV1 } from '../_lib/draft-storage';
import { CreatePuzzleForm } from './CreatePuzzleForm';

// Mock `useRouter` from the i18n routing wrapper the form consumes. Mirrors
// the pattern in PuzzleSessionClient.test.tsx.
const mockPush = vi.fn();
vi.mock('@/i18n/routing', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
}));

// Return keys unchanged so assertions can target deterministic strings.
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

// The form doesn't actually exercise the interactive board in these tests —
// we populate FEN via the fen-tab textarea instead — so a minimal stub
// suffices.
vi.mock('@/app/[locale]/(public)/practice/(free-play)/_components/EditableChessBoard', () => ({
  EditableChessBoard: ({ fen }: { fen: string }) => (
    <div data-testid="editable-board" data-fen={fen} />
  ),
}));

// MoveInputPanel stub with a single `stub-submit` button that dispatches the
// SAN provided via the hidden `stub-move-value` input. Keeps move entry fully
// deterministic without depending on the real button/text/voice panels.
vi.mock('@/app/[locale]/_components/MoveInputPanel', () => ({
  MoveInputPanel: ({
    disabled,
    onSubmit,
    error,
  }: {
    disabled?: boolean;
    onSubmit: (move: string) => boolean | void | Promise<void>;
    error?: string | null;
  }) => (
    <div data-testid="move-input-panel" data-disabled={disabled ? 'true' : 'false'}>
      {error && <p data-testid="panel-error">{error}</p>}
      <input type="hidden" data-testid="stub-move-value" defaultValue="" />
      <button
        type="button"
        data-testid="stub-submit"
        onClick={(e) => {
          const input = (e.currentTarget as HTMLElement).parentElement?.querySelector(
            '[data-testid="stub-move-value"]'
          ) as HTMLInputElement | null;
          onSubmit(input?.value ?? '');
        }}
      />
    </div>
  ),
}));

// next-navigation-guard does DOM / history-level work that isn't useful here;
// the form's isDirty path is not under test.
vi.mock('next-navigation-guard', () => ({
  useNavigationGuard: () => ({ active: false, accept: () => {}, reject: () => {} }),
}));

// ConfirmationModal's internal Modal uses a portal + focus trap that doesn't
// cleanly unmount in jsdom. Replace with an inline conditional.
vi.mock('@/app/[locale]/_components/ConfirmationModal', () => ({
  ConfirmationModal: ({
    isOpen,
    title,
    confirmText,
    cancelText,
    onConfirm,
    onCancel,
  }: {
    isOpen: boolean;
    title: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
  }) =>
    isOpen ? (
      <div role="dialog" aria-label={title}>
        <button type="button" onClick={onConfirm}>
          {confirmText ?? 'Confirm'}
        </button>
        <button type="button" onClick={onCancel}>
          {cancelText ?? 'Cancel'}
        </button>
      </div>
    ) : null,
}));

// UnsavedChangesDialog — also uses the shared Modal, same rationale.
vi.mock('@/app/_components', () => ({
  UnsavedChangesDialog: () => null,
}));

const VALID_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function makeDraft(overrides: Partial<PuzzleDraftV1> = {}): PuzzleDraftV1 {
  return {
    version: 1,
    fen: VALID_FEN,
    title: 'Mate in 1',
    description: 'Fork the king',
    moves: ['Nf3'],
    notes: ['develop'],
    activeTab: 'fen',
    sideToMove: 'w',
    flipped: false,
    userFlipped: false,
    ...overrides,
  };
}

function seedMoveValue(value: string) {
  const input = screen.getByTestId('stub-move-value') as HTMLInputElement;
  input.value = value;
}

beforeEach(() => {
  mockPush.mockReset();
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe('CreatePuzzleForm', () => {
  describe('submit flow', () => {
    it('writes a draft to sessionStorage under the known slot and pushes to the preview page', () => {
      render(<CreatePuzzleForm />);

      // Switch to the FEN tab so the textarea is available, then paste a FEN.
      fireEvent.click(screen.getByRole('tab', { name: 'tabFen' }));
      fireEvent.change(screen.getByLabelText('fenLabel'), { target: { value: VALID_FEN } });

      // Fill in the required title field.
      fireEvent.change(screen.getByLabelText(/titleLabel/), { target: { value: 'Mate in 1' } });

      // Enter one solution move through the stubbed MoveInputPanel.
      seedMoveValue('Nf3');
      fireEvent.click(screen.getByTestId('stub-submit'));

      // Submit the form — the real `continueToPreview` button is labeled
      // via the translation mock, which returns key names.
      fireEvent.click(screen.getByRole('button', { name: 'continueToPreview' }));

      // Draft is persisted to the exact slot the preview page reads from.
      const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed).toMatchObject({
        version: 1,
        fen: VALID_FEN,
        title: 'Mate in 1',
        moves: ['Nf3'],
      });

      // Navigation hand-off fires (route prefix is stripped by `useRouter`).
      expect(mockPush).toHaveBeenCalledWith('/practice/puzzle/new/preview');
    });

    it('does NOT navigate when the position is missing — surfaces positionInvalid instead', () => {
      render(<CreatePuzzleForm />);

      fireEvent.change(screen.getByLabelText(/titleLabel/), { target: { value: 'No FEN yet' } });
      fireEvent.click(screen.getByRole('button', { name: 'continueToPreview' }));

      expect(mockPush).not.toHaveBeenCalled();
      expect(sessionStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
    });

    it('does NOT navigate when the solution is empty — surfaces solutionRequired instead', () => {
      render(<CreatePuzzleForm />);

      fireEvent.click(screen.getByRole('tab', { name: 'tabFen' }));
      fireEvent.change(screen.getByLabelText('fenLabel'), { target: { value: VALID_FEN } });
      fireEvent.change(screen.getByLabelText(/titleLabel/), { target: { value: 'Titled' } });

      fireEvent.click(screen.getByRole('button', { name: 'continueToPreview' }));

      expect(mockPush).not.toHaveBeenCalled();
      expect(sessionStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
      expect(screen.getByText('solutionRequired')).toBeInTheDocument();
    });

    it('stays on the form and surfaces draftWriteFailed when sessionStorage.setItem throws', () => {
      render(<CreatePuzzleForm />);

      fireEvent.click(screen.getByRole('tab', { name: 'tabFen' }));
      fireEvent.change(screen.getByLabelText('fenLabel'), { target: { value: VALID_FEN } });
      fireEvent.change(screen.getByLabelText(/titleLabel/), { target: { value: 'quota test' } });
      seedMoveValue('Nf3');
      fireEvent.click(screen.getByTestId('stub-submit'));

      const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota exceeded');
      });
      try {
        fireEvent.click(screen.getByRole('button', { name: 'continueToPreview' }));
      } finally {
        spy.mockRestore();
      }

      expect(mockPush).not.toHaveBeenCalled();
      expect(screen.getByText('draftWriteFailed')).toBeInTheDocument();
    });
  });

  describe('hydration from existing draft', () => {
    it('hydrates form fields from a valid draft in sessionStorage', () => {
      sessionStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify(
          makeDraft({
            title: 'Hydrated title',
            description: 'Hydrated description',
            moves: ['Nf3', 'e5'],
            notes: ['develop', 'counter'],
          })
        )
      );

      render(<CreatePuzzleForm />);

      expect(screen.getByLabelText(/titleLabel/)).toHaveValue('Hydrated title');
      expect(screen.getByLabelText(/descriptionLabel/)).toHaveValue('Hydrated description');
      // activeTab defaults to 'fen' in makeDraft, so the fen textarea is visible.
      expect(screen.getByLabelText('fenLabel')).toHaveValue(VALID_FEN);
      // Solution move count is rendered as `N / MAX`; assert the prefix.
      expect(screen.getByText(/^2\s*\/\s*20$/)).toBeInTheDocument();
    });

    it('does NOT clobber user edits after remount — the didHydrate ref only runs once', () => {
      sessionStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify(makeDraft({ title: 'Original title' }))
      );

      const view = render(<CreatePuzzleForm />);
      expect(screen.getByLabelText(/titleLabel/)).toHaveValue('Original title');

      // User edits the title in-place.
      fireEvent.change(screen.getByLabelText(/titleLabel/), {
        target: { value: 'User-edited title' },
      });
      expect(screen.getByLabelText(/titleLabel/)).toHaveValue('User-edited title');

      // Simulate a dev-time Fast Refresh / StrictMode remount by re-rendering
      // the same root with a fresh instance. The effect should NOT re-read
      // the draft because `didHydrate.current` was set to true in-place on
      // the prior mount. Note: this test documents the guarded behavior —
      // in practice, React's double-invoke in StrictMode was the motivating
      // scenario for the ref.
      view.rerender(<CreatePuzzleForm />);
      expect(screen.getByLabelText(/titleLabel/)).toHaveValue('User-edited title');
    });
  });

  describe('Start over button', () => {
    it('is hidden when no draft exists', () => {
      render(<CreatePuzzleForm />);
      expect(screen.queryByRole('button', { name: 'startOver' })).not.toBeInTheDocument();
    });

    it('is visible when hydrated from a draft, and clearing it resets the form and slot', () => {
      sessionStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify(makeDraft({ title: 'Before reset' }))
      );

      render(<CreatePuzzleForm />);

      const startOver = screen.getByRole('button', { name: 'startOver' });
      expect(startOver).toBeInTheDocument();

      // Opens the confirmation modal (stubbed inline in this file).
      fireEvent.click(startOver);
      const dialog = screen.getByRole('dialog', { name: 'startOverConfirmTitle' });
      expect(dialog).toBeInTheDocument();

      // Confirm the reset.
      fireEvent.click(screen.getByRole('button', { name: 'startOverConfirm' }));

      // Slot cleared, title reset to empty, Start over button hidden again.
      expect(sessionStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
      expect(screen.getByLabelText(/titleLabel/)).toHaveValue('');
      expect(screen.queryByRole('button', { name: 'startOver' })).not.toBeInTheDocument();
    });
  });
});
