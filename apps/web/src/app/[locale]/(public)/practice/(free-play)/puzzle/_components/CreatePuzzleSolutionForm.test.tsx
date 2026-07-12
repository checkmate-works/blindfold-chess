import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DRAFT_STORAGE_KEY } from '../_lib/draft-storage';
import type { PuzzleDraftV1 } from '../_lib/draft-storage';
import { CreatePuzzleSolutionForm } from './CreatePuzzleSolutionForm';

const { mockPush, mockReplace, stableRouter } = vi.hoisted(() => {
  const push = vi.fn();
  const replace = vi.fn();
  return { mockPush: push, mockReplace: replace, stableRouter: { push, replace } };
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
  EditableChessBoard: ({ fen, editable }: { fen: string; editable?: boolean }) => (
    <div data-testid="editable-board" data-fen={fen} data-editable={editable ? 'true' : 'false'} />
  ),
}));

vi.mock('@/app/[locale]/_components/MoveInputPanel', () => ({
  MoveInputPanel: ({
    disabled,
    onSubmit,
  }: {
    disabled?: boolean;
    onSubmit: (move: string) => boolean | void | Promise<void>;
  }) => (
    <div data-testid="move-input-panel" data-disabled={disabled ? 'true' : 'false'}>
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

vi.mock('next-navigation-guard', () => ({
  useNavigationGuard: () => ({ active: false, accept: () => {}, reject: () => {} }),
}));

vi.mock('@/app/_components', () => ({
  UnsavedChangesDialog: () => null,
  Button: ({
    children,
    type,
    disabled,
    onClick,
  }: {
    children: React.ReactNode;
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
}));

const VALID_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function makeDraft(overrides: Partial<PuzzleDraftV1> = {}): PuzzleDraftV1 {
  return {
    version: 1,
    fen: VALID_FEN,
    title: 'Mate in 1',
    description: '',
    moves: [],
    notes: [],
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
  mockReplace.mockReset();
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe('CreatePuzzleSolutionForm', () => {
  it('redirects to /new when no draft exists on mount', async () => {
    render(<CreatePuzzleSolutionForm />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/practice/puzzle/new');
    });
    expect(screen.queryByTestId('editable-board')).not.toBeInTheDocument();
  });

  it('hydrates the read-only board and moves from the draft', () => {
    sessionStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify(makeDraft({ moves: ['Nf3', 'e5'], notes: ['develop', ''] }))
    );

    render(<CreatePuzzleSolutionForm />);

    const board = screen.getByTestId('editable-board');
    expect(board).toHaveAttribute('data-fen', VALID_FEN);
    expect(board).toHaveAttribute('data-editable', 'false');
    expect(screen.getByText(/^2\s*\/\s*20$/)).toBeInTheDocument();
  });

  it('renders no board/FEN tabs or side-to-move toggle — the position is fixed here', () => {
    sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(makeDraft()));
    const { container } = render(<CreatePuzzleSolutionForm />);

    expect(container.querySelector('[role="tablist"]')).toBeNull();
    expect(container.querySelector('[role="radiogroup"]')).toBeNull();
    expect(screen.queryByLabelText('fenLabel')).not.toBeInTheDocument();
  });

  it('Back persists newly-entered moves to the draft and navigates to /new?resumed=1', () => {
    sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(makeDraft()));
    render(<CreatePuzzleSolutionForm />);

    seedMoveValue('Nf3');
    fireEvent.click(screen.getByTestId('stub-submit'));

    fireEvent.click(screen.getByRole('button', { name: 'backToPosition' }));

    expect(mockPush).toHaveBeenCalledWith('/practice/puzzle/new?resumed=1');
    const parsed = JSON.parse(sessionStorage.getItem(DRAFT_STORAGE_KEY)!);
    expect(parsed.moves).toEqual(['Nf3']);
  });

  it('Preview is disabled while no moves are entered', () => {
    sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(makeDraft()));
    render(<CreatePuzzleSolutionForm />);

    expect(screen.getByRole('button', { name: 'continueToPreview' })).toBeDisabled();
  });

  it('Preview writes the draft and navigates to /new/preview once a move is entered', () => {
    sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(makeDraft()));
    render(<CreatePuzzleSolutionForm />);

    seedMoveValue('Nf3');
    fireEvent.click(screen.getByTestId('stub-submit'));

    const previewBtn = screen.getByRole('button', { name: 'continueToPreview' });
    expect(previewBtn).not.toBeDisabled();
    fireEvent.click(previewBtn);

    expect(mockPush).toHaveBeenCalledWith('/practice/puzzle/new/preview');
    const parsed = JSON.parse(sessionStorage.getItem(DRAFT_STORAGE_KEY)!);
    expect(parsed.moves).toEqual(['Nf3']);
  });
});
