import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Locale } from '@/app/[locale]/_lib/types';

import { GameMoveContributions } from './GameMoveContributions';

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => Object.assign((key: string) => key, { has: () => true }),
}));

// Hooks own the optimistic state — stub them with fixed data so this test
// isolates the layout: both lists serial, two collapsed composer CTAs.
vi.mock('../_hooks/use-game-comment-thread', () => ({
  useGameCommentThread: () => ({
    roots: [{ id: 'r1' }],
    commentCount: 1,
    postComment: vi.fn(),
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
vi.mock('./GameChunkLinkCard', () => ({
  GameChunkLinkCard: ({ item }: { item: { title: string } }) => (
    <li data-testid="chunk-link-card">{item.title}</li>
  ),
}));
vi.mock('./GameChunkCard', () => ({
  GameChunkCard: ({ title }: { title: string }) => <li data-testid="chunk-card">{title}</li>,
}));
vi.mock('./GameChunkPicker', () => ({
  GameChunkPicker: () => <div data-testid="chunk-picker" />,
}));
vi.mock('./GameCommentForm', () => ({ GameCommentForm: () => <div data-testid="comment-form" /> }));

// Render each CTA as its label + its (would-be collapsed) children, so the test
// can assert which composer each toggle wraps. The expand/collapse + auth-guard
// behaviour is JoinConversationToggle's own concern, covered there.
vi.mock('@/app/[locale]/(public)/topics/_components/JoinConversationToggle', () => ({
  JoinConversationToggle: ({
    joinLabel,
    children,
  }: {
    joinLabel: string;
    children: React.ReactNode;
  }) => <div data-testid={`cta-${joinLabel}`}>{children}</div>,
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
    />
  );
}

describe('GameMoveContributions', () => {
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
});
