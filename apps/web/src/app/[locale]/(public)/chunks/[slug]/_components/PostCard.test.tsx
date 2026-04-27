import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PostWithReplyMeta } from '@/app/[locale]/(public)/topics/_lib/shared';

import { PostCard } from './PostCard';

afterEach(() => {
  cleanup();
});

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => (key: string) => key,
}));

const baseTopicPostCardSpy = vi.fn();
vi.mock('@/app/[locale]/(public)/topics/_components', () => ({
  BaseTopicPostCard: (props: Record<string, unknown>) => {
    baseTopicPostCardSpy(props);
    return <div data-testid="base-topic-post-card" />;
  },
  AttachedGameCard: ({ attachment }: { attachment: { id: string } }) => (
    <div data-testid="attached-game-card" data-attachment-id={attachment.id} />
  ),
}));

vi.mock('../_actions/toggleChunkLike', () => ({
  toggleChunkLike: vi.fn(),
}));

function makePost(overrides: Partial<PostWithReplyMeta> = {}): PostWithReplyMeta {
  return {
    id: 'post-1',
    userId: 'user-1',
    topicType: 'chunk',
    topicKey: 'rook-battery',
    parentId: null,
    rootPostId: null,
    replyPermission: 'everyone',
    content: 'a chunk comment',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
    author: {
      username: 'tester',
      displayName: 'Tester',
      avatarUrl: null,
      flair: null,
      country: null,
    },
    replyMeta: {
      replyCount: 0,
      latestReplyAt: null,
      repliers: [],
      uniqueReplierCount: 0,
    },
    likeMeta: {
      likeCount: 0,
      likedByMe: false,
    },
    ...overrides,
  } as PostWithReplyMeta;
}

describe('chunks PostCard', () => {
  it('links to the post detail page (not the listing anchor) so users can open replies', () => {
    baseTopicPostCardSpy.mockClear();
    render(<PostCard post={makePost()} locale="en" slug="rook-battery" attachment={null} />);

    expect(baseTopicPostCardSpy).toHaveBeenCalledTimes(1);
    expect(baseTopicPostCardSpy.mock.calls[0][0]).toMatchObject({
      postHref: `/chunks/rook-battery/posts/post-1`,
      topicKey: 'rook-battery',
    });
  });

  it('passes extraContent ONLY when an attachment is supplied (M1 a11y / hoist-out-of-link contract)', () => {
    // Per BaseTopicPostCard's design (see src/app/[locale]/(public)/topics/
    // _components/BaseTopicPostCard.tsx), `extraContent` is rendered as a
    // sibling of the click-to-detail <a>, not inside it. The chunks
    // PostCard MUST pass the AttachedGameCard via that extraContent slot
    // so the attachment's per-move buttons never end up nested in an
    // anchor (invalid HTML, screen-reader hostile).
    baseTopicPostCardSpy.mockClear();

    render(<PostCard post={makePost()} locale="en" slug="rook-battery" attachment={null} />);
    expect(baseTopicPostCardSpy.mock.calls[0][0].extraContent).toBeUndefined();

    baseTopicPostCardSpy.mockClear();
    render(
      <PostCard
        post={makePost()}
        locale="en"
        slug="rook-battery"
        attachment={{
          id: 'att-1',
          source: 'pgn',
          sourceUrl: null,
          sourceGameId: null,
          pgn: '1. e4 e5',
          moveCount: 2,
          headerWhite: 'Alice',
          headerBlack: 'Bob',
          headerResult: '*',
          headerEvent: null,
          headerSite: null,
          headerDate: null,
          anonymized: false,
          finalFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        }}
      />
    );
    expect(baseTopicPostCardSpy.mock.calls[0][0].extraContent).toBeDefined();
  });
});
