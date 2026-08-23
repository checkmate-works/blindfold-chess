import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeGamePreferences } from '@/app/[locale]/_contexts/__test-support__/preferences-fixture';

import { editDraftStorageKey } from '../_lib/edit-draft-storage';
import type { PuzzleEditDraftV1 } from '../_lib/edit-draft-storage';
import { EditPuzzleSolutionForm } from './EditPuzzleSolutionForm';

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

const { mockUpdatePuzzle } = vi.hoisted(() => ({ mockUpdatePuzzle: vi.fn() }));
vi.mock('../_actions/updatePuzzle', () => ({
  updatePuzzle: mockUpdatePuzzle,
}));

vi.mock('@/app/[locale]/_contexts/GamePreferencesContext', () => ({
  useGamePreferences: () => ({
    preferences: makeGamePreferences(),
    isLoaded: true,
    isHydrated: true,
    updatePreferences: () => {},
    resetPreferences: () => {},
  }),
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
  FormErrorBanner: ({ message }: { message: string | null }) =>
    message ? <div role="alert">{message}</div> : null,
  BoardFrame: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LocalizedUnsavedChangesDialog: () => null,
  BoardSkeleton: () => <div data-testid="board-skeleton" />,
  Button: ({
    children,
    type,
    disabled,
    onClick,
    loading,
  }: {
    children: React.ReactNode;
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    onClick?: () => void;
    loading?: boolean;
  }) => (
    <button type={type ?? 'button'} disabled={disabled} onClick={onClick} data-loading={loading}>
      {children}
    </button>
  ),
  FlipBoardButton: ({ onClick, title }: { onClick: () => void; title: string }) => (
    <button type="button" onClick={onClick} title={title} />
  ),
  ChessBoard: ({ fen, onMove }: { fen: string; onMove?: (san: string) => void }) => (
    <div data-testid="chess-board" data-fen={fen} data-interactive={onMove ? 'true' : 'false'}>
      {onMove && (
        <button type="button" data-testid="stub-board-move" onClick={() => onMove('Nf3')}>
          simulate drag move
        </button>
      )}
    </div>
  ),
}));

const POSITION_ID = '11111111-1111-1111-1111-111111111111';
const VALID_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function makeEditDraft(overrides: Partial<PuzzleEditDraftV1> = {}): PuzzleEditDraftV1 {
  return {
    version: 1,
    fen: VALID_FEN,
    title: 'Mate in 1',
    description: 'Fork the king',
    moves: [],
    notes: [],
    activeTab: 'fen',
    sideToMove: 'w',
    flipped: false,
    themeIds: ['theme-1'],
    chunkIds: [],
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
  mockUpdatePuzzle.mockReset();
  sessionStorage.clear();
});

describe('EditPuzzleSolutionForm', () => {
  it('redirects to /edit when no edit draft exists on mount', async () => {
    render(<EditPuzzleSolutionForm positionId={POSITION_ID} />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(`/practice/puzzle/${POSITION_ID}/edit`);
    });
    expect(screen.queryByTestId('chess-board')).not.toBeInTheDocument();
  });

  it('hydrates the board (showing the position after entered moves) and the move list from the edit draft', () => {
    sessionStorage.setItem(
      editDraftStorageKey(POSITION_ID),
      JSON.stringify(makeEditDraft({ moves: ['Nf3', 'e5'], notes: ['', ''] }))
    );

    render(<EditPuzzleSolutionForm positionId={POSITION_ID} />);

    const board = screen.getByTestId('chess-board');
    expect(board.getAttribute('data-fen')).not.toBe(VALID_FEN);
    expect(board).toHaveAttribute('data-interactive', 'true');
    expect(screen.getByText(/^2\s*\/\s*20$/)).toBeInTheDocument();
  });

  it('dragging a move on the board (simulated) appends it just like typing one', () => {
    sessionStorage.setItem(editDraftStorageKey(POSITION_ID), JSON.stringify(makeEditDraft()));
    render(<EditPuzzleSolutionForm positionId={POSITION_ID} />);

    fireEvent.click(screen.getByTestId('stub-board-move'));

    expect(screen.getByText(/^1\s*\/\s*20$/)).toBeInTheDocument();
  });

  it('locks further input once the entered move delivers checkmate, and Undo unlocks it again', () => {
    // White rook on e1, black king boxed in on g8 by its own pawns — Re8
    // (chess.js normalizes the SAN to "Re8#") is checkmate in one.
    const MATE_IN_ONE_FEN = '6k1/5ppp/8/8/8/8/8/K3R3 w - - 0 1';
    sessionStorage.setItem(
      editDraftStorageKey(POSITION_ID),
      JSON.stringify(makeEditDraft({ fen: MATE_IN_ONE_FEN }))
    );
    render(<EditPuzzleSolutionForm positionId={POSITION_ID} />);

    seedMoveValue('Re8');
    fireEvent.click(screen.getByTestId('stub-submit'));

    expect(screen.getByText('checkmateReached')).toBeInTheDocument();
    expect(screen.queryByTestId('move-input-panel')).not.toBeInTheDocument();
    expect(screen.getByTestId('chess-board')).toHaveAttribute('data-interactive', 'false');
    expect(screen.getAllByText('Re8#').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'removeLastMove' }));

    expect(screen.queryByText('checkmateReached')).not.toBeInTheDocument();
    expect(screen.getByTestId('move-input-panel')).toBeInTheDocument();
    expect(screen.getByTestId('chess-board')).toHaveAttribute('data-interactive', 'true');
  });

  it('Back persists newly-entered moves to the edit draft and navigates to /edit', () => {
    sessionStorage.setItem(editDraftStorageKey(POSITION_ID), JSON.stringify(makeEditDraft()));
    render(<EditPuzzleSolutionForm positionId={POSITION_ID} />);

    seedMoveValue('Nf3');
    fireEvent.click(screen.getByTestId('stub-submit'));
    fireEvent.click(screen.getByRole('button', { name: 'backToPosition' }));

    expect(mockPush).toHaveBeenCalledWith(`/practice/puzzle/${POSITION_ID}/edit`);
    const parsed = JSON.parse(sessionStorage.getItem(editDraftStorageKey(POSITION_ID))!);
    expect(parsed.moves).toEqual(['Nf3']);
    expect(mockUpdatePuzzle).not.toHaveBeenCalled();
  });

  it('Preview is disabled while no moves are entered', () => {
    sessionStorage.setItem(editDraftStorageKey(POSITION_ID), JSON.stringify(makeEditDraft()));
    render(<EditPuzzleSolutionForm positionId={POSITION_ID} />);

    expect(screen.getByRole('button', { name: 'continueToPreview' })).toBeDisabled();
  });

  it('Preview persists newly-entered moves to the edit draft and navigates to /edit/preview — without saving to the server', () => {
    sessionStorage.setItem(
      editDraftStorageKey(POSITION_ID),
      JSON.stringify(makeEditDraft({ themeIds: ['theme-1'], chunkIds: ['chunk-1'] }))
    );

    render(<EditPuzzleSolutionForm positionId={POSITION_ID} />);

    seedMoveValue('Nf3');
    fireEvent.click(screen.getByTestId('stub-submit'));

    const previewBtn = screen.getByRole('button', { name: 'continueToPreview' });
    expect(previewBtn).not.toBeDisabled();
    fireEvent.click(previewBtn);

    expect(mockPush).toHaveBeenCalledWith(`/practice/puzzle/${POSITION_ID}/edit/preview`);
    // The save-to-server now happens on the preview step, not here.
    expect(mockUpdatePuzzle).not.toHaveBeenCalled();
    const parsed = JSON.parse(sessionStorage.getItem(editDraftStorageKey(POSITION_ID))!);
    expect(parsed.moves).toEqual(['Nf3']);
    expect(parsed.themeIds).toEqual(['theme-1']);
    expect(parsed.chunkIds).toEqual(['chunk-1']);
  });
});
