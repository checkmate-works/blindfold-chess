import { render, screen } from '@testing-library/react';
import { type Mock, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChunkPreviewClient } from './ChunkPreviewClient';

// Echo translation keys so the warning is assertable by key (it renders
// `body` + `hint`), exactly as the form-side tests used to do.
vi.mock('next-intl', () => ({
  useTranslations: () => Object.assign((key: string) => key, { has: () => true }),
}));

vi.mock('@/i18n/routing', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

vi.mock('@/_hooks/useUnsavedChanges', () => ({
  useUnsavedChanges: () => ({ isBlocking: false, confirm: vi.fn(), cancel: vi.fn() }),
}));

vi.mock('@/app/_components', () => ({
  BoardFrame: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Button: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
  FormErrorBanner: ({ message }: { message: string | null }) =>
    message ? <div role="alert">{message}</div> : null,
  UnsavedChangesDialog: () => null,
}));

vi.mock('@/app/[locale]/_components', () => ({
  SectionTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@/lib/positions/ui/ThemedBoardThumbnail', () => ({
  ThemedBoardThumbnail: () => <div data-testid="board" />,
}));

// The confirm path is not under test here; stubbed so the module graph
// stays free of Server Actions.
vi.mock('../_actions/createChunk', () => ({ createChunk: vi.fn() }));
vi.mock('../_lib/chunk-form-actions', () => ({
  saveChunkEdit: vi.fn(),
  submitChunkPublish: vi.fn(),
}));

const readChunkDraft = vi.fn();
vi.mock('../_lib/draft-storage', () => ({
  readChunkDraft: () => readChunkDraft(),
  clearChunkDraft: vi.fn(),
}));

const SAVED = {
  title: 'Rook battery',
  slug: 'rook-battery',
  representativeFen: '8/8/8/8/8/8/8/8 w - - 0 1',
};

const EDIT_DRAFT = {
  version: 1 as const,
  representativeFen: SAVED.representativeFen,
  title: SAVED.title,
  slug: SAVED.slug,
  description: 'Doubled rooks',
  annotations: { arrows: [], circles: [] },
  status: 'draft' as const,
  feedbackTopics: [],
  edit: { chunkId: 'cccccccc-cccc-cccc-cccc-cccccccccccc', initialSlug: SAVED.slug },
  activeTab: 'edit',
  sideToMove: 'w',
  flipped: false,
  userFlipped: false,
};

function renderEdit(
  draft: Partial<typeof EDIT_DRAFT>,
  references: { positions: number; games: number }
) {
  readChunkDraft.mockReturnValue({ ...EDIT_DRAFT, ...draft });
  return render(
    <ChunkPreviewClient
      mode="edit"
      editHref="/chunks/rook-battery/edit"
      saved={SAVED}
      references={references}
    />
  );
}

describe('ChunkPreviewClient — reference warning', () => {
  beforeEach(() => {
    (readChunkDraft as Mock).mockReset();
  });

  // Noise is what gets warnings ignored: a save that only reworded the
  // description asserts nothing new about anyone's link.
  it('stays hidden when nothing identity-bearing changed', () => {
    renderEdit({ description: 'reworded' }, { positions: 3, games: 2 });
    expect(screen.queryByText('body')).toBeNull();
  });

  it('appears when the pending save renames the chunk', () => {
    renderEdit({ title: 'Rook doubling' }, { positions: 3, games: 2 });
    expect(screen.getByText('body')).toBeInTheDocument();
  });

  it('appears when the pending save changes the slug', () => {
    renderEdit({ slug: 'rook-doubling' }, { positions: 1, games: 0 });
    expect(screen.getByText('body')).toBeInTheDocument();
  });

  it('appears when the pending save changes the board', () => {
    renderEdit({ representativeFen: '8/8/8/8/4P3/8/8/8 w - - 0 1' }, { positions: 0, games: 1 });
    expect(screen.getByText('body')).toBeInTheDocument();
  });

  // Nothing points at the chunk yet, so a rename costs nobody anything.
  it('stays hidden when no live reference exists, however the title changed', () => {
    renderEdit({ title: 'Rook doubling' }, { positions: 0, games: 0 });
    expect(screen.queryByText('body')).toBeNull();
  });

  // A create has no saved row to diverge from — and no references.
  it('never renders in create mode', () => {
    readChunkDraft.mockReturnValue({ ...EDIT_DRAFT, edit: undefined, title: 'Anything' });
    render(<ChunkPreviewClient mode="create" />);
    expect(screen.queryByText('body')).toBeNull();
  });
});
