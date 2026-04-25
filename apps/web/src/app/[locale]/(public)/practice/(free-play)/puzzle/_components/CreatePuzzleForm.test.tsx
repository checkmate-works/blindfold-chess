import type { ReactNode } from 'react';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

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
// Button is stubbed to a plain <button> so role/name lookups still work.
vi.mock('@/app/_components', () => ({
  UnsavedChangesDialog: () => null,
  Button: ({
    children,
    type,
    disabled,
  }: {
    children: ReactNode;
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
  }) => (
    <button type={type ?? 'button'} disabled={disabled}>
      {children}
    </button>
  ),
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

    it('Preview button is disabled when the position is missing, even if a title is set — clicking does not navigate or write a draft', () => {
      render(<CreatePuzzleForm />);

      fireEvent.change(screen.getByLabelText(/titleLabel/), { target: { value: 'No FEN yet' } });

      const previewBtn = screen.getByRole('button', { name: 'continueToPreview' });
      expect(previewBtn).toBeDisabled();

      fireEvent.click(previewBtn);

      expect(mockPush).not.toHaveBeenCalled();
      expect(sessionStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
    });

    it('Preview button is disabled when the position is valid but the solution is empty — clicking does not navigate or write a draft', () => {
      render(<CreatePuzzleForm />);

      fireEvent.click(screen.getByRole('tab', { name: 'tabFen' }));
      fireEvent.change(screen.getByLabelText('fenLabel'), { target: { value: VALID_FEN } });
      fireEvent.change(screen.getByLabelText(/titleLabel/), { target: { value: 'Titled' } });

      const previewBtn = screen.getByRole('button', { name: 'continueToPreview' });
      expect(previewBtn).toBeDisabled();

      fireEvent.click(previewBtn);

      expect(mockPush).not.toHaveBeenCalled();
      expect(sessionStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
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

  describe('Draft-restored banner', () => {
    it('banner is hidden on fresh mount when no draft exists', () => {
      render(<CreatePuzzleForm />);
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.queryByText('draftRestoredBanner')).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'draftRestoredDiscard' })
      ).not.toBeInTheDocument();
    });

    it('banner is visible when hydrated from a draft, with role="status" on the outer container', () => {
      sessionStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify(makeDraft({ title: 'Before reset' }))
      );

      render(<CreatePuzzleForm />);

      // Outer banner exposes role="status" for assistive tech.
      const banner = screen.getByRole('status');
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveTextContent('draftRestoredBanner');

      // Discard button is rendered inside the banner.
      expect(screen.getByRole('button', { name: 'draftRestoredDiscard' })).toBeInTheDocument();
    });

    it('clicking Discard opens the confirmation modal, and confirming resets the form and slot', () => {
      sessionStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify(makeDraft({ title: 'Before reset' }))
      );

      render(<CreatePuzzleForm />);

      const discard = screen.getByRole('button', { name: 'draftRestoredDiscard' });
      expect(discard).toBeInTheDocument();

      // Opens the confirmation modal (stubbed inline in this file).
      fireEvent.click(discard);
      const dialog = screen.getByRole('dialog', { name: 'startOverConfirmTitle' });
      expect(dialog).toBeInTheDocument();

      // Confirm the reset.
      fireEvent.click(screen.getByRole('button', { name: 'startOverConfirm' }));

      // Slot cleared, title reset to empty, banner + Discard button hidden again.
      expect(sessionStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
      expect(screen.getByLabelText(/titleLabel/)).toHaveValue('');
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'draftRestoredDiscard' })
      ).not.toBeInTheDocument();
    });
  });

  describe('default title (buildDefaultTitle)', () => {
    // Pin the system clock so the date portion of the seeded title is
    // deterministic regardless of when the suite runs. The form computes
    // `formatLocalIsoDate(new Date())` once via useRef on first render, so
    // we set the time before each render.
    beforeAll(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-04-25T12:00:00'));
    });

    afterAll(() => {
      vi.useRealTimers();
    });

    it('starts with an empty title when displayName is undefined', () => {
      render(<CreatePuzzleForm />);
      expect(screen.getByLabelText(/titleLabel/)).toHaveValue('');
    });

    it('uses the date-only fallback when displayName is an empty string', () => {
      render(<CreatePuzzleForm displayName="" />);
      expect(screen.getByLabelText(/titleLabel/)).toHaveValue('Puzzle 2026-04-25');
    });

    it('uses the date-only fallback when displayName is whitespace-only (after trim)', () => {
      render(<CreatePuzzleForm displayName="   " />);
      expect(screen.getByLabelText(/titleLabel/)).toHaveValue('Puzzle 2026-04-25');
    });

    it('seeds the title with "Puzzle YYYY-MM-DD - <displayName>" for a simple name', () => {
      render(<CreatePuzzleForm displayName="alice" />);
      expect(screen.getByLabelText(/titleLabel/)).toHaveValue('Puzzle 2026-04-25 - alice');
    });

    it('preserves spaces inside displayName verbatim', () => {
      render(<CreatePuzzleForm displayName="Alice Smith" />);
      expect(screen.getByLabelText(/titleLabel/)).toHaveValue('Puzzle 2026-04-25 - Alice Smith');
    });

    it('passes through special characters and emoji verbatim so the user can edit them', () => {
      render(<CreatePuzzleForm displayName="🐴 Knight!" />);
      expect(screen.getByLabelText(/titleLabel/)).toHaveValue('Puzzle 2026-04-25 - 🐴 Knight!');
    });

    it('formats the date portion as YYYY-MM-DD with no time component', () => {
      render(<CreatePuzzleForm displayName="" />);
      const value = (screen.getByLabelText(/titleLabel/) as HTMLInputElement).value;
      // Body must match `Puzzle ` followed by ISO date only — no `T`, no time.
      expect(value).toMatch(/^Puzzle \d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('field order', () => {
    it('renders title before description, and both before the position editor (tabs / FEN)', () => {
      const { container } = render(<CreatePuzzleForm />);

      const title = screen.getByLabelText(/titleLabel/);
      const description = screen.getByLabelText(/descriptionLabel/);
      const tablist = container.querySelector('[role="tablist"]') as HTMLElement | null;
      expect(tablist).not.toBeNull();

      // compareDocumentPosition returns a bitmask; DOCUMENT_POSITION_FOLLOWING (4)
      // is set when the argument node comes AFTER the receiver in document order.
      const FOLLOWING = Node.DOCUMENT_POSITION_FOLLOWING;
      expect(title.compareDocumentPosition(description) & FOLLOWING).toBe(FOLLOWING);
      expect(description.compareDocumentPosition(tablist!) & FOLLOWING).toBe(FOLLOWING);
    });

    it('renders the title input earlier in the DOM than the FEN textarea', () => {
      const { container } = render(<CreatePuzzleForm />);

      // Switch to the FEN tab so the textarea is mounted.
      fireEvent.click(screen.getByRole('tab', { name: 'tabFen' }));

      const title = screen.getByLabelText(/titleLabel/);
      const fen = screen.getByLabelText('fenLabel');
      const FOLLOWING = Node.DOCUMENT_POSITION_FOLLOWING;
      expect(title.compareDocumentPosition(fen) & FOLLOWING).toBe(FOLLOWING);

      // Sanity: title is also strictly earlier in the focusable-input order.
      const inputs = Array.from(container.querySelectorAll('input, textarea')) as HTMLElement[];
      expect(inputs.indexOf(title)).toBeLessThan(inputs.indexOf(fen));
    });
  });

  describe('reset / dirty-check semantics with seeded default title', () => {
    beforeAll(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-04-25T12:00:00'));
    });

    afterAll(() => {
      vi.useRealTimers();
    });

    it('Discard restores the seeded default title (not empty) when the form was hydrated from a draft', () => {
      const seededDefault = 'Puzzle 2026-04-25 - alice';
      sessionStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify(makeDraft({ title: 'User-edited title' }))
      );

      render(<CreatePuzzleForm displayName="alice" />);

      // After hydration, the title reflects the saved draft, not the seeded default.
      expect(screen.getByLabelText(/titleLabel/)).toHaveValue('User-edited title');

      // Click Discard (in the draft-restored banner) and confirm.
      fireEvent.click(screen.getByRole('button', { name: 'draftRestoredDiscard' }));
      fireEvent.click(screen.getByRole('button', { name: 'startOverConfirm' }));

      // Title resets to the SEEDED default — not to empty string.
      expect(screen.getByLabelText(/titleLabel/)).toHaveValue(seededDefault);
      expect(sessionStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
    });
  });

  describe('Clear Board confirmation modal', () => {
    it('clicking Clear Board opens the confirmation modal', () => {
      render(<CreatePuzzleForm />);

      // Modal is not open on initial mount.
      expect(
        screen.queryByRole('dialog', { name: 'clearBoardConfirmTitle' })
      ).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'clearBoard' }));

      expect(screen.getByRole('dialog', { name: 'clearBoardConfirmTitle' })).toBeInTheDocument();
    });

    it('Cancel closes the modal and leaves board state unchanged', () => {
      // Seed a draft (activeTab='fen' by default) so we can assert FEN value,
      // but the Clear Board button only renders in the Board tab.
      sessionStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify(makeDraft({ title: 'Before cancel', moves: ['Nf3', 'e5'] }))
      );
      render(<CreatePuzzleForm />);

      // Sanity — draft is loaded.
      expect(screen.getByLabelText(/titleLabel/)).toHaveValue('Before cancel');
      expect(screen.getByLabelText('fenLabel')).toHaveValue(VALID_FEN);
      expect(screen.getByText(/^2\s*\/\s*20$/)).toBeInTheDocument();

      // Switch to Board tab so Clear Board button is rendered.
      fireEvent.click(screen.getByRole('tab', { name: 'tabBoard' }));
      fireEvent.click(screen.getByRole('button', { name: 'clearBoard' }));
      expect(screen.getByRole('dialog', { name: 'clearBoardConfirmTitle' })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'clearBoardConfirmCancel' }));

      // Modal gone; all state still intact.
      expect(
        screen.queryByRole('dialog', { name: 'clearBoardConfirmTitle' })
      ).not.toBeInTheDocument();
      expect(screen.getByLabelText(/titleLabel/)).toHaveValue('Before cancel');
      // Flip back to FEN tab to inspect fenInput value.
      fireEvent.click(screen.getByRole('tab', { name: 'tabFen' }));
      expect(screen.getByLabelText('fenLabel')).toHaveValue(VALID_FEN);
      expect(screen.getByText(/^2\s*\/\s*20$/)).toBeInTheDocument();
    });

    it('Confirm closes the modal and resets the board (FEN → empty, moves cleared)', () => {
      sessionStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify(makeDraft({ title: 'Before clear', moves: ['Nf3', 'e5'] }))
      );
      render(<CreatePuzzleForm />);

      // Sanity — solution section visible with 2 moves.
      expect(screen.getByText(/^2\s*\/\s*20$/)).toBeInTheDocument();
      expect(screen.getByLabelText('fenLabel')).toHaveValue(VALID_FEN);

      // Switch to Board tab so Clear Board button is rendered.
      fireEvent.click(screen.getByRole('tab', { name: 'tabBoard' }));
      fireEvent.click(screen.getByRole('button', { name: 'clearBoard' }));
      fireEvent.click(screen.getByRole('button', { name: 'clearBoardConfirmConfirm' }));

      // Modal closes.
      expect(
        screen.queryByRole('dialog', { name: 'clearBoardConfirmTitle' })
      ).not.toBeInTheDocument();

      // Flip to FEN tab to assert fenInput was reset to the empty-board FEN.
      fireEvent.click(screen.getByRole('tab', { name: 'tabFen' }));
      expect(screen.getByLabelText('fenLabel')).toHaveValue('8/8/8/8/8/8/8/8 w - - 0 1');

      // Solution section hides because the empty-board FEN fails validateFen.
      expect(screen.queryByText(/\/\s*20$/)).not.toBeInTheDocument();

      // Title is untouched (Clear Board only resets board + solution).
      expect(screen.getByLabelText(/titleLabel/)).toHaveValue('Before clear');
    });
  });

  describe('Preview button disabled gate', () => {
    it('is disabled on fresh mount (empty FEN, empty moves, empty title)', () => {
      render(<CreatePuzzleForm />);
      expect(screen.getByRole('button', { name: 'continueToPreview' })).toBeDisabled();
    });

    it('is disabled with a valid FEN but empty moves', () => {
      render(<CreatePuzzleForm />);

      fireEvent.click(screen.getByRole('tab', { name: 'tabFen' }));
      fireEvent.change(screen.getByLabelText('fenLabel'), { target: { value: VALID_FEN } });
      fireEvent.change(screen.getByLabelText(/titleLabel/), { target: { value: 'Titled' } });

      expect(screen.getByRole('button', { name: 'continueToPreview' })).toBeDisabled();
    });

    it('is disabled when title is empty (cleared by the user) even with valid FEN and moves', () => {
      render(<CreatePuzzleForm />);

      fireEvent.click(screen.getByRole('tab', { name: 'tabFen' }));
      fireEvent.change(screen.getByLabelText('fenLabel'), { target: { value: VALID_FEN } });
      fireEvent.change(screen.getByLabelText(/titleLabel/), { target: { value: 'Titled' } });
      seedMoveValue('Nf3');
      fireEvent.click(screen.getByTestId('stub-submit'));

      // Now clear the title. Button should flip back to disabled.
      fireEvent.change(screen.getByLabelText(/titleLabel/), { target: { value: '' } });

      expect(screen.getByRole('button', { name: 'continueToPreview' })).toBeDisabled();
    });

    it('is enabled when title, FEN, and at least one move are all set', () => {
      render(<CreatePuzzleForm />);

      fireEvent.click(screen.getByRole('tab', { name: 'tabFen' }));
      fireEvent.change(screen.getByLabelText('fenLabel'), { target: { value: VALID_FEN } });
      fireEvent.change(screen.getByLabelText(/titleLabel/), { target: { value: 'Titled' } });
      seedMoveValue('Nf3');
      fireEvent.click(screen.getByTestId('stub-submit'));

      expect(screen.getByRole('button', { name: 'continueToPreview' })).not.toBeDisabled();
    });
  });
});
