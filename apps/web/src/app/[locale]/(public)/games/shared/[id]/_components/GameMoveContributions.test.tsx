import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Locale } from '@/app/[locale]/_lib/types';

import { GameMoveContributions } from './GameMoveContributions';

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => Object.assign((key: string) => key, { has: () => true }),
}));

/** Stands in for the toggle's collapse handler in the render-prop children. */
const mockClose = vi.fn();

// Hooks own the optimistic state — stub them with fixed data so this test
// isolates the layout: both lists serial, two collapsed composer CTAs.
const mockPostComment = vi.fn(async () => ({}) as { error?: string });
vi.mock('../_hooks/use-game-comment-thread', () => ({
  useGameCommentThread: () => ({
    roots: [{ id: 'r1' }],
    commentCount: 1,
    postComment: mockPostComment,
    reply: vi.fn(),
    edit: vi.fn(),
    remove: vi.fn(),
  }),
}));
vi.mock('../_hooks/use-game-chunk-links', () => ({
  useGameChunkLinks: () => ({
    forPly: [
      { id: 'l1', slug: 's', title: 'Linked Chunk', description: null, representativeFen: 'f' },
    ],
    staged: [],
    excludedChunkIds: new Set(),
    submitting: false,
    error: null,
    canRemove: () => false,
    handleSubmit: vi.fn(),
    handleRemoveSaved: vi.fn(),
    stage: vi.fn(),
    unstage: vi.fn(),
  }),
}));
vi.mock('../_lib/game-comment-tree', () => ({ groupReplies: () => [] }));

vi.mock('./GameCommentNode', () => ({ GameCommentNode: () => <div data-testid="comment-node" /> }));
vi.mock('@/app/[locale]/_components/chunk-links/ChunkLinkCard', () => ({
  ChunkLinkCard: ({ items }: { items: { id: string; title: string }[] }) => (
    <li data-testid="chunk-link-card">{items.map((i) => i.title).join(',')}</li>
  ),
}));
vi.mock('@/app/[locale]/_components/chunk-links/StagedChunkCard', () => ({
  StagedChunkCard: ({ title }: { title: string }) => <li data-testid="chunk-card">{title}</li>,
}));
vi.mock('@/app/[locale]/_components/chunk-links/ChunkPicker', () => ({
  ChunkPicker: () => <div data-testid="chunk-picker" />,
}));
// Exposes the caller's `onSubmit` as a button so the post-then-collapse
// wiring can be driven without the real textarea.
vi.mock('./GameCommentForm', () => ({
  GameCommentForm: ({ onSubmit }: { onSubmit: (body: string) => Promise<{ error?: string }> }) => (
    <button type="button" data-testid="comment-form" onClick={() => onSubmit('nice move')}>
      submit
    </button>
  ),
}));

// Render each CTA as its label + its (would-be collapsed) children, so the test
// can assert which composer each toggle wraps. The expand/collapse + auth-guard
// behaviour is JoinConversationToggle's own concern, covered there.
vi.mock('@/app/[locale]/(public)/topics/_components/JoinConversationToggle', () => ({
  JoinConversationToggle: ({
    joinLabel,
    children,
  }: {
    joinLabel: string;
    children: React.ReactNode | ((api: { close: () => void }) => React.ReactNode);
  }) => (
    <div data-testid={`cta-${joinLabel}`}>
      {typeof children === 'function' ? children({ close: mockClose }) : children}
    </div>
  ),
}));

function renderPanel() {
  render(
    <GameMoveContributions
      gameId="g1"
      currentPly={3}
      comments={[]}
      gameChunks={[]}
      availableChunks={[]}
      currentUser={{ id: 'u1', username: 'u', displayName: null, avatarUrl: null }}
      isGameOwner={false}
      locale={'en' as Locale}
      moves={[]}
      startingFen={null}
      playerColor="white"
    />
  );
}

describe('GameMoveContributions', () => {
  beforeEach(() => {
    mockClose.mockClear();
    mockPostComment.mockClear();
    mockPostComment.mockResolvedValue({});
  });

  it('shows posted comments and chunk links serially (both visible at once)', () => {
    renderPanel();
    expect(screen.getByTestId('comment-node')).toBeInTheDocument();
    expect(screen.getByTestId('chunk-link-card')).toHaveTextContent('Linked Chunk');
  });

  it('offers two separate CTAs — one wrapping the comment form, one the chunk picker', () => {
    renderPanel();
    const commentCta = screen.getByTestId('cta-comments.joinConversation');
    const chunkCta = screen.getByTestId('cta-chunks.suggest');
    expect(within(commentCta).getByTestId('comment-form')).toBeInTheDocument();
    expect(within(chunkCta).getByTestId('chunk-picker')).toBeInTheDocument();
  });

  it('collapses the comment composer once the comment posts', async () => {
    renderPanel();
    fireEvent.click(screen.getByTestId('comment-form'));
    await waitFor(() => expect(mockClose).toHaveBeenCalled());
  });

  it('keeps the composer open when the post fails, so the draft survives', async () => {
    mockPostComment.mockResolvedValue({ error: 'nope' });
    renderPanel();
    fireEvent.click(screen.getByTestId('comment-form'));
    await waitFor(() => expect(mockPostComment).toHaveBeenCalled());
    expect(mockClose).not.toHaveBeenCalled();
  });
});
