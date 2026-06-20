import { render, screen } from '@testing-library/react';
import { type Mock, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChunkForm } from './ChunkForm';

// Echo translation keys so the "draft restored" banner is assertable by key.
vi.mock('next-intl', () => ({
  useTranslations: () => Object.assign((key: string) => key, { has: () => true }),
}));

vi.mock('@/i18n/routing', () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock('@/_hooks/useUnsavedChanges', () => ({
  useUnsavedChanges: () => ({ isBlocking: false, confirm: vi.fn(), cancel: vi.fn() }),
}));

vi.mock('@/app/_components', () => ({
  Button: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
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
    trimmedFen: '',
    isFenValid: true,
    activeTab: 'edit',
    sideToMove: 'w',
    flipped: false,
    userFlipped: false,
  }),
}));

vi.mock('./ChunkFormFields', () => ({ ChunkFormFields: () => <div data-testid="fields" /> }));
vi.mock('@/app/[locale]/_components/ConfirmationModal', () => ({ ConfirmationModal: () => null }));
vi.mock('../_lib/chunk-form-actions', () => ({
  saveChunkEdit: vi.fn(),
  submitChunkDelete: vi.fn(),
  submitChunkPublish: vi.fn(),
}));

const readChunkDraft = vi.fn();
vi.mock('../_lib/draft-storage', () => ({
  readChunkDraft: () => readChunkDraft(),
  clearChunkDraft: vi.fn(),
  writeChunkDraft: vi.fn(),
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
});
