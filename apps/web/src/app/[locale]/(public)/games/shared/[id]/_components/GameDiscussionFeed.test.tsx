import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { GameChunkItem } from '@/lib/db/game-chunks';
import type { GameCommentItem } from '@/lib/db/game-comments';

import type { Locale } from '@/app/[locale]/_lib/types';

import { GameDiscussionFeed } from './GameDiscussionFeed';

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => Object.assign((key: string) => key, { has: () => true }),
}));

// Read-only display children are covered elsewhere — stub them so this test
// focuses on grouping, the move-label headers, and the jump affordance.
vi.mock('./DiscussionCommentRow', () => ({
  DiscussionCommentRow: ({ node }: { node: { id: string } }) => (
    <div data-testid="comment-row">{node.id}</div>
  ),
}));
vi.mock('./GameChunkLinkCard', () => ({
  GameChunkLinkCard: ({ items }: { items: { id: string }[] }) => (
    <li data-testid="chunk-card">{items.map((i) => i.id).join(',')}</li>
  ),
}));

function comment(id: string, ply: number | null): GameCommentItem {
  return {
    id,
    ply,
    parentId: null,
    body: id,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
    authorId: 'u1',
    author: { username: 'a', displayName: 'A', avatarUrl: null },
    likeCount: 0,
    likedByMe: false,
  };
}

function chunk(id: string, ply: number): GameChunkItem {
  return {
    id,
    ply,
    chunkId: `c-${id}`,
    slug: id,
    title: id,
    description: null,
    representativeFen: '8/8/8/8/8/8/8/8 w - - 0 1',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    suggestedById: 'u1',
    suggester: null,
  };
}

function renderFeed(onJumpToPly = vi.fn()) {
  render(
    <GameDiscussionFeed
      comments={[comment('w1', null), comment('m2', 2)]}
      gameChunks={[chunk('k2', 2)]}
      notationMoves={['e4', 'e5', 'Nf3', 'Nc6']}
      startingFen={null}
      playerColor="white"
      onJumpToPly={onJumpToPly}
      locale={'en' as Locale}
    />
  );
  return onJumpToPly;
}

describe('GameDiscussionFeed', () => {
  it('renders the whole-game group as a non-clickable heading', () => {
    renderFeed();
    const wholeGame = screen.getByText('discussion.wholeGame');
    expect(wholeGame.tagName).toBe('H3');
    expect(wholeGame.closest('button')).toBeNull();
  });

  it('labels a move group by its notation and jumps to that ply on click', () => {
    const onJumpToPly = renderFeed();
    const header = screen.getByRole('button', { name: /2\. Nf3/ });
    fireEvent.click(header);
    expect(onJumpToPly).toHaveBeenCalledWith(2);
  });

  it('shows the comments and chunk links under their move group', () => {
    renderFeed();
    // Whole-game comment + the move-2 comment both render.
    expect(screen.getAllByTestId('comment-row').map((n) => n.textContent)).toEqual(['w1', 'm2']);
    expect(screen.getByTestId('chunk-card')).toHaveTextContent('k2');
  });
});
