import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { type Mock, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChunkForm } from './ChunkForm';

// Mutable search string so individual tests can simulate the
// `?resumed=1` preview round-trip marker.
const nav = vi.hoisted(() => ({ search: '' }));
// Mutable board state so edit-mode tests can decide whether the FEN
// currently differs from the saved row.
const boardState = vi.hoisted(() => ({ trimmedFen: '' }));

// Echo translation keys so the "draft restored" banner is assertable by key.
vi.mock('next-intl', () => ({
  useTranslations: () => Object.assign((key: string) => key, { has: () => true }),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(nav.search),
}));

vi.mock('@/i18n/routing', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

vi.mock('@/_hooks/useUnsavedChanges', () => ({
  useUnsavedChanges: () => ({ isBlocking: false, confirm: vi.fn(), cancel: vi.fn() }),
}));

// `Button` forwards `type` so the submit button really submits, and the
// banner keeps its ref + role — the error-routing tests below assert on
// the real submit path and on where focus lands.
vi.mock('@/app/_components', () => ({
  BoardFrame: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Button: ({ children, type }: { children: React.ReactNode; type?: 'button' | 'submit' }) => (
    <button type={type}>{children}</button>
  ),
  FormErrorBanner: ({
    message,
    ref,
  }: {
    message: string | null;
    ref?: React.Ref<HTMLDivElement>;
  }) =>
    message ? (
      <div ref={ref} tabIndex={-1} role="alert">
        {message}
      </div>
    ) : null,
  UnsavedChangesDialog: () => null,
}));

// Stub the board editor + heavy children so the test isolates the draft-vs-
// injectedFen precedence (the banner only appears when recovery actually ran).
vi.mock('@/app/[locale]/(public)/practice/(free-play)/_hooks/use-fen-board-editor', () => ({
  useFenBoardEditor: () => ({
    setFenInput: vi.fn(),
    setBoardFen: vi.fn(),
    setSideToMove: vi.fn(),
    setActiveTab: vi.fn(),
    setFlipped: vi.fn(),
    setUserFlipped: vi.fn(),
    resetBoard: vi.fn(),
    trimmedFen: boardState.trimmedFen,
    isFenValid: true,
    activeTab: 'edit',
    sideToMove: 'w',
    flipped: false,
    userFlipped: false,
  }),
}));

// Stands in for the real fields: keeps the DOM ids `reportError` focuses,
// and echoes the field error it was handed so the routing (which control
// the message lands on) is assertable without mounting the board editor.
vi.mock('./ChunkFormFields', () => ({
  ChunkFormFields: ({
    messageFor,
    title,
    onTitleChange,
    slug,
    onSlugChange,
    description,
    onDescriptionChange,
  }: {
    messageFor: (field: string) => string | null;
    title: string;
    onTitleChange: (value: string) => void;
    slug: string;
    onSlugChange: (value: string) => void;
    description: string;
    onDescriptionChange: (value: string) => void;
  }) => (
    <div data-testid="fields">
      <input
        id="chunk-title"
        aria-label="title"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
      />
      <input
        id="chunk-slug"
        aria-label="slug"
        value={slug}
        onChange={(e) => onSlugChange(e.target.value)}
      />
      <textarea
        id="chunk-description"
        aria-label="description"
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
      />
      <div data-testid="field-error">
        {(['title', 'slug', 'description', 'fen'] as const)
          .filter((field) => messageFor(field))
          .map((field) => `${field}:${messageFor(field)}`)
          .join('')}
      </div>
    </div>
  ),
}));
vi.mock('@/app/[locale]/_components/ConfirmationModal', () => ({ ConfirmationModal: () => null }));

const readChunkDraft = vi.fn();
const writeChunkDraft = vi.fn();
vi.mock('../_lib/draft-storage', () => ({
  readChunkDraft: () => readChunkDraft(),
  clearChunkDraft: vi.fn(),
  writeChunkDraft: () => writeChunkDraft(),
}));

// The slug preflight is a Server Action (DB-backed); stubbed so the tests
// drive the verdict rather than a database. Free unless a test says taken.
const checkSlugAvailability = vi.fn();
vi.mock('../_actions/checkSlugAvailability', () => ({
  checkSlugAvailability: (slug: string) => checkSlugAvailability(slug),
}));

const STORED_DRAFT = {
  version: 1 as const,
  representativeFen: '8/8/8/8/8/8/8/8 w - - 0 1',
  title: 'Drafted chunk',
  slug: 'drafted-chunk',
  description: 'desc',
  annotations: { arrows: [], circles: [] },
  status: 'draft' as const,
  feedbackTopics: [],
  activeTab: 'edit',
  sideToMove: 'w',
  flipped: false,
  userFlipped: false,
};

describe('ChunkForm — injectedFen vs. stored draft', () => {
  beforeEach(() => {
    (readChunkDraft as Mock).mockReset();
    nav.search = '';
  });

  it('recovers a stored draft when no position is injected', () => {
    readChunkDraft.mockReturnValue(STORED_DRAFT);
    render(<ChunkForm mode="create" />);
    expect(screen.getByText('draftRestoredBanner')).toBeInTheDocument();
  });

  it('skips draft recovery when a position is injected via ?fen=', () => {
    readChunkDraft.mockReturnValue(STORED_DRAFT);
    render(<ChunkForm mode="create" injectedFen="8/8/8/8/4P3/8/8/8 w - - 0 1" />);
    expect(screen.queryByText('draftRestoredBanner')).toBeNull();
  });

  it('suppresses the restored banner on a preview round-trip (?resumed=1)', () => {
    // Returning from the preview restores the draft but the banner would
    // be redundant noise — the author just came from reviewing it.
    nav.search = 'resumed=1';
    readChunkDraft.mockReturnValue(STORED_DRAFT);
    render(<ChunkForm mode="create" />);
    expect(screen.queryByText('draftRestoredBanner')).toBeNull();
  });
});

describe('ChunkForm — submit error routing', () => {
  beforeEach(() => {
    (readChunkDraft as Mock).mockReset();
    (writeChunkDraft as Mock).mockReset();
    checkSlugAvailability.mockReset();
    checkSlugAvailability.mockResolvedValue({ available: true });
    nav.search = '';
  });

  function fill(field: string, value: string) {
    fireEvent.change(screen.getByLabelText(field), { target: { value } });
  }

  function fillValidCreateForm() {
    fill('title', 'Rook battery');
    fill('slug', 'rook-battery');
    fill('description', 'Doubled rooks on an open file.');
  }

  it('lands a field error on its own control and focuses it', () => {
    render(<ChunkForm mode="create" />);
    fill('title', 'Rook battery');
    fill('slug', 'rook-battery');

    // Create mode defaults to publishing, where a description is required.
    fireEvent.click(screen.getByText('actions.continueToPreview'));

    expect(screen.getByTestId('field-error')).toHaveTextContent(
      'description:errors.descriptionRequired'
    );
    expect(document.activeElement).toBe(screen.getByLabelText('description'));
  });

  it('falls back to the form-wide strip for errors no control owns', async () => {
    writeChunkDraft.mockReturnValue(false);
    render(<ChunkForm mode="create" />);
    fillValidCreateForm();

    fireEvent.click(screen.getByText('actions.continueToPreview'));

    const strip = await screen.findByRole('alert');
    expect(strip).toHaveTextContent('errors.draftWriteFailed');
    expect(screen.getByTestId('field-error')).toHaveTextContent('');
    expect(document.activeElement).toBe(strip);
  });

  // The collision used to be reported two steps later, by the preview's
  // Confirm, in a banner — with the input that caused it off screen.
  it('reports a taken slug on the slug control before leaving the form', async () => {
    checkSlugAvailability.mockResolvedValue({ available: false });
    render(<ChunkForm mode="create" />);
    fillValidCreateForm();

    fireEvent.click(screen.getByText('actions.continueToPreview'));

    await waitFor(() =>
      expect(screen.getByTestId('field-error')).toHaveTextContent('slug:errors.slugTaken')
    );
    expect(document.activeElement).toBe(screen.getByLabelText('slug'));
    expect(writeChunkDraft).not.toHaveBeenCalled();
  });

  it('hands off to the preview once the slug is free', async () => {
    writeChunkDraft.mockReturnValue(true);
    render(<ChunkForm mode="create" />);
    fillValidCreateForm();

    fireEvent.click(screen.getByText('actions.continueToPreview'));

    await waitFor(() => expect(writeChunkDraft).toHaveBeenCalled());
    expect(checkSlugAvailability).toHaveBeenCalledWith('rook-battery');
    expect(screen.getByTestId('field-error')).toHaveTextContent('');
  });

  // Preflight only — the create action re-checks under the DB's UNIQUE
  // constraint, so a dead round trip must not trap a valid draft here.
  it('continues to the preview when the preflight itself fails', async () => {
    checkSlugAvailability.mockRejectedValue(new Error('network'));
    writeChunkDraft.mockReturnValue(true);
    render(<ChunkForm mode="create" />);
    fillValidCreateForm();

    fireEvent.click(screen.getByText('actions.continueToPreview'));

    await waitFor(() => expect(writeChunkDraft).toHaveBeenCalled());
  });
});

describe('ChunkForm — slug preflight in edit mode', () => {
  const INITIAL = {
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    representativeFen: '8/8/8/8/8/8/8/8 w - - 0 1',
    title: 'Rook battery',
    slug: 'rook-battery',
    description: 'Doubled rooks',
    annotations: { arrows: [], circles: [] },
    feedbackTopics: [],
  };

  beforeEach(() => {
    (readChunkDraft as Mock).mockReset();
    (writeChunkDraft as Mock).mockReset();
    writeChunkDraft.mockReturnValue(true);
    checkSlugAvailability.mockReset();
    checkSlugAvailability.mockResolvedValue({ available: true });
    boardState.trimmedFen = INITIAL.representativeFen;
    nav.search = '';
  });

  // The row's own slug is trivially "taken"; asking would reject the save.
  it('skips the check when the slug is untouched', async () => {
    render(<ChunkForm mode="edit" initial={INITIAL} />);

    fireEvent.click(screen.getByText('actions.continueToPreview'));

    await waitFor(() => expect(writeChunkDraft).toHaveBeenCalled());
    expect(checkSlugAvailability).not.toHaveBeenCalled();
  });

  it('checks a renamed slug and reports a collision on the control', async () => {
    checkSlugAvailability.mockResolvedValue({ available: false });
    render(<ChunkForm mode="edit" initial={INITIAL} />);
    fireEvent.change(screen.getByLabelText('slug'), { target: { value: 'rook-doubling' } });

    fireEvent.click(screen.getByText('actions.continueToPreview'));

    await waitFor(() =>
      expect(screen.getByTestId('field-error')).toHaveTextContent('slug:errors.slugTaken')
    );
    expect(checkSlugAvailability).toHaveBeenCalledWith('rook-doubling');
    expect(writeChunkDraft).not.toHaveBeenCalled();
  });
});

// The "others already point at this" warning is NOT rendered here — it
// belongs to the preview step, where the save is confirmed. See
// `ChunkPreviewClient.test.tsx` and `_lib/identity-changes.test.ts`.
