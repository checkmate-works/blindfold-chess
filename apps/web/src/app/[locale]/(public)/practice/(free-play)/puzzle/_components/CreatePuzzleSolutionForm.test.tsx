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
    expect(screen.queryByTestId('chess-board')).not.toBeInTheDocument();
  });

  it('hydrates the board (showing the position after entered moves) and the move list from the draft', () => {
    sessionStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify(makeDraft({ moves: ['Nf3', 'e5'], notes: ['develop', ''] }))
    );

    render(<CreatePuzzleSolutionForm />);

    const board = screen.getByTestId('chess-board');
    // The board now shows the position AFTER the entered moves, not the
    // frozen starting FEN — it must have advanced past the starting position.
    expect(board.getAttribute('data-fen')).not.toBe(VALID_FEN);
    expect(board).toHaveAttribute('data-interactive', 'true');
    expect(screen.getByText(/^2\s*\/\s*20$/)).toBeInTheDocument();
  });

  it('renders no board/FEN tabs or side-to-move toggle — position editing is not part of this step', () => {
    sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(makeDraft()));
    const { container } = render(<CreatePuzzleSolutionForm />);

    expect(container.querySelector('[role="tablist"]')).toBeNull();
    expect(container.querySelector('[role="radiogroup"]')).toBeNull();
    expect(screen.queryByLabelText('fenLabel')).not.toBeInTheDocument();
  });

  it('dragging a move on the board (simulated) appends it just like typing one', () => {
    sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(makeDraft()));
    render(<CreatePuzzleSolutionForm />);

    fireEvent.click(screen.getByTestId('stub-board-move'));

    expect(screen.getByText(/^1\s*\/\s*20$/)).toBeInTheDocument();
  });

  it('the board is not interactive once the max move count is reached', () => {
    const fullMoves = Array.from({ length: 20 }, (_, i) => (i % 2 === 0 ? 'Nf3' : 'Nc6'));
    sessionStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify(makeDraft({ moves: fullMoves, notes: fullMoves.map(() => '') }))
    );

    render(<CreatePuzzleSolutionForm />);

    expect(screen.getByTestId('chess-board')).toHaveAttribute('data-interactive', 'false');
  });

  it('locks further input once the entered move delivers checkmate, and Undo unlocks it again', () => {
    // White rook on e1, black king boxed in on g8 by its own pawns — Re8
    // (chess.js normalizes the SAN to "Re8#") is checkmate in one.
    const MATE_IN_ONE_FEN = '6k1/5ppp/8/8/8/8/8/K3R3 w - - 0 1';
    sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(makeDraft({ fen: MATE_IN_ONE_FEN })));
    render(<CreatePuzzleSolutionForm />);

    seedMoveValue('Re8');
    fireEvent.click(screen.getByTestId('stub-submit'));

    expect(screen.getByText('checkmateReached')).toBeInTheDocument();
    expect(screen.queryByTestId('move-input-panel')).not.toBeInTheDocument();
    expect(screen.getByTestId('chess-board')).toHaveAttribute('data-interactive', 'false');
    // The move list shows the engine-normalized SAN, including "#" — not
    // whatever the author actually typed ("Re8").
    expect(screen.getAllByText('Re8#').length).toBeGreaterThan(0);

    // Undo (remove the last/mating move) restores editability.
    fireEvent.click(screen.getByRole('button', { name: 'removeLastMove' }));

    expect(screen.queryByText('checkmateReached')).not.toBeInTheDocument();
    expect(screen.getByTestId('move-input-panel')).toBeInTheDocument();
    expect(screen.getByTestId('chess-board')).toHaveAttribute('data-interactive', 'true');
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

  it('stepping back through the line shows the earlier position and locks move entry', () => {
    sessionStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify(makeDraft({ moves: ['Nf3', 'e5'], notes: ['', ''] }))
    );
    render(<CreatePuzzleSolutionForm />);

    const tipFen = screen.getByTestId('chess-board').getAttribute('data-fen');

    fireEvent.click(screen.getByRole('button', { name: 'Previous move' }));

    const board = screen.getByTestId('chess-board');
    expect(board.getAttribute('data-fen')).not.toBe(tipFen);
    expect(board).toHaveAttribute('data-interactive', 'false');
    expect(screen.getByText('viewingHistory')).toBeInTheDocument();
    expect(screen.queryByTestId('move-input-panel')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Go to start' }));
    expect(screen.getByTestId('chess-board').getAttribute('data-fen')).toBe(VALID_FEN);

    fireEvent.click(screen.getByRole('button', { name: 'Go to end' }));
    expect(screen.getByTestId('chess-board').getAttribute('data-fen')).toBe(tipFen);
    expect(screen.getByTestId('chess-board')).toHaveAttribute('data-interactive', 'true');
    expect(screen.getByTestId('move-input-panel')).toBeInTheDocument();
  });

  it('clicking a move in the horizontal move list jumps there; removing the last move snaps back to the tip', () => {
    sessionStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify(makeDraft({ moves: ['Nf3', 'e5'], notes: ['', ''] }))
    );
    render(<CreatePuzzleSolutionForm />);

    const tipFen = screen.getByTestId('chess-board').getAttribute('data-fen');

    // The horizontal strip renders each SAN as a clickable button.
    fireEvent.click(screen.getByRole('button', { name: 'Nf3' }));
    const ply1Fen = screen.getByTestId('chess-board').getAttribute('data-fen');
    expect(ply1Fen).not.toBe(tipFen);
    expect(ply1Fen).not.toBe(VALID_FEN);
    expect(screen.getByText('viewingHistory')).toBeInTheDocument();

    // Removing the last move acts on the line's end and snaps the view back
    // to the (new) tip — which is the very ply that was being browsed.
    fireEvent.click(screen.getByRole('button', { name: 'removeLastMove' }));
    expect(screen.getByTestId('chess-board').getAttribute('data-fen')).toBe(ply1Fen);
    expect(screen.getByTestId('chess-board')).toHaveAttribute('data-interactive', 'true');
    expect(screen.queryByText('viewingHistory')).not.toBeInTheDocument();
    expect(screen.getByTestId('move-input-panel')).toBeInTheDocument();
  });
});
