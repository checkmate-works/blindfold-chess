import { redirect } from 'next/navigation';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { lastQueuedRows } from '@/lib/db/__test-support__/query-chain';
import { isUserBanned as mockIsUserBanned } from '@/lib/moderation/__mocks__/ban';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { getUserMock as mockGetUser } from '@/lib/supabase/__mocks__/server';

import { createChunkReplyWithFenAttachment } from './createChunkReplyWithFenAttachment';

/**
 * Integration test for the chunks list-page reply FEN-attachment surface.
 * Mirrors `createChunkPostWithFenAttachment.test.ts` for the reply
 * flavour — the underlying base differs only in calling
 * `createReplyBase` (vs `createPostBase`) so the validation +
 * SQLSTATE-mapping contract should match exactly.
 */

const mockSelectFromWhere = vi.fn();
const mockSelectProfile = vi.fn();
const mockInsertReturning = vi.fn();
const mockInsertValues = vi.fn();
const mockFenInsertValues = vi.fn();
const mockGetChunkBySlug = vi.fn();

vi.mock('@/lib/moderation/block');

vi.mock('@/lib/users/activity-log');

vi.mock('@/lib/notifications/notification', () => ({
  createNotification: vi.fn(),
}));

vi.mock('@/lib/supabase/server');

const mockTx = {
  insert: (table: { __name?: string }) => {
    if (table.__name === 'post_fen_attachments') {
      return {
        values: (...args: unknown[]) => {
          mockFenInsertValues(...args);
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
          return lastQueuedRows(mockSelectFromWhere);
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
  postFenAttachments: { __name: 'post_fen_attachments' },
  profiles: { __name: 'profiles', id: 'id' },
  userFollows: { id: 'id', followerId: 'follower_id', followingId: 'following_id' },
}));

vi.mock('@/lib/moderation/ban');

vi.mock('@/lib/security/rate-limit');

vi.mock('next/navigation');

vi.mock('@/lib/chunks/queries', () => ({
  getChunkBySlug: (slug: string) => mockGetChunkBySlug(slug),
}));

const testUserId = 'user-00000000-0000-0000-0000-000000000001';
const validPostId = '00000000-0000-0000-0000-000000000001';
const generatedReplyId = 'reply-00000000-0000-0000-0000-000000000001';
const otherUserId = 'user-00000000-0000-0000-0000-000000000002';
const testSlug = 'rook-battery';

const VALID_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function makeFormData(opts: { fen?: string | null; caption?: string | null }): FormData {
  const fd = new FormData();
  fd.set('content', 'a thoughtful reply with a FEN');
  if (opts.fen !== undefined && opts.fen !== null) fd.set('attachmentFen', opts.fen);
  if (opts.caption !== undefined && opts.caption !== null) {
    fd.set('attachmentFenCaption', opts.caption);
  }
  return fd;
}

function setupHappyAuth() {
  mockGetUser.mockResolvedValue({ data: { user: { id: testUserId } } });
  mockIsUserBanned.mockResolvedValue(false);
  vi.mocked(checkRateLimit).mockResolvedValue({ success: true });
}

function setupParentPost() {
  mockSelectFromWhere.mockReturnValue([
    { id: validPostId, userId: otherUserId, replyPermission: 'everyone' },
  ]);
  mockInsertReturning.mockResolvedValue([{ id: generatedReplyId }]);
}

describe('createChunkReplyWithFenAttachment', () => {
  beforeEach(() => {
    mockGetChunkBySlug.mockResolvedValue({ id: 'chunk-1', slug: testSlug });
    mockSelectProfile.mockResolvedValue([{ id: testUserId }]);
  });

  it('happy path inserts the FEN row keyed on the new reply id and redirects to the list page anchor', async () => {
    setupHappyAuth();
    setupParentPost();

    await expect(
      createChunkReplyWithFenAttachment(
        'en',
        testSlug,
        validPostId,
        {},
        makeFormData({ fen: VALID_FEN, caption: 'starting position' })
      )
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mockFenInsertValues).toHaveBeenCalledTimes(1);
    expect(mockFenInsertValues.mock.calls[0][0]).toMatchObject({
      postId: generatedReplyId,
      fen: VALID_FEN,
      caption: 'starting position',
    });
    expect(vi.mocked(redirect)).toHaveBeenCalledWith(
      `/en/chunks/${testSlug}?toast=post_created#post-${generatedReplyId}`
    );
  });

  it('trims whitespace before validating (Lessons §10)', async () => {
    setupHappyAuth();
    setupParentPost();

    const padded = `   ${VALID_FEN}\n\t  `;
    await expect(
      createChunkReplyWithFenAttachment(
        'en',
        testSlug,
        validPostId,
        {},
        makeFormData({ fen: padded })
      )
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mockFenInsertValues.mock.calls[0][0].fen).toBe(VALID_FEN);
  });

  it('rejects empty FEN with fenRequired before any DB write', async () => {
    setupHappyAuth();

    const result = await createChunkReplyWithFenAttachment(
      'en',
      testSlug,
      validPostId,
      {},
      makeFormData({ fen: '   ' })
    );

    expect(result).toEqual({ error: 'postFenAttachment.error.fenRequired' });
    expect(mockInsertValues).not.toHaveBeenCalled();
    expect(mockFenInsertValues).not.toHaveBeenCalled();
  });

  it('returns profileRequired when the signed-in user has no profiles row', async () => {
    setupHappyAuth();
    setupParentPost();
    mockSelectProfile.mockResolvedValue([]);

    const result = await createChunkReplyWithFenAttachment(
      'en',
      testSlug,
      validPostId,
      {},
      makeFormData({ fen: VALID_FEN })
    );

    expect(result).toEqual({ error: 'profileRequired' });
    expect(mockInsertValues).not.toHaveBeenCalled();
    expect(mockFenInsertValues).not.toHaveBeenCalled();
  });

  it('rejects structurally invalid FEN with invalidFenStructure', async () => {
    setupHappyAuth();

    const result = await createChunkReplyWithFenAttachment(
      'en',
      testSlug,
      validPostId,
      {},
      makeFormData({ fen: 'not a fen' })
    );

    expect(result).toEqual({ error: 'postFenAttachment.error.invalidFenStructure' });
  });

  it('maps PG 23505 (unique_violation) to alreadyAttached', async () => {
    setupHappyAuth();
    setupParentPost();

    const err = Object.assign(new Error('duplicate'), { code: '23505' });
    mockInsertReturning.mockImplementationOnce(() => {
      throw err;
    });

    const result = await createChunkReplyWithFenAttachment(
      'en',
      testSlug,
      validPostId,
      {},
      makeFormData({ fen: VALID_FEN })
    );

    expect(result).toEqual({ error: 'postFenAttachment.error.alreadyAttached' });
  });

  it('walks err.cause for PG SQLSTATE codes (canonical extractPgErrorCode contract)', async () => {
    setupHappyAuth();
    setupParentPost();

    const inner = Object.assign(new Error('duplicate'), { code: '23505' });
    const wrapped = new Error('Drizzle wrapper');
    (wrapped as Error & { cause?: unknown }).cause = inner;
    mockInsertReturning.mockImplementationOnce(() => {
      throw wrapped;
    });

    const result = await createChunkReplyWithFenAttachment(
      'en',
      testSlug,
      validPostId,
      {},
      makeFormData({ fen: VALID_FEN })
    );

    expect(result).toEqual({ error: 'postFenAttachment.error.alreadyAttached' });
  });
});
