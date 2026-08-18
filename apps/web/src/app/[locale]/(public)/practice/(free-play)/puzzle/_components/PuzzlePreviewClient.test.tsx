import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChunkOption } from '@/lib/chunks/types';
import type { ThemeOption } from '@/lib/themes/types';

import { DRAFT_STORAGE_KEY } from '../_lib/draft-storage';
import type { PuzzleDraftV1 } from '../_lib/draft-storage';
import { PuzzlePreviewClient } from './PuzzlePreviewClient';

// Router spies. `replace` is used when no draft exists; `push` is used by
// both Back-to-edit and the successful Create branch. The returned object is
// reused across renders — `PuzzlePreviewClient`'s hydration `useEffect`
// depends on `router`, so a fresh-object-per-render would reshoot the effect
// after every setState and loop forever.
const { mockPush, mockReplace, stableRouter } = vi.hoisted(() => {
  const push = vi.fn();
  const replace = vi.fn();
  return {
    mockPush: push,
    mockReplace: replace,
    stableRouter: { push, replace },
  };
});
vi.mock('@/i18n/routing', () => ({
  useRouter: () => stableRouter,
}));

// Identity translator — same pattern as PuzzleSessionClient.test.tsx.
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
  useLocale: () => 'en',
}));

// createPuzzle server action — default is success; individual tests override.
// Use `vi.hoisted` so the spy exists in scope when the mock factory runs
// (vi.mock is hoisted above top-level `const`).
const { mockCreatePuzzle } = vi.hoisted(() => ({ mockCreatePuzzle: vi.fn() }));
vi.mock('../_actions/createPuzzle', () => ({
  createPuzzle: mockCreatePuzzle,
}));

// PuzzleSolutionReplay is integration-tested via its own suite — stub to keep
// this file focused on the preview/hand-off contract.
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

// next-navigation-guard is inert here — PuzzlePreviewClient's dirty-state
// logic is exercised via the `submitted` flag, which we verify by asserting
// push() is called (no dialog interception).
vi.mock('next-navigation-guard', () => ({
  useNavigationGuard: () => ({ active: false, accept: () => {}, reject: () => {} }),
}));

// Stub the barrel's two consumed exports directly. Importing the real barrel
// pulls in server-only via downstream ChessBoard / modal chain, which fails
// in the jsdom test environment.
vi.mock('@/app/_components', () => ({
  FormErrorBanner: ({ message }: { message: string | null }) =>
    message ? <div role="alert">{message}</div> : null,
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

// SectionTitle comes from a per-locale barrel that may also touch server-only
// via sibling exports. Stub the single symbol we consume.
vi.mock('@/app/[locale]/_components', () => ({
  SectionTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

const VALID_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function makeDraft(overrides: Partial<PuzzleDraftV1> = {}): PuzzleDraftV1 {
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
    userFlipped: false,
    ...overrides,
  };
}

function seedDraft(overrides: Partial<PuzzleDraftV1> = {}) {
  sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(makeDraft(overrides)));
}

beforeEach(() => {
  mockPush.mockReset();
  mockReplace.mockReset();
  mockCreatePuzzle.mockReset();
  sessionStorage.clear();
});

describe('PuzzlePreviewClient', () => {
  describe('hydration', () => {
    it('renders title, description, move-count metadata and the solution replay from a valid draft', () => {
      seedDraft({
        title: 'Knight fork',
        description: 'Win the queen',
        moves: ['Nf3', 'Nc6', 'Bc4'],
        notes: ['', '', ''],
      });

      render(<PuzzlePreviewClient availableThemes={[]} availableChunks={[]} />);

      expect(screen.getByText('Knight fork')).toBeInTheDocument();
      expect(screen.getByText('Win the queen')).toBeInTheDocument();
      // moveCount key is rendered through the translator stub, which stringifies params.
      expect(screen.getByText(/^moveCount:.*"count":3/)).toBeInTheDocument();

      const replay = screen.getByTestId('solution-replay');
      expect(replay).toHaveAttribute('data-fen', VALID_FEN);
      expect(replay).toHaveAttribute('data-move-count', '3');
      expect(replay).toHaveAttribute('data-sans', 'Nf3 Nc6 Bc4');
    });

    it('renders the resolved theme and chunk labels attached to the draft', () => {
      seedDraft({ themeIds: ['t1'], chunkIds: ['c1', 'c2'] });

      render(
        <PuzzlePreviewClient
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

    it('end-to-end: a board-less theme in the draft renders the "No Image" fallback', () => {
      // Regression guard for the full client → PreviewTags → RelatedTagCard
      // chain: a theme whose resolved option has `previewFen: null` must show
      // the No Image placeholder rather than a blank thumbnail.
      seedDraft({ themeIds: ['t1'], chunkIds: [] });

      render(
        <PuzzlePreviewClient
          availableThemes={
            [{ id: 't1', label: 'Decoy', previewFen: null }] as unknown as ThemeOption[]
          }
          availableChunks={[]}
        />
      );

      expect(screen.getByText('Decoy')).toBeInTheDocument();
      expect(screen.getByText('No Image')).toBeInTheDocument();
    });

    it('renders a skeleton placeholder before hydration settles', () => {
      // No draft seeded — the effect will call `router.replace` on next tick,
      // but synchronously the first render returns the skeleton branch
      // because `hydrated` starts false. We assert on the initial DOM.
      const { container } = render(
        <PuzzlePreviewClient availableThemes={[]} availableChunks={[]} />
      );

      // Skeleton is a div with animate-pulse + bg-muted/30; no title / buttons.
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
      expect(screen.queryByTestId('solution-replay')).not.toBeInTheDocument();
    });

    it('calls router.replace("/practice/puzzle/new") when no draft exists', async () => {
      render(<PuzzlePreviewClient availableThemes={[]} availableChunks={[]} />);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/practice/puzzle/new');
      });
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('Back to edit', () => {
    it('calls router.push("/practice/puzzle/new/solution") and does NOT clear the draft', () => {
      seedDraft();

      render(<PuzzlePreviewClient availableThemes={[]} availableChunks={[]} />);

      fireEvent.click(screen.getByRole('button', { name: 'backToEditCta' }));

      expect(mockPush).toHaveBeenCalledWith('/practice/puzzle/new/solution');
      // Draft remains intact so the solution step can rehydrate it.
      expect(sessionStorage.getItem(DRAFT_STORAGE_KEY)).not.toBeNull();
    });
  });

  describe('Create action', () => {
    it('on success: clears the draft and pushes to the new puzzle result page with the position_created toast', async () => {
      seedDraft({ moves: ['Nf3'], notes: ['only move'] });
      mockCreatePuzzle.mockResolvedValue({ success: true, id: 'abc-123' });

      render(<PuzzlePreviewClient availableThemes={[]} availableChunks={[]} />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'createCta' }));
      });

      // Payload shape matches what createPuzzle expects; notes stripped via
      // draftToSolutionMoves (blank → null).
      expect(mockCreatePuzzle).toHaveBeenCalledWith({
        fen: VALID_FEN,
        title: 'Preview Title',
        description: 'Preview description',
        solutionMoves: [{ san: 'Nf3', note: 'only move' }],
        themeIds: undefined,
        chunkIds: undefined,
        forkedFromId: null,
      });

      expect(sessionStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
      expect(mockPush).toHaveBeenCalledWith('/practice/puzzle/abc-123?toast=position_created');
    });

    it('passes description as null when the draft description is an empty string', async () => {
      seedDraft({ description: '' });
      mockCreatePuzzle.mockResolvedValue({ success: true, id: 'puzzle-1' });

      render(<PuzzlePreviewClient availableThemes={[]} availableChunks={[]} />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'createCta' }));
      });

      expect(mockCreatePuzzle).toHaveBeenCalledWith(expect.objectContaining({ description: null }));
    });

    it('on action-returned error: surfaces the server-provided error, keeps the draft, stays on page', async () => {
      seedDraft();
      mockCreatePuzzle.mockResolvedValue({ error: 'rate_limit_exceeded' });

      render(<PuzzlePreviewClient availableThemes={[]} availableChunks={[]} />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'createCta' }));
      });

      expect(screen.getByText('rate_limit_exceeded')).toBeInTheDocument();
      // Draft intact — the user should be able to retry.
      expect(sessionStorage.getItem(DRAFT_STORAGE_KEY)).not.toBeNull();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('on thrown error: surfaces the generic createError message and keeps the draft', async () => {
      seedDraft();
      mockCreatePuzzle.mockRejectedValue(new Error('network down'));

      render(<PuzzlePreviewClient availableThemes={[]} availableChunks={[]} />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'createCta' }));
      });

      expect(screen.getByText('createError')).toBeInTheDocument();
      expect(sessionStorage.getItem(DRAFT_STORAGE_KEY)).not.toBeNull();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
