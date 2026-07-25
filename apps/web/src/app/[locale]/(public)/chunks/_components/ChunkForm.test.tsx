import { render, screen } from '@testing-library/react';
import { type Mock, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChunkForm } from './ChunkForm';

// Mutable search string so individual tests can simulate the
// `?resumed=1` preview round-trip marker.
const nav = vi.hoisted(() => ({ search: '' }));

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

vi.mock('@/app/_components', () => ({
  BoardFrame: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
