import type { ReactNode } from 'react';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChunkOption } from '@/lib/chunks/types';
import type { ThemeOption } from '@/lib/themes/types';

import { editDraftStorageKey } from '../_lib/edit-draft-storage';
import type { PuzzleEditDraftV1 } from '../_lib/edit-draft-storage';
import { EditPuzzlePositionForm } from './EditPuzzlePositionForm';

const { mockPush, stableRouter } = vi.hoisted(() => {
  const push = vi.fn();
  const replace = vi.fn();
  return { mockPush: push, stableRouter: { push, replace } };
});
vi.mock('@/i18n/routing', () => ({
  useRouter: () => stableRouter,
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
  FieldError: ({ id, message }: { id: string; message: string | null }) =>
    message ? (
      <p id={id} role="alert">
        {message}
      </p>
    ) : null,
  fieldErrorProps: (id: string, message: string | null) =>
    message ? { 'aria-invalid': true, 'aria-describedby': id } : {},
  fieldBorderClass: (message: string | null) => (message ? 'border-destructive' : 'border-border'),
  FormErrorBanner: ({ message }: { message: string | null }) =>
    message ? <div role="alert">{message}</div> : null,
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

const POSITION_ID = '11111111-1111-1111-1111-111111111111';
const VALID_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const OTHER_VALID_FEN = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';

const THEME: ThemeOption = {
  id: 'theme-1',
  label: 'Fork',
  slug: 'fork',
  category: 'tactic',
  previewFen: null,
  definition: null,
  reading: null,
  positions: [],
};
const CHUNK: ChunkOption = {
  id: 'chunk-1',
  label: 'Knight fork',
  slug: 'knight-fork',
  representativeFen: VALID_FEN,
  description: null,
  status: 'published',
};

function baseProps() {
  return {
    positionId: POSITION_ID,
    initial: {
      title: 'Mate in 1',
      description: 'Fork the king',
      fen: VALID_FEN,
      solutionMoves: [{ san: 'Nf3', note: null }],
      themes: [THEME],
      chunks: [CHUNK],
    },
    available: {
      themes: [THEME],
      chunks: [CHUNK],
    },
  };
}

function makeEditDraft(overrides: Partial<PuzzleEditDraftV1> = {}): PuzzleEditDraftV1 {
  return {
    version: 1,
    fen: VALID_FEN,
    title: 'Mate in 1',
    description: 'Fork the king',
    moves: ['Nf3'],
    notes: [''],
    activeTab: 'fen',
    sideToMove: 'w',
    flipped: false,
    themeIds: ['theme-1'],
    chunkIds: ['chunk-1'],
    ...overrides,
  };
}

beforeEach(() => {
  mockPush.mockReset();
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe('EditPuzzlePositionForm', () => {
  it('seeds fields from the DB-loaded `initial` when no edit draft exists', () => {
    render(<EditPuzzlePositionForm {...baseProps()} />);

    expect(screen.getByLabelText(/titleLabel/)).toHaveValue('Mate in 1');
    expect(screen.getByLabelText(/descriptionLabel/)).toHaveValue('Fork the king');
  });

  it('prefers a resumed edit draft over the DB-loaded `initial`', () => {
    sessionStorage.setItem(
      editDraftStorageKey(POSITION_ID),
      JSON.stringify(makeEditDraft({ title: 'Edited but not saved' }))
    );

    render(<EditPuzzlePositionForm {...baseProps()} />);

    expect(screen.getByLabelText(/titleLabel/)).toHaveValue('Edited but not saved');
  });

  it('Continue writes the edit draft and navigates to /edit/solution', () => {
    render(<EditPuzzlePositionForm {...baseProps()} />);

    fireEvent.click(screen.getByRole('button', { name: 'continueToSolution' }));

    expect(mockPush).toHaveBeenCalledWith(`/practice/puzzle/${POSITION_ID}/edit/solution`);
    const raw = sessionStorage.getItem(editDraftStorageKey(POSITION_ID));
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.moves).toEqual(['Nf3']);
    expect(parsed.fen).toBe(VALID_FEN);
  });

  it('Cancel returns to the puzzle detail page without writing a draft', () => {
    render(<EditPuzzlePositionForm {...baseProps()} />);

    fireEvent.click(screen.getByRole('button', { name: 'cancel' }));

    expect(mockPush).toHaveBeenCalledWith(`/practice/puzzle/${POSITION_ID}`);
    expect(sessionStorage.getItem(editDraftStorageKey(POSITION_ID))).toBeNull();
  });

  it('regression: changing the position prompts before clearing the carried-through moves', () => {
    render(<EditPuzzlePositionForm {...baseProps()} />);

    fireEvent.click(screen.getByRole('tab', { name: 'tabFen' }));
    fireEvent.change(screen.getByLabelText('fenLabel'), { target: { value: OTHER_VALID_FEN } });
    fireEvent.click(screen.getByRole('button', { name: 'continueToSolution' }));

    expect(screen.getByRole('dialog', { name: 'positionChangedConfirmTitle' })).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'positionChangedConfirmConfirm' }));

    expect(mockPush).toHaveBeenCalledWith(`/practice/puzzle/${POSITION_ID}/edit/solution`);
    const parsed = JSON.parse(sessionStorage.getItem(editDraftStorageKey(POSITION_ID))!);
    expect(parsed.fen).toBe(OTHER_VALID_FEN);
    expect(parsed.moves).toEqual([]);
  });

  it('cancelling the position-changed confirmation leaves the carried-through moves untouched', () => {
    render(<EditPuzzlePositionForm {...baseProps()} />);

    fireEvent.click(screen.getByRole('tab', { name: 'tabFen' }));
    fireEvent.change(screen.getByLabelText('fenLabel'), { target: { value: OTHER_VALID_FEN } });
    fireEvent.click(screen.getByRole('button', { name: 'continueToSolution' }));
    fireEvent.click(screen.getByRole('button', { name: 'positionChangedConfirmCancel' }));

    expect(mockPush).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(editDraftStorageKey(POSITION_ID))).toBeNull();
  });
});
