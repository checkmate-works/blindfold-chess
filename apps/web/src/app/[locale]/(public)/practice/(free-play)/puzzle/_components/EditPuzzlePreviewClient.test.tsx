import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChunkOption } from '@/lib/chunks/types';
import type { ThemeOption } from '@/lib/themes/types';

import { editDraftStorageKey } from '../_lib/edit-draft-storage';
import type { PuzzleEditDraftV1 } from '../_lib/edit-draft-storage';
import { EditPuzzlePreviewClient } from './EditPuzzlePreviewClient';

// Router spies. `replace` bounces back to /edit when no draft exists; `push`
// is used by both Back-to-edit and the successful Save branch. The object is
// stable across renders so the hydration effect (which depends on `router`)
// doesn't reshoot after every setState.
const { mockPush, mockReplace, stableRouter } = vi.hoisted(() => {
  const push = vi.fn();
  const replace = vi.fn();
  return { mockPush: push, mockReplace: replace, stableRouter: { push, replace } };
});
vi.mock('@/i18n/routing', () => ({
  useRouter: () => stableRouter,
}));

// Identity translator; stringifies params so moveCount is assertable.
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));

const { mockUpdatePuzzle } = vi.hoisted(() => ({ mockUpdatePuzzle: vi.fn() }));
vi.mock('../_actions/updatePuzzle', () => ({
  updatePuzzle: mockUpdatePuzzle,
}));

// PuzzleSolutionReplay is integration-tested via its own suite — stub it.
vi.mock('./PuzzleSolutionReplay', () => ({
  PuzzleSolutionReplay: ({
    fen,
    solutionMoves,
  }: {
    fen: string;
    solutionMoves: Array<{ san: string; note: string | null }>;
  }) => (
    <div
      data-testid="solution-replay"
      data-fen={fen}
      data-move-count={solutionMoves.length}
      data-sans={solutionMoves.map((m) => m.san).join(' ')}
    />
  ),
}));

vi.mock('next-navigation-guard', () => ({
  useNavigationGuard: () => ({ active: false, accept: () => {}, reject: () => {} }),
}));

vi.mock('@/app/_components', () => ({
  BoardFrame: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Button: ({
    children,
    onClick,
    disabled,
    type,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: 'button' | 'submit';
  }) => (
    <button type={type ?? 'button'} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  UnsavedChangesDialog: () => null,
}));

vi.mock('@/app/[locale]/_components', () => ({
  SectionTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

const POSITION_ID = '11111111-1111-1111-1111-111111111111';
const VALID_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function makeDraft(overrides: Partial<PuzzleEditDraftV1> = {}): PuzzleEditDraftV1 {
  return {
    version: 1,
    fen: VALID_FEN,
    title: 'Preview Title',
    description: 'Preview description',
    moves: ['Nf3', 'Nc6'],
    notes: ['develop', ''],
    activeTab: 'board',
    sideToMove: 'w',
    flipped: false,
    themeIds: ['theme-1'],
    chunkIds: ['chunk-1'],
    ...overrides,
  };
}

function seedDraft(overrides: Partial<PuzzleEditDraftV1> = {}) {
  sessionStorage.setItem(editDraftStorageKey(POSITION_ID), JSON.stringify(makeDraft(overrides)));
}

beforeEach(() => {
  mockPush.mockReset();
  mockReplace.mockReset();
  mockUpdatePuzzle.mockReset();
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe('EditPuzzlePreviewClient', () => {
  describe('hydration', () => {
    it('renders title, description, move-count metadata and the solution replay from a valid draft', () => {
      seedDraft({
        title: 'Knight fork',
        description: 'Win the queen',
        moves: ['Nf3', 'Nc6', 'Bc4'],
        notes: ['', '', ''],
      });

      render(
        <EditPuzzlePreviewClient
          positionId={POSITION_ID}
          availableThemes={[]}
          availableChunks={[]}
        />
      );

      expect(screen.getByText('Knight fork')).toBeInTheDocument();
      expect(screen.getByText('Win the queen')).toBeInTheDocument();
      expect(screen.getByText(/^moveCount:.*"count":3/)).toBeInTheDocument();

      const replay = screen.getByTestId('solution-replay');
      expect(replay).toHaveAttribute('data-fen', VALID_FEN);
      expect(replay).toHaveAttribute('data-move-count', '3');
      expect(replay).toHaveAttribute('data-sans', 'Nf3 Nc6 Bc4');
    });

    it('renders the resolved theme and chunk labels attached to the draft', () => {
      seedDraft({ themeIds: ['t1'], chunkIds: ['c1', 'c2'] });

      render(
        <EditPuzzlePreviewClient
          positionId={POSITION_ID}
          availableThemes={[{ id: 't1', label: 'Pin' }] as unknown as ThemeOption[]}
          availableChunks={
            [
              { id: 'c1', label: 'Boden pattern' },
              { id: 'c2', label: 'Greek gift' },
            ] as unknown as ChunkOption[]
          }
        />
      );

      expect(screen.getByText('Pin')).toBeInTheDocument();
      expect(screen.getByText('Boden pattern')).toBeInTheDocument();
      expect(screen.getByText('Greek gift')).toBeInTheDocument();
    });

    it('renders a skeleton placeholder before hydration settles', () => {
      const { container } = render(
        <EditPuzzlePreviewClient
          positionId={POSITION_ID}
          availableThemes={[]}
          availableChunks={[]}
        />
      );

      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
      expect(screen.queryByTestId('solution-replay')).not.toBeInTheDocument();
    });

    it('calls router.replace back to /edit when no edit draft exists', async () => {
      render(
        <EditPuzzlePreviewClient
          positionId={POSITION_ID}
          availableThemes={[]}
          availableChunks={[]}
        />
      );

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(`/practice/puzzle/${POSITION_ID}/edit`);
      });
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('Back to edit', () => {
    it('pushes to the solution step and does NOT clear the draft', () => {
      seedDraft();

      render(
        <EditPuzzlePreviewClient
          positionId={POSITION_ID}
          availableThemes={[]}
          availableChunks={[]}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'backToEditCta' }));

      expect(mockPush).toHaveBeenCalledWith(`/practice/puzzle/${POSITION_ID}/edit/solution`);
      expect(sessionStorage.getItem(editDraftStorageKey(POSITION_ID))).not.toBeNull();
    });
  });

  describe('Save action', () => {
    it('on success: calls updatePuzzle with the full payload, clears the draft, and pushes to the detail page with the puzzle_updated toast', async () => {
      seedDraft({ moves: ['Nf3'], notes: ['only move'] });
      mockUpdatePuzzle.mockResolvedValue({ success: true });

      render(
        <EditPuzzlePreviewClient
          positionId={POSITION_ID}
          availableThemes={[]}
          availableChunks={[]}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'submit' }));
      });

      expect(mockUpdatePuzzle).toHaveBeenCalledWith({
        id: POSITION_ID,
        fen: VALID_FEN,
        title: 'Preview Title',
        description: 'Preview description',
        solutionMoves: [{ san: 'Nf3', note: 'only move' }],
        themeIds: ['theme-1'],
        chunkIds: ['chunk-1'],
      });

      expect(sessionStorage.getItem(editDraftStorageKey(POSITION_ID))).toBeNull();
      expect(mockPush).toHaveBeenCalledWith(`/practice/puzzle/${POSITION_ID}?toast=puzzle_updated`);
    });

    it('passes description as null when the draft description is an empty string', async () => {
      seedDraft({ description: '' });
      mockUpdatePuzzle.mockResolvedValue({ success: true });

      render(
        <EditPuzzlePreviewClient
          positionId={POSITION_ID}
          availableThemes={[]}
          availableChunks={[]}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'submit' }));
      });

      expect(mockUpdatePuzzle).toHaveBeenCalledWith(expect.objectContaining({ description: null }));
    });

    it('on action-returned error: surfaces the server-provided error, keeps the draft, stays on page', async () => {
      seedDraft();
      mockUpdatePuzzle.mockResolvedValue({ error: 'rate_limit_exceeded' });

      render(
        <EditPuzzlePreviewClient
          positionId={POSITION_ID}
          availableThemes={[]}
          availableChunks={[]}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'submit' }));
      });

      expect(screen.getByText('rate_limit_exceeded')).toBeInTheDocument();
      expect(sessionStorage.getItem(editDraftStorageKey(POSITION_ID))).not.toBeNull();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('on thrown error: surfaces the generic saveError message and keeps the draft', async () => {
      seedDraft();
      mockUpdatePuzzle.mockRejectedValue(new Error('network down'));

      render(
        <EditPuzzlePreviewClient
          positionId={POSITION_ID}
          availableThemes={[]}
          availableChunks={[]}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'submit' }));
      });

      expect(screen.getByText('saveError')).toBeInTheDocument();
      expect(sessionStorage.getItem(editDraftStorageKey(POSITION_ID))).not.toBeNull();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
