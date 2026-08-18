import { revalidatePath } from 'next/cache';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getUserMock as mockGetUser } from '@/lib/supabase/__mocks__/server';

import { createChunkReplyWithAttachment } from './createChunkReplyWithAttachment';

/**
 * Integration test for the chunks list-page reply attachment surface.
 * The reply attachment base mirrors the post attachment base byte-for-
 * byte (only the inner `createReplyBase` call differs from
 * `createPostBase`), so this suite exercises the canonical path:
 *
 *   1. Empty `attachment` field → fast-path to plain reply (no
 *      attachment row, no per-attachment rate-limit consumption).
 *   2. PGN body field → validates via chess-core, inserts the row in
 *      the same transaction as the reply, redirects with `#post-{id}`.
 *   3. Lichess URL field → exercises the auto-fetch + canonical URL
 *      persistence (mocked at the resolver boundary).
 *   4. Error mapping for the structural / semantic failures the base
 *      surfaces.
 */

const mockSelectFromWhere = vi.fn();
const mockSelectProfile = vi.fn();
const mockInsertReturning = vi.fn();
const mockInsertValues = vi.fn();
const mockTxAttachmentValues = vi.fn();
const mockIsUserBanned = vi.fn();
const mockCheckRateLimit = vi.fn();
const mockGetChunkBySlug = vi.fn();
const mockResolveLichess = vi.fn();

vi.mock('@/lib/moderation/block', () => ({
  isBlockedBetween: () => Promise.resolve(false),
  hasBlocked: () => Promise.resolve(false),
}));

vi.mock('@/lib/users/activity-log');

vi.mock('@/lib/notifications/notification', () => ({
  createNotification: vi.fn(),
}));

vi.mock('@/lib/supabase/server');

const mockTx = {
  insert: (table: { __name?: string }) => {
    if (table.__name === 'post_game_pgn_attachments') {
      return {
        values: (...args: unknown[]) => {
          mockTxAttachmentValues(...args);
          return Promise.resolve();
        },
      };
    }
    return {
      values: (...args: unknown[]) => {
        mockInsertValues(...args);
        return { returning: () => mockInsertReturning() };
      },
    };
  },
};

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: (table: { __name?: string }) => ({
        where: (...args: unknown[]) => {
          if (table.__name === 'profiles') {
            return { limit: () => mockSelectProfile() };
          }
          mockSelectFromWhere(...args);
          return (
            mockSelectFromWhere.mock.results[mockSelectFromWhere.mock.calls.length - 1]?.value ?? []
          );
        },
      }),
    }),
    transaction: async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx),
  },
  topicPosts: {
    __name: 'topic_posts',
    id: 'id',
    userId: 'user_id',
    topicType: 'topic_type',
    topicKey: 'topic_key',
    parentId: 'parent_id',
    rootPostId: 'root_post_id',
    content: 'content',
    deletedAt: 'deleted_at',
    replyPermission: 'reply_permission',
  },
  postGamePgnAttachments: { __name: 'post_game_pgn_attachments' },
  profiles: { __name: 'profiles', id: 'id' },
  userFollows: {
    id: 'id',
    followerId: 'follower_id',
    followingId: 'following_id',
  },
}));

vi.mock('@/lib/moderation/ban', () => ({
  isUserBanned: (...args: unknown[]) => mockIsUserBanned(...args),
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  RATE_LIMITS: {
    createReply: { action: 'create_reply', maxAttempts: 20, windowMs: 3_600_000 },
    createPostWithAttachment: {
      action: 'create_post_with_attachment',
      maxAttempts: 5,
      windowMs: 3_600_000,
    },
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const mockRedirect = vi.fn();
vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error('NEXT_REDIRECT');
  },
}));

vi.mock('@/lib/chunks/queries', () => ({
  getChunkBySlug: (slug: string) => mockGetChunkBySlug(slug),
}));

vi.mock('@/lib/games/resolve-lichess-attachment', () => ({
  resolveLichessAttachmentPgn: (...args: unknown[]) => mockResolveLichess(...args),
}));

const testUserId = 'user-00000000-0000-0000-0000-000000000001';
const validPostId = '00000000-0000-0000-0000-000000000001';
const generatedReplyId = 'reply-00000000-0000-0000-0000-000000000001';
const otherUserId = 'user-00000000-0000-0000-0000-000000000002';
const testSlug = 'rook-battery';

const VALID_PGN = '1. e4 e5 2. Nf3 Nc6 *';

function makeFormData(opts: {
  content?: string;
  attachment?: string;
  attachmentAnonymize?: boolean;
}): FormData {
  const fd = new FormData();
  fd.set('content', opts.content ?? 'a thoughtful reply');
  if (opts.attachment !== undefined) fd.set('attachment', opts.attachment);
  if (opts.attachmentAnonymize) fd.set('attachmentAnonymize', 'on');
  return fd;
}

function setupHappyAuth() {
  mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
  mockIsUserBanned.mockResolvedValue(false);
  mockCheckRateLimit.mockResolvedValue({ success: true });
}

function setupParentPost(overrides: { userId?: string; replyPermission?: string } = {}) {
  mockSelectFromWhere.mockReturnValue([
    {
      id: validPostId,
      userId: overrides.userId ?? otherUserId,
      replyPermission: overrides.replyPermission ?? 'everyone',
    },
  ]);
  mockInsertReturning.mockResolvedValue([{ id: generatedReplyId }]);
}

describe('createChunkReplyWithAttachment', () => {
  beforeEach(() => {
    mockGetChunkBySlug.mockResolvedValue({ id: 'chunk-1', slug: testSlug });
    mockSelectProfile.mockResolvedValue([{ id: testUserId }]);
  });

  it('fast-paths to plain reply when no attachment is provided (no per-attachment rate-limit charge)', async () => {
    setupHappyAuth();
    setupParentPost();

    await expect(
      createChunkReplyWithAttachment('en', testSlug, validPostId, {}, makeFormData({}))
    ).rejects.toThrow('NEXT_REDIRECT');

    // Reply was inserted (single rate-limit charge against `createReply`).
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        topicType: 'chunk',
        topicKey: testSlug,
        parentId: validPostId,
        rootPostId: validPostId,
      })
    );
    // No attachment row, no per-attachment rate-limit hit.
    expect(mockTxAttachmentValues).not.toHaveBeenCalled();
    expect(mockCheckRateLimit).toHaveBeenCalledTimes(1);
    // The redirect carries the new reply id as the URL anchor (chunks
    // list-page contract — the reply lands as a comment under the chunk).
    expect(mockRedirect).toHaveBeenCalledWith(
      `/en/chunks/${testSlug}?toast=post_created#post-${generatedReplyId}`
    );
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('inserts the PGN attachment row in the same transaction as the reply', async () => {
    setupHappyAuth();
    setupParentPost();

    await expect(
      createChunkReplyWithAttachment(
        'en',
        testSlug,
        validPostId,
        {},
        makeFormData({ attachment: VALID_PGN })
      )
    ).rejects.toThrow('NEXT_REDIRECT');

    // Reply INSERT happened…
    expect(mockInsertValues).toHaveBeenCalledTimes(1);
    // …followed by the PGN attachment INSERT inside the same tx, keyed
    // on the new reply id (postId column on the attachment row).
    expect(mockTxAttachmentValues).toHaveBeenCalledTimes(1);
    expect(mockTxAttachmentValues.mock.calls[0][0]).toMatchObject({
      postId: generatedReplyId,
      source: 'pgn',
    });
    // Per-attachment rate-limit fires alongside the create-reply check.
    expect(mockCheckRateLimit).toHaveBeenCalledTimes(2);
  });

  it('routes Lichess URLs through the attachment resolver and persists the canonical URL', async () => {
    setupHappyAuth();
    setupParentPost();
    mockResolveLichess.mockResolvedValue({
      ok: true,
      pgn: VALID_PGN,
      canonicalUrl: 'https://lichess.org/abcd1234',
    });

    await expect(
      createChunkReplyWithAttachment(
        'en',
        testSlug,
        validPostId,
        {},
        makeFormData({ attachment: 'https://lichess.org/abcd1234' })
      )
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mockResolveLichess).toHaveBeenCalledWith('abcd1234');
    expect(mockTxAttachmentValues.mock.calls[0][0]).toMatchObject({
      postId: generatedReplyId,
      source: 'lichess',
      sourceUrl: 'https://lichess.org/abcd1234',
      sourceGameId: 'abcd1234',
    });
  });

  it('surfaces the resolver error when Lichess fetch fails', async () => {
    setupHappyAuth();
    setupParentPost();
    mockResolveLichess.mockResolvedValue({ ok: false, error: 'fetch_failed' });

    const result = await createChunkReplyWithAttachment(
      'en',
      testSlug,
      validPostId,
      {},
      makeFormData({ attachment: 'https://lichess.org/abcd1234' })
    );

    expect(result).toEqual({ error: 'attachment.error.lichessFetchFailed' });
    expect(mockTxAttachmentValues).not.toHaveBeenCalled();
  });

  it('returns the attachment-rate-limit error when the per-attachment limit is exhausted', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
    mockIsUserBanned.mockResolvedValue(false);
    mockCheckRateLimit.mockResolvedValue({ error: 'rateLimited' });

    const result = await createChunkReplyWithAttachment(
      'en',
      testSlug,
      validPostId,
      {},
      makeFormData({ attachment: VALID_PGN })
    );

    expect(result).toEqual({ error: 'attachment.error.rateLimitedPostWithAttachment' });
    expect(mockTxAttachmentValues).not.toHaveBeenCalled();
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it('returns profileRequired when the signed-in user has no profiles row', async () => {
    setupHappyAuth();
    setupParentPost();
    mockSelectProfile.mockResolvedValue([]);

    const result = await createChunkReplyWithAttachment(
      'en',
      testSlug,
      validPostId,
      {},
      makeFormData({ attachment: VALID_PGN })
    );

    expect(result).toEqual({ error: 'profileRequired' });
    expect(mockInsertValues).not.toHaveBeenCalled();
    expect(mockTxAttachmentValues).not.toHaveBeenCalled();
  });
});
