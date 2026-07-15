import type { ReactNode } from 'react';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { DRAFT_STORAGE_KEY } from '../_lib/draft-storage';
import type { PuzzleDraftV1 } from '../_lib/draft-storage';
import { CreatePuzzlePositionForm } from './CreatePuzzlePositionForm';

// Router spies — stable object so the `resumed` effect's `router` dep
// doesn't reshoot the effect after every setState.
const { mockPush, mockReplace, stableRouter } = vi.hoisted(() => {
  const push = vi.fn();
  const replace = vi.fn();
  return { mockPush: push, mockReplace: replace, stableRouter: { push, replace } };
});
vi.mock('@/i18n/routing', () => ({
  useRouter: () => stableRouter,
}));

// `?resumed=1` detection. Individual tests override via mockSearchParamsGet.
const { mockSearchParamsGet } = vi.hoisted(() => ({
  mockSearchParamsGet: vi.fn((_key: string): string | null => null),
}));
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: mockSearchParamsGet }),
}));

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
      peekMode: 'modal',
    },
    isLoaded: true,
    isHydrated: true,
    updatePreferences: () => {},
    resetPreferences: () => {},
  }),
}));

vi.mock('@/app/[locale]/(public)/practice/(free-play)/_components/EditableChessBoard', () => ({
  EditableChessBoard: ({ fen }: { fen: string }) => (
    <div data-testid="editable-board" data-fen={fen} />
  ),
}));

vi.mock('next-navigation-guard', () => ({
  useNavigationGuard: () => ({ active: false, accept: () => {}, reject: () => {} }),
}));

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

vi.mock('@/app/_components', () => ({
  BoardFrame: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  UnsavedChangesDialog: () => null,
  Button: ({
    children,
    type,
    disabled,
    onClick,
  }: {
    children: ReactNode;
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    onClick?: () => void;
  }) => (
    <button type={type ?? 'button'} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
  FlipBoardButton: ({ onClick, title }: { onClick: () => void; title: string }) => (
    <button type="button" onClick={onClick} title={title} />
  ),
  BoardSkeleton: () => <div data-testid="board-skeleton" />,
}));

const VALID_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const OTHER_VALID_FEN = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';

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

beforeEach(() => {
  mockPush.mockReset();
  mockReplace.mockReset();
  mockSearchParamsGet.mockReset();
  mockSearchParamsGet.mockReturnValue(null);
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe('CreatePuzzlePositionForm', () => {
  describe('Continue flow', () => {
    it('writes a draft to sessionStorage and pushes to /new/solution', () => {
      render(<CreatePuzzlePositionForm />);

      fireEvent.click(screen.getByRole('tab', { name: 'tabFen' }));
      fireEvent.change(screen.getByLabelText('fenLabel'), { target: { value: VALID_FEN } });
      fireEvent.change(screen.getByLabelText(/titleLabel/), { target: { value: 'Mate in 1' } });

      fireEvent.click(screen.getByRole('button', { name: 'continueToSolution' }));

      const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed).toMatchObject({ version: 1, fen: VALID_FEN, title: 'Mate in 1', moves: [] });

      expect(mockPush).toHaveBeenCalledWith('/practice/puzzle/new/solution');
    });

    it('Continue is disabled until a valid FEN and a non-empty title are both set', () => {
      render(<CreatePuzzlePositionForm />);
      expect(screen.getByRole('button', { name: 'continueToSolution' })).toBeDisabled();

      fireEvent.change(screen.getByLabelText(/titleLabel/), { target: { value: 'Titled' } });
      expect(screen.getByRole('button', { name: 'continueToSolution' })).toBeDisabled();

      fireEvent.click(screen.getByRole('tab', { name: 'tabFen' }));
      fireEvent.change(screen.getByLabelText('fenLabel'), { target: { value: VALID_FEN } });
      expect(screen.getByRole('button', { name: 'continueToSolution' })).not.toBeDisabled();
    });

    it('clicking Continue with no title set does not navigate or write a draft', () => {
      render(<CreatePuzzlePositionForm />);

      fireEvent.click(screen.getByRole('tab', { name: 'tabFen' }));
      fireEvent.change(screen.getByLabelText('fenLabel'), { target: { value: VALID_FEN } });

      fireEvent.click(screen.getByRole('button', { name: 'continueToSolution' }));

      expect(mockPush).not.toHaveBeenCalled();
      expect(sessionStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
    });

    it('stays on the form and surfaces draftWriteFailed when sessionStorage.setItem throws', () => {
      render(<CreatePuzzlePositionForm />);

      fireEvent.click(screen.getByRole('tab', { name: 'tabFen' }));
      fireEvent.change(screen.getByLabelText('fenLabel'), { target: { value: VALID_FEN } });
      fireEvent.change(screen.getByLabelText(/titleLabel/), { target: { value: 'quota test' } });

      const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota exceeded');
      });
      try {
        fireEvent.click(screen.getByRole('button', { name: 'continueToSolution' }));
      } finally {
        spy.mockRestore();
      }

      expect(mockPush).not.toHaveBeenCalled();
      expect(screen.getByText('draftWriteFailed')).toBeInTheDocument();
    });
  });

  describe('position-changed confirmation', () => {
    it('does not prompt when the position is unchanged from the hydrated draft', () => {
      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(makeDraft()));
      render(<CreatePuzzlePositionForm />);

      fireEvent.click(screen.getByRole('button', { name: 'continueToSolution' }));

      expect(
        screen.queryByRole('dialog', { name: 'positionChangedConfirmTitle' })
      ).not.toBeInTheDocument();
      expect(mockPush).toHaveBeenCalledWith('/practice/puzzle/new/solution');
      const parsed = JSON.parse(sessionStorage.getItem(DRAFT_STORAGE_KEY)!);
      expect(parsed.moves).toEqual(['Nf3']);
    });

    it('prompts and, on cancel, leaves the carried-through moves untouched', () => {
      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(makeDraft()));
      render(<CreatePuzzlePositionForm />);

      fireEvent.change(screen.getByLabelText('fenLabel'), { target: { value: OTHER_VALID_FEN } });
      fireEvent.click(screen.getByRole('button', { name: 'continueToSolution' }));

      expect(
        screen.getByRole('dialog', { name: 'positionChangedConfirmTitle' })
      ).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: 'positionChangedConfirmCancel' }));
      expect(
        screen.queryByRole('dialog', { name: 'positionChangedConfirmTitle' })
      ).not.toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('regression: confirming clears the carried-through moves and writes the new position', () => {
      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(makeDraft()));
      render(<CreatePuzzlePositionForm />);

      fireEvent.change(screen.getByLabelText('fenLabel'), { target: { value: OTHER_VALID_FEN } });
      fireEvent.click(screen.getByRole('button', { name: 'continueToSolution' }));
      fireEvent.click(screen.getByRole('button', { name: 'positionChangedConfirmConfirm' }));

      expect(mockPush).toHaveBeenCalledWith('/practice/puzzle/new/solution');
      const parsed = JSON.parse(sessionStorage.getItem(DRAFT_STORAGE_KEY)!);
      expect(parsed.fen).toBe(OTHER_VALID_FEN);
      expect(parsed.moves).toEqual([]);
      expect(parsed.notes).toEqual([]);
    });
  });

  describe('hydration from existing draft', () => {
    it('hydrates fields and shows the draft-restored banner on a cold hit', () => {
      sessionStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify(makeDraft({ title: 'Hydrated title', description: 'Hydrated desc' }))
      );

      render(<CreatePuzzlePositionForm />);

      expect(screen.getByLabelText(/titleLabel/)).toHaveValue('Hydrated title');
      expect(screen.getByLabelText(/descriptionLabel/)).toHaveValue('Hydrated desc');
      expect(screen.getByLabelText('fenLabel')).toHaveValue(VALID_FEN);
      expect(screen.getByRole('status')).toHaveTextContent('draftRestoredBanner');
    });

    it('suppresses the banner (but still hydrates) when ?resumed=1 and strips the param', () => {
      mockSearchParamsGet.mockImplementation((key: string) => (key === 'resumed' ? '1' : null));
      sessionStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify(makeDraft({ title: 'Resumed title' }))
      );

      render(<CreatePuzzlePositionForm />);

      expect(screen.getByLabelText(/titleLabel/)).toHaveValue('Resumed title');
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(mockReplace).toHaveBeenCalledWith('/practice/puzzle/new');
    });

    it('clicking Discard opens the confirmation modal, and confirming resets the form and slot', () => {
      sessionStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify(makeDraft({ title: 'Before reset' }))
      );

      render(<CreatePuzzlePositionForm />);

      fireEvent.click(screen.getByRole('button', { name: 'draftRestoredDiscard' }));
      fireEvent.click(screen.getByRole('button', { name: 'startOverConfirm' }));

      expect(sessionStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
      expect(screen.getByLabelText(/titleLabel/)).toHaveValue('');
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  describe('field order', () => {
    it('renders TagPicker before the Continue button', () => {
      const { container } = render(<CreatePuzzlePositionForm />);

      const tagPickerSection = screen.getByText('section');
      const continueButton = screen.getByRole('button', { name: 'continueToSolution' });
      const FOLLOWING = Node.DOCUMENT_POSITION_FOLLOWING;
      expect(tagPickerSection.compareDocumentPosition(continueButton) & FOLLOWING).toBe(FOLLOWING);
      expect(container).toBeInTheDocument();
    });

    it('renders title before description, and both before the position editor (tabs / FEN)', () => {
      const { container } = render(<CreatePuzzlePositionForm />);

      const title = screen.getByLabelText(/titleLabel/);
      const description = screen.getByLabelText(/descriptionLabel/);
      const tablist = container.querySelector('[role="tablist"]') as HTMLElement | null;
      expect(tablist).not.toBeNull();

      const FOLLOWING = Node.DOCUMENT_POSITION_FOLLOWING;
      expect(title.compareDocumentPosition(description) & FOLLOWING).toBe(FOLLOWING);
      expect(description.compareDocumentPosition(tablist!) & FOLLOWING).toBe(FOLLOWING);
    });
  });

  describe('Clear Board confirmation modal', () => {
    it('clicking Clear Board opens the confirmation modal', () => {
      render(<CreatePuzzlePositionForm />);

      expect(
        screen.queryByRole('dialog', { name: 'clearBoardConfirmTitle' })
      ).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'clearBoard' }));

      expect(screen.getByRole('dialog', { name: 'clearBoardConfirmTitle' })).toBeInTheDocument();
    });

    it('Confirm resets the board to the empty-board FEN', () => {
      render(<CreatePuzzlePositionForm />);

      fireEvent.click(screen.getByRole('tab', { name: 'tabFen' }));
      fireEvent.change(screen.getByLabelText('fenLabel'), { target: { value: VALID_FEN } });

      fireEvent.click(screen.getByRole('tab', { name: 'tabBoard' }));
      fireEvent.click(screen.getByRole('button', { name: 'clearBoard' }));
      fireEvent.click(screen.getByRole('button', { name: 'clearBoardConfirmConfirm' }));

      fireEvent.click(screen.getByRole('tab', { name: 'tabFen' }));
      expect(screen.getByLabelText('fenLabel')).toHaveValue('8/8/8/8/8/8/8/8 w - - 0 1');
    });
  });

  describe('default title (buildDefaultTitle)', () => {
    beforeAll(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-04-25T12:00:00'));
    });

    afterAll(() => {
      vi.useRealTimers();
    });

    it('starts with an empty title when displayName is undefined', () => {
      render(<CreatePuzzlePositionForm />);
      expect(screen.getByLabelText(/titleLabel/)).toHaveValue('');
    });

    it('seeds the title with "Puzzle YYYY-MM-DD - <displayName>" for a simple name', () => {
      render(<CreatePuzzlePositionForm displayName="alice" />);
      expect(screen.getByLabelText(/titleLabel/)).toHaveValue('Puzzle 2026-04-25 - alice');
    });
  });

  describe('forkSeed', () => {
    const FORK_SOURCE_ID = '11111111-1111-1111-1111-111111111111';

    function makeForkSeed() {
      return {
        sourceId: FORK_SOURCE_ID,
        sourceTitle: 'Source Puzzle',
        fen: VALID_FEN,
        title: 'Source Puzzle',
        description: 'Source description',
        moves: ['Nf3'],
        notes: ['develop'],
        themeIds: [],
        chunkIds: [],
      };
    }

    it('prefills title, description, and position from the fork seed', () => {
      render(<CreatePuzzlePositionForm displayName="alice" forkSeed={makeForkSeed()} />);

      expect(screen.getByLabelText(/titleLabel/)).toHaveValue('Source Puzzle');
      expect(screen.getByLabelText(/descriptionLabel/)).toHaveValue('Source description');
    });

    it('carries forkedFromId through to the draft on Continue', () => {
      render(<CreatePuzzlePositionForm forkSeed={makeForkSeed()} />);

      fireEvent.click(screen.getByRole('button', { name: 'continueToSolution' }));

      const parsed = JSON.parse(sessionStorage.getItem(DRAFT_STORAGE_KEY)!);
      expect(parsed.forkedFromId).toBe(FORK_SOURCE_ID);
      expect(parsed.fen).toBe(VALID_FEN);
      expect(parsed.moves).toEqual(['Nf3']);
      expect(mockPush).toHaveBeenCalledWith('/practice/puzzle/new/solution');
    });

    it('skips draft hydration so a leftover unrelated draft does not overwrite the fork seed', () => {
      sessionStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify(makeDraft({ title: 'Unrelated Draft' }))
      );

      render(<CreatePuzzlePositionForm forkSeed={makeForkSeed()} />);

      expect(screen.getByLabelText(/titleLabel/)).toHaveValue('Source Puzzle');
      expect(screen.queryByText('draftRestoredBanner')).not.toBeInTheDocument();
    });
  });

  describe('injectedFen (create from a game position)', () => {
    it('seeds the board position and carries the injected solution through to the draft', () => {
      render(<CreatePuzzlePositionForm injectedFen={VALID_FEN} injectedSolution={['e4']} />);

      fireEvent.change(screen.getByLabelText(/titleLabel/), { target: { value: 'From game' } });
      fireEvent.click(screen.getByRole('button', { name: 'continueToSolution' }));

      const parsed = JSON.parse(sessionStorage.getItem(DRAFT_STORAGE_KEY)!);
      expect(parsed.fen).toBe(VALID_FEN);
      expect(parsed.moves).toEqual(['e4']);
      expect(mockPush).toHaveBeenCalledWith('/practice/puzzle/new/solution');
    });
  });
});
